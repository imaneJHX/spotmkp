const express = require('express');
const Product = require('../models/Product');
const validateRequest = require('../middleware/validateRequest');
const { productBodyValidation, productIdValidation } = require('../validators/productValidators');

const router = express.Router();

// Add product
router.post('/products', productBodyValidation, validateRequest, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();

    return res.status(201).json(product);
  } catch (error) {
    console.error('Admin create product error:', error.message);
    return res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

// Update product
router.put('/products/:id', productIdValidation, productBodyValidation, validateRequest, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }

    return res.json(product);
  } catch (error) {
    console.error('Admin update product error:', error.message);
    return res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

// Delete product
router.delete('/products/:id', productIdValidation, validateRequest, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }

    return res.json({ message: 'Produit supprime.' });
  } catch (error) {
    console.error('Admin delete product error:', error.message);
    return res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

module.exports = router;
