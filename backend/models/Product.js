const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  currency: { type: String, default: 'MAD' },
  category: String,
  brand: String,
  image: String,
  images: [String],
  badge: String,
  featured: { type: Boolean, default: false },
  slug: String,
  productUrl: String,
  stock: Number,
  reviews: [{ user: String, rating: Number, comment: String }],
});

module.exports = mongoose.model('Product', productSchema);
