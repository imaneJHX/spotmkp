const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function normalizeOrderItem(item) {
  const rawProductId = item?.productId ?? item?.product ?? item?._id ?? item?.id ?? '';
  const productId = String(rawProductId || '').trim();
  const quantity = Number(item?.quantity);
  const price = Number(item?.price);

  return {
    product: mongoose.isValidObjectId(productId) ? new mongoose.Types.ObjectId(productId) : productId,
    productId,
    name: String(item?.name || '').trim(),
    image: String(item?.image || '').trim(),
    price,
    quantity,
  };
}

function getOrderValidationErrors(payload) {
  const errors = [];
  const customerName = String(payload.customerName || '').trim();
  const address = String(payload.address || '').trim();
  const phone = String(payload.phone || '').trim();
  const paymentMethod = String(payload.paymentMethod || 'Paiement a la livraison').trim();
  const normalizedProducts = Array.isArray(payload.products) ? payload.products.map(normalizeOrderItem) : [];

  if (!customerName) {
    errors.push({ field: 'customerName', message: 'Le nom est obligatoire.' });
  }

  if (!address) {
    errors.push({ field: 'address', message: "L'adresse est obligatoire." });
  }

  if (!phone) {
    errors.push({ field: 'phone', message: 'Le telephone est obligatoire.' });
  }

  if (normalizedProducts.length === 0) {
    errors.push({ field: 'products', message: 'Le panier ne peut pas etre vide.' });
  }

  normalizedProducts.forEach((item, index) => {
    if (!item.productId) {
      errors.push({ field: `products[${index}].productId`, message: 'Identifiant produit manquant.' });
    }

    if (!item.name) {
      errors.push({ field: `products[${index}].name`, message: 'Nom produit manquant.' });
    }

    if (!Number.isFinite(item.price) || item.price < 0) {
      errors.push({ field: `products[${index}].price`, message: 'Prix produit invalide.' });
    }

    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      errors.push({ field: `products[${index}].quantity`, message: 'Quantite invalide.' });
    }
  });

  const computedTotal = normalizedProducts.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    errors,
    customerName,
    address,
    phone,
    paymentMethod,
    normalizedProducts,
    computedTotal,
  };
}

// Create order
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { errors, customerName, address, phone, paymentMethod, normalizedProducts, computedTotal } =
      getOrderValidationErrors(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Commande invalide.',
        errors,
      });
    }

    const order = new Order({
      user: req.user._id,
      customerName,
      address,
      phone,
      paymentMethod,
      products: normalizedProducts,
      total: computedTotal,
    });

    await order.save();
    return res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error.message);
    return res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

// Get user orders
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Identifiant utilisateur invalide.' });
    }

    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Acces refuse a ces commandes.' });
    }

    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error.message);
    return res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

module.exports = router;
