const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const validateRequest = require('../middleware/validateRequest');
const { loginValidation, registerValidation } = require('../validators/authValidators');

const router = express.Router();

// Register
router.post('/register', registerValidation, validateRequest, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: 'Un compte existe deja avec cet e-mail.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });

    await user.save();
    return res.status(201).json({ message: 'Utilisateur inscrit avec succes.' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Un compte existe deja avec cet e-mail.' });
    }

    console.error('Register error:', error.message);
    return res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

// Login
router.post('/login', loginValidation, validateRequest, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Configuration JWT manquante.' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    );

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

module.exports = router;
