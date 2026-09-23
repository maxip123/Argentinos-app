const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticación JWT.
 * Verifica que el token Bearer en el header Authorization sea válido.
 * Si es válido, adjunta el payload decodificado en req.usuario.
 */
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      ok: false,
      mensaje: 'Acceso denegado. Se requiere token de autenticación.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        ok: false,
        mensaje: 'La sesión ha expirado. Por favor, vuelva a iniciar sesión.',
      });
    }

    return res.status(401).json({
      ok: false,
      mensaje: 'Token inválido.',
    });
  }
};

/**
 * Middleware de autorización por rol.
 * Uso: verificarRol('Superadmin', 'Administrador')
 * @param {...string} rolesPermitidos - Roles que pueden acceder al endpoint
 */
const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        ok: false,
        mensaje: 'No autenticado.',
      });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        ok: false,
        mensaje: `Acceso denegado. Se requiere uno de los siguientes roles: ${rolesPermitidos.join(', ')}.`,
      });
    }

    next();
  };
};

module.exports = { verificarToken, verificarRol };
