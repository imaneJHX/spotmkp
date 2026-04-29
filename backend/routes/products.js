const express = require('express');
const Product = require('../models/Product');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');
const { productBodyValidation, productIdValidation } = require('../validators/productValidators');

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    return res.json(products);
  } catch (error) {
    console.error('Get products error:', error.message);
    return res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

// Get product by ID
router.get('/:id', productIdValidation, validateRequest, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }

    return res.json(product);
  } catch (error) {
    console.error('Get product error:', error.message);
    return res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

// Add product (admin)
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  productBodyValidation,
  validateRequest,
  async (req, res) => {
    try {
      const product = new Product(req.body);
      await product.save();

      return res.status(201).json(product);
    } catch (error) {
      console.error('Create product error:', error.message);
      return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
  },
);

// Update product (admin)
router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  productIdValidation,
  productBodyValidation,
  validateRequest,
  async (req, res) => {
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
      console.error('Update product error:', error.message);
      return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
  },
);

// Delete product (admin)
router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  productIdValidation,
  validateRequest,
  async (req, res) => {
    try {
      const product = await Product.findByIdAndDelete(req.params.id);

      if (!product) {
        return res.status(404).json({ message: 'Produit introuvable.' });
      }

      return res.json({ message: 'Produit supprime.' });
    } catch (error) {
      console.error('Delete product error:', error.message);
      return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
  },
);

module.exports = router;
