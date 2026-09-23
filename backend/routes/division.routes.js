const { Router } = require('express');
const { obtenerTodas, obtenerPorId, crear, actualizar, eliminar } = require('../controllers/division.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');
const { validar } = require('../middlewares/validar.middleware');
const { validarCrearDivision, validarIdParam } = require('../utils/validators');

const router = Router();

// GET — Público
router.get('/', obtenerTodas);
router.get('/:id', validarIdParam, validar, obtenerPorId);

// Mutaciones — Solo administradores
router.post('/',     verificarToken, verificarRol('Superadmin', 'Administrador'), validarCrearDivision, validar, crear);
router.put('/:id',   verificarToken, verificarRol('Superadmin', 'Administrador'), validarIdParam, validar, actualizar);
router.delete('/:id',verificarToken, verificarRol('Superadmin'),                  validarIdParam, validar, eliminar);

module.exports = router;
