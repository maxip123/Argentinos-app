const { Router } = require('express');
const { obtenerPorDivision, crear, actualizarResultado, eliminar } = require('../controllers/playoff.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');
const { validar } = require('../middlewares/validar.middleware');
const { validarIdParam } = require('../utils/validators');

const router = Router();

router.get('/:id_division',    obtenerPorDivision);
router.post('/',               verificarToken, verificarRol('Superadmin', 'Administrador'), crear);
router.put('/:id',             verificarToken, verificarRol('Superadmin', 'Administrador', 'Delegado'), validarIdParam, validar, actualizarResultado);
router.delete('/:id',          verificarToken, verificarRol('Superadmin'),                             validarIdParam, validar, eliminar);

module.exports = router;
