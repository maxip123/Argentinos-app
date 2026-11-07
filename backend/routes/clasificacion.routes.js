const { Router } = require('express');
const { obtenerPorDivision, obtenerDetallePorDivision, recalcular, actualizarFila } = require('../controllers/clasificacion.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');
const { validar } = require('../middlewares/validar.middleware');
const { validarAjusteClasificacion, validarIdDivisionParam } = require('../utils/validators');

const router = Router();

router.get('/:id_division',              validarIdDivisionParam, validar, obtenerPorDivision);
router.get('/:id_division/detalle',      verificarToken, verificarRol('Superadmin', 'Administrador'), validarIdDivisionParam, validar, obtenerDetallePorDivision);
router.post('/recalcular/:id_division',  verificarToken, verificarRol('Superadmin', 'Administrador'), validarIdDivisionParam, validar, recalcular);
router.put('/:id',                       verificarToken, verificarRol('Superadmin', 'Administrador'), validarAjusteClasificacion, validar, actualizarFila);

module.exports = router;
