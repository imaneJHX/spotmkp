const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function authenticateToken(req, res, next) {
  try {
    const authorizationHeader = req.headers.authorization || '';

    if (!authorizationHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentification requise.' });
    }

    const token = authorizationHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({ message: 'Jeton manquant.' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Configuration JWT manquante.' });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decodedToken.id).select('_id name email role');

    if (!user) {
      return res.status(401).json({ message: 'Utilisateur introuvable.' });
    }

    req.user = {
      _id: user._id,
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };

    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session invalide ou expiree.' });
    }

    console.error('Authentication error:', error.message);
    return res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Acces reserve aux administrateurs.' });
  }

  return next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
};
