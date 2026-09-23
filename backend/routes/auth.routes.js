const { Router } = require('express');
const { login, registro, obtenerPerfil, cambiarContrasena } = require('../controllers/auth.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');
const { validar } = require('../middlewares/validar.middleware');
const { validarLogin, validarRegistro, validarCambioContrasena } = require('../utils/validators');

const router = Router();

// POST /api/auth/login — Público
router.post('/login', validarLogin, validar, login);

// POST /api/auth/registro — Solo Superadmin puede crear usuarios
router.post('/registro', verificarToken, verificarRol('Superadmin'), validarRegistro, validar, registro);

// GET /api/auth/perfil — Usuario autenticado
router.get('/perfil', verificarToken, obtenerPerfil);

// PUT /api/auth/cambiar-contrasena — Usuario autenticado
router.put('/cambiar-contrasena', verificarToken, validarCambioContrasena, validar, cambiarContrasena);

module.exports = router;
