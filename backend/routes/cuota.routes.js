const { Router } = require('express');
const { obtenerTodas, obtenerMorosos, obtenerPorId, crear, actualizar, eliminar } = require('../controllers/cuota.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');
const { validar } = require('../middlewares/validar.middleware');
const { validarCrearCuota, validarIdParam } = require('../utils/validators');

const router = Router();

// Todas requieren autenticación (datos financieros internos)
router.use(verificarToken);

router.get('/',                    verificarRol('Superadmin', 'Administrador', 'Tesorero'), obtenerTodas);
router.get('/morosos/:id_division',verificarRol('Superadmin', 'Administrador', 'Tesorero'), obtenerMorosos);
router.get('/:id',                 verificarRol('Superadmin', 'Administrador', 'Tesorero'), validarIdParam, validar, obtenerPorId);
router.post('/',                   verificarRol('Superadmin', 'Administrador', 'Tesorero'), validarCrearCuota, validar, crear);
router.put('/:id',                 verificarRol('Superadmin', 'Administrador', 'Tesorero'), validarIdParam, validar, actualizar);
router.delete('/:id',              verificarRol('Superadmin', 'Administrador'),             validarIdParam, validar, eliminar);

module.exports = router;
