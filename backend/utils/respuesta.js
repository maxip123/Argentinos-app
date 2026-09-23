/**
 * Construye una respuesta JSON estandarizada de éxito.
 * @param {object} res - Objeto response de Express
 * @param {*} data - Datos a retornar
 * @param {string} mensaje - Mensaje descriptivo
 * @param {number} status - Código HTTP (default 200)
 */
const respuestaExito = (res, data, mensaje = 'Operación exitosa', status = 200) => {
  return res.status(status).json({
    ok: true,
    mensaje,
    data,
  });
};

/**
 * Construye una respuesta JSON estandarizada de error.
 * @param {object} res - Objeto response de Express
 * @param {string} mensaje - Mensaje de error
 * @param {number} status - Código HTTP (default 500)
 * @param {*} detalle - Detalle adicional del error (solo en desarrollo)
 */
const respuestaError = (res, mensaje = 'Error interno del servidor', status = 500, detalle = null) => {
  const respuesta = { ok: false, mensaje };

  if (process.env.NODE_ENV === 'development' && detalle) {
    respuesta.detalle = detalle;
  }

  return res.status(status).json(respuesta);
};

module.exports = { respuestaExito, respuestaError };
