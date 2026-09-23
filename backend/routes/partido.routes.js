const { Router } = require('express');
const { obtenerTodos, obtenerProximos, obtenerPorId, crear, actualizar, eliminar } = require('../controllers/partido.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');
const { validar } = require('../middlewares/validar.middleware');
const { validarCrearPartido, validarIdParam } = require('../utils/validators');

const router = Router();

// Públicas
router.get('/',         obtenerTodos);
router.get('/proximos', obtenerProximos);
router.get('/:id',      validarIdParam, validar, obtenerPorId);

// Autenticadas
router.post('/',     verificarToken, verificarRol('Superadmin', 'Administrador', 'Delegado'), validarCrearPartido, validar, crear);
router.put('/:id',   verificarToken, verificarRol('Superadmin', 'Administrador', 'Delegado'), validarIdParam, validar, actualizar);
router.delete('/:id',verificarToken, verificarRol('Superadmin', 'Administrador'),             validarIdParam, validar, eliminar);

module.exports = router;
