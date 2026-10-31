const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');
const { validar } = require('../middlewares/validar.middleware');
const { validarIdParam } = require('../utils/validators');
const { obtenerTodos, obtenerResumen, crear, actualizar, anular } = require('../controllers/gasto.controller');

const soloFinanzas = verificarRol('Superadmin', 'Administrador', 'Tesorero');

router.use(verificarToken);

router.get('/',          soloFinanzas, obtenerTodos);
router.get('/resumen',   soloFinanzas, obtenerResumen);
router.post('/',         soloFinanzas, crear);
router.put('/:id',       soloFinanzas, actualizar);
router.post('/:id/anular', verificarRol('Superadmin', 'Administrador'), validarIdParam, validar, anular);

module.exports = router;

