function errorHandler(err, req, res, next) {
  console.error(`[Error] ${req.method} ${req.url}:`, err.message);
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ success: false, error: `An account with this ${field} already exists.` });
  }
  res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Internal Server Error' });
}

module.exports = { errorHandler };
