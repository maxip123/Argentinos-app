const { Router } = require('express');
const { obtenerPorDivision, recalcular } = require('../controllers/clasificacion.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/:id_division',              obtenerPorDivision);
router.post('/recalcular/:id_division',  verificarToken, verificarRol('Superadmin', 'Administrador'), recalcular);

module.exports = router;
