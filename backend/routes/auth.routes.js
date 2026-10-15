const { Router } = require('express');
const {
  login,
  registro,
  obtenerPerfil,
  cambiarContrasena,
  obtenerUsuarios,
  actualizarUsuario,
  eliminarUsuario,
} = require('../controllers/auth.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');
const { validar } = require('../middlewares/validar.middleware');
const { validarLogin, validarRegistro, validarCambioContrasena } = require('../utils/validators');

const router = Router();

// POST /api/auth/login — Público
router.post('/login', validarLogin, validar, login);

// POST /api/auth/registro — Solo Superadmin puede crear usuarios
router.post('/registro', verificarToken, verificarRol('Superadmin'), validarRegistro, validar, registro);

// GET /api/auth/usuarios — Listar todos los usuarios (Superadmin y Administrador)
router.get('/usuarios', verificarToken, verificarRol('Superadmin', 'Administrador'), obtenerUsuarios);

// PUT /api/auth/usuarios/:id — Editar o resetear contraseña (Superadmin)
router.put('/usuarios/:id', verificarToken, verificarRol('Superadmin'), actualizarUsuario);

// DELETE /api/auth/usuarios/:id — Dar de baja usuario (Superadmin)
router.delete('/usuarios/:id', verificarToken, verificarRol('Superadmin'), eliminarUsuario);

// GET /api/auth/perfil — Usuario autenticado
router.get('/perfil', verificarToken, obtenerPerfil);

// PUT /api/auth/cambiar-contrasena — Usuario autenticado
router.put('/cambiar-contrasena', verificarToken, validarCambioContrasena, validar, cambiarContrasena);

module.exports = router;
