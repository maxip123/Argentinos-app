const { Router } = require('express');
const {
  obtenerTodos,
  obtenerPorId,
  obtenerGoleadores,
  obtenerTarjetas,
  crear,
  actualizar,
  eliminar,
} = require('../controllers/jugador.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');
const { validar } = require('../middlewares/validar.middleware');
const { validarCrearJugador, validarIdParam } = require('../utils/validators');

const router = Router();

// Rutas de consulta — Públicas
router.get('/',                                 obtenerTodos);
router.get('/goleadores/:id_division',          obtenerGoleadores);
router.get('/tarjetas/:id_division',            obtenerTarjetas);
router.get('/:id',       validarIdParam, validar, obtenerPorId);

// Mutaciones — Autenticadas
router.post('/',     verificarToken, verificarRol('Superadmin', 'Administrador', 'Delegado', 'DT'), validarCrearJugador, validar, crear);
router.put('/:id',   verificarToken, verificarRol('Superadmin', 'Administrador', 'Delegado', 'DT'), validarIdParam, validar, actualizar);
router.delete('/:id',verificarToken, verificarRol('Superadmin', 'Administrador'),                   validarIdParam, validar, eliminar);

module.exports = router;
