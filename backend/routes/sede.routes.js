const { Router } = require('express');
const { obtenerTodas, obtenerPorId, crear, actualizar, eliminar } = require('../controllers/sede.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');
const { validar } = require('../middlewares/validar.middleware');
const { validarCrearSede, validarIdParam } = require('../utils/validators');

const router = Router();

router.get('/',      obtenerTodas);
router.get('/:id',   validarIdParam, validar, obtenerPorId);

router.post('/',     verificarToken, verificarRol('Superadmin', 'Administrador'), validarCrearSede, validar, crear);
router.put('/:id',   verificarToken, verificarRol('Superadmin', 'Administrador'), validarIdParam, validar, actualizar);
router.delete('/:id',verificarToken, verificarRol('Superadmin'),                  validarIdParam, validar, eliminar);

module.exports = router;
