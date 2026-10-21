const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, default: 'Apex' },
    category: { type: String, required: true, lowercase: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, default: 0 },
    description: { type: String, default: '' },
    img: { type: String, required: true },
    stock: { type: Number, default: 25, min: 0 },
    rating: { type: Number, default: 4.8 },
    reviewsCount: { type: Number, default: 84 },
    features: [{ type: String }],
    isFeatured: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', ProductSchema);
