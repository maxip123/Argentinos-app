const { Router } = require('express');
const { obtenerTodos, obtenerPorId, crear, actualizar, eliminar } = require('../controllers/equipo.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');
const { validar } = require('../middlewares/validar.middleware');
const { validarCrearEquipo, validarIdParam } = require('../utils/validators');

const router = Router();

router.get('/',     obtenerTodos);
router.get('/:id',  validarIdParam, validar, obtenerPorId);

router.post('/',    verificarToken, verificarRol('Superadmin', 'Administrador', 'Delegado'), validarCrearEquipo, validar, crear);
router.put('/:id',  verificarToken, verificarRol('Superadmin', 'Administrador', 'Delegado'), validarIdParam, validar, actualizar);
router.delete('/:id', verificarToken, verificarRol('Superadmin', 'Administrador'),           validarIdParam, validar, eliminar);

module.exports = router;
