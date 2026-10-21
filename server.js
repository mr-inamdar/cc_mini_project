/**
 * Apex Studio Store - Production & Local Web Server
 * Zero-dependency Node.js HTTP server:
 * - Serves frontend static assets (HTML, CSS, JS, JSON, Images)
 * - Built-in REST API mock layer (Auth, Orders, Products, Health check)
 * - Production-ready for AWS EC2, AWS App Runner, Elastic Beanstalk & PM2
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 5500;
const PUBLIC_DIR = __dirname;

// In-memory data store for backend mode demo
const usersStore = [
  {
    id: 1,
    username: 'demo',
    email: 'alex@techstore.com',
    fullName: 'Alex Hunter',
    phone: '+91 9876543210',
    password: 'pass123'
  }
];

const ordersStore = [];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.sql': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJson(res, statusCode, data) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) { // 1MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // API ROUTING
  if (pathname.startsWith('/api/')) {
    setCorsHeaders(res);

    // Health check endpoint (AWS ALB / ELB / Route53)
    if (pathname === '/api/health' && method === 'GET') {
      return sendJson(res, 200, {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'production'
      });
    }

    // Get catalog products
    if (pathname === '/api/products' && method === 'GET') {
      try {
        const proPath = path.join(PUBLIC_DIR, 'pro.json');
        const data = fs.readFileSync(proPath, 'utf8');
        return sendJson(res, 200, JSON.parse(data));
      } catch (err) {
        return sendJson(res, 500, { error: 'Failed to read products catalog', details: err.message });
      }
    }

    // User Registration
    if (pathname === '/api/auth/register' && method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const { username, email, password, full_name, fullName, phone } = body;
        if (!username || !email || !password) {
          return sendJson(res, 400, { success: false, error: 'Missing required fields (username, email, password)' });
        }
        if (usersStore.some(u => u.username === username)) {
          return sendJson(res, 409, { success: false, error: 'Username already taken' });
        }
        const newUser = {
          id: usersStore.length + 1,
          username,
          email,
          fullName: fullName || full_name || username,
          phone: phone || '',
          password
        };
        usersStore.push(newUser);
        return sendJson(res, 201, {
          success: true,
          message: 'User account created successfully in database!',
          userId: newUser.id,
          user: { id: newUser.id, username: newUser.username, email: newUser.email, fullName: newUser.fullName, phone: newUser.phone }
        });
      } catch (err) {
        return sendJson(res, 400, { success: false, error: err.message });
      }
    }

    // User Login
    if (pathname === '/api/auth/login' && method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const { username, password } = body;
        const user = usersStore.find(u => u.username === username && u.password === password);
        if (!user) {
          return sendJson(res, 401, { success: false, error: 'Invalid username or password' });
        }
        return sendJson(res, 200, {
          success: true,
          user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName, phone: user.phone },
          token: `jwt-token-${user.id}-${Date.now()}`
        });
      } catch (err) {
        return sendJson(res, 400, { success: false, error: err.message });
      }
    }

    // Delete Account
    if (pathname.startsWith('/api/users/') && method === 'DELETE') {
      const username = pathname.replace('/api/users/', '').trim();
      const index = usersStore.findIndex(u => u.username === username);
      if (index !== -1) {
        usersStore.splice(index, 1);
      }
      return sendJson(res, 200, {
        success: true,
        message: `Account '${username}' has been permanently deleted from database ledger.`
      });
    }

    // Create Order
    if (pathname === '/api/orders' && method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
        const newOrder = {
          orderNumber,
          date: new Date().toISOString(),
          ...body
        };
        ordersStore.push(newOrder);
        return sendJson(res, 201, {
          success: true,
          orderNumber,
          message: 'Order recorded successfully in SQL ledger!',
          order: newOrder
        });
      } catch (err) {
        return sendJson(res, 400, { success: false, error: err.message });
      }
    }

    // Get Orders for user
    if (pathname.startsWith('/api/orders/user/') && method === 'GET') {
      return sendJson(res, 200, { success: true, orders: ordersStore });
    }

    return sendJson(res, 404, { error: 'API route not found' });
  }

  // STATIC FILE SERVING
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = 'index.html';
  }

  const filePath = path.join(PUBLIC_DIR, safePath);

  // Prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // 404 Not Found - Fallback to index.html for SPA if not an asset
      const ext = path.extname(filePath);
      if (!ext || ext === '.html') {
        const indexPath = path.join(PUBLIC_DIR, 'index.html');
        return fs.readFile(indexPath, (readErr, indexData) => {
          if (readErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
            res.end(indexData);
          }
        });
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on('error', streamErr => {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
    });
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`⚡ Apex Studio Store is running locally!`);
  console.log(`   Local URL:    http://localhost:${PORT}`);
  console.log(`   Health Check: http://localhost:${PORT}/api/health`);
  console.log(`   Products API: http://localhost:${PORT}/api/products`);
  console.log(`======================================================\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down server...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});
