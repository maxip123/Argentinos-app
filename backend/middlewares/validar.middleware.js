const { validationResult } = require('express-validator');

/**
 * Middleware que verifica los resultados de express-validator.
 * Si hay errores de validación, responde con 422 y la lista de errores.
 * Si todo está bien, pasa al siguiente handler.
 */
const validar = (req, res, next) => {
  const errores = validationResult(req);

  if (!errores.isEmpty()) {
    const lista = errores.array();
    return res.status(422).json({
      ok: false,
      mensaje: lista[0].msg,
      errores: lista.map((e) => ({
        campo: e.path,
        mensaje: e.msg,
      })),
    });
  }

  next();
};

module.exports = { validar };
