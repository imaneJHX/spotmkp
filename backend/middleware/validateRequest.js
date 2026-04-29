const { validationResult } = require('express-validator');

function validateRequest(req, res, next) {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  return res.status(400).json({
    message: 'Erreur de validation.',
    errors: errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    })),
  });
}

module.exports = validateRequest;
