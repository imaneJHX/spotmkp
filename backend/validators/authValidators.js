const { body } = require('express-validator');

const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Le nom est obligatoire.')
    .isLength({ min: 2 })
    .withMessage('Le nom doit contenir au moins 2 caracteres.'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Veuillez saisir un e-mail valide.')
    .normalizeEmail(),
  body('password')
    .isString()
    .withMessage('Le mot de passe est obligatoire.')
    .bail()
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caracteres.'),
];

const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Veuillez saisir un e-mail valide.')
    .normalizeEmail(),
  body('password')
    .isString()
    .withMessage('Le mot de passe est obligatoire.')
    .bail()
    .notEmpty()
    .withMessage('Le mot de passe est obligatoire.'),
];

module.exports = {
  registerValidation,
  loginValidation,
};
