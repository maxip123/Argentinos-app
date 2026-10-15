const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');
const { obtenerTodos, obtenerResumen, crear, actualizar, eliminar } = require('../controllers/gasto.controller');

const soloFinanzas = verificarRol('Superadmin', 'Administrador', 'Tesorero');

router.use(verificarToken);

router.get('/',          soloFinanzas, obtenerTodos);
router.get('/resumen',   soloFinanzas, obtenerResumen);
router.post('/',         soloFinanzas, crear);
router.put('/:id',       soloFinanzas, actualizar);
router.delete('/:id',    verificarRol('Superadmin', 'Administrador'), eliminar);

module.exports = router;

