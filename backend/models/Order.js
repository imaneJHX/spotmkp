const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  products: [{
    product: { type: mongoose.Schema.Types.Mixed, required: true },
    productId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    image: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  }],
  total: { type: Number, required: true, min: 0 },
  status: { type: String, default: 'pending' },
  paymentMethod: { type: String, default: 'Paiement a la livraison' },
  address: { type: String, required: true, trim: true },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Order', orderSchema);
