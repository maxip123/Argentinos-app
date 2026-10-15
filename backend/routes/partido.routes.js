const { Router } = require('express');
const {
  obtenerTodos,
  obtenerProximos,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  obtenerEstadisticasPartido,
  guardarEstadisticasPartido,
} = require('../controllers/partido.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');
const { validar } = require('../middlewares/validar.middleware');
const { validarCrearPartido, validarIdParam } = require('../utils/validators');

const router = Router();

// Públicas
router.get('/',                  obtenerTodos);
router.get('/proximos',          obtenerProximos);
router.get('/:id',               validarIdParam, validar, obtenerPorId);
router.get('/:id/estadisticas',  validarIdParam, validar, obtenerEstadisticasPartido);

// Autenticadas
router.post('/',                 verificarToken, verificarRol('Superadmin', 'Administrador', 'Delegado'), validarCrearPartido, validar, crear);
router.post('/:id/estadisticas', verificarToken, verificarRol('Superadmin', 'Administrador', 'Delegado'), validarIdParam, validar, guardarEstadisticasPartido);
router.put('/:id',               verificarToken, verificarRol('Superadmin', 'Administrador', 'Delegado'), validarIdParam, validar, actualizar);
router.delete('/:id',            verificarToken, verificarRol('Superadmin', 'Administrador', 'Delegado'), validarIdParam, validar, eliminar);

module.exports = router;
