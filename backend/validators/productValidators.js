const { body, param } = require('express-validator');

const productBodyValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Le nom du produit est obligatoire.'),
  body('description')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('La description doit etre un texte.'),
  body('price')
    .notEmpty()
    .withMessage('Le prix est obligatoire.')
    .bail()
    .isFloat({ min: 0 })
    .withMessage('Le prix doit etre un nombre positif.')
    .toFloat(),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('La categorie est obligatoire.'),
  body('brand')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('La marque doit etre un texte.'),
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Le stock doit etre un entier positif.')
    .toInt(),
  body('images')
    .optional()
    .isArray()
    .withMessage('Les images doivent etre envoyees sous forme de tableau.'),
  body('images.*')
    .optional()
    .isString()
    .withMessage('Chaque image doit etre une chaine de caracteres.'),
  body('image')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage("L'image principale doit etre une chaine de caracteres."),
  body('badge')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('Le badge doit etre un texte.'),
  body('currency')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('La devise doit etre un texte.'),
  body('featured')
    .optional()
    .isBoolean()
    .withMessage('Le champ featured doit etre booleen.')
    .toBoolean(),
];

const productIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Identifiant produit invalide.'),
];

module.exports = {
  productBodyValidation,
  productIdValidation,
};
