const { Router } = require('express');
const { obtenerPorDivision, recalcular, actualizarFila } = require('../controllers/clasificacion.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');
const { validar } = require('../middlewares/validar.middleware');
const { validarAjusteClasificacion } = require('../utils/validators');

const router = Router();

router.get('/:id_division',              obtenerPorDivision);
router.post('/recalcular/:id_division',  verificarToken, verificarRol('Superadmin', 'Administrador'), recalcular);
router.put('/:id',                       verificarToken, verificarRol('Superadmin', 'Administrador'), validarAjusteClasificacion, validar, actualizarFila);

module.exports = router;
