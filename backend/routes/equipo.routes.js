const { Router } = require('express');
const {
  obtenerTodos,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  obtenerPlantel,
  asignarJugador,
  actualizarJugadorPlantel,
  desasignarJugador,
  transferirJugador,
} = require('../controllers/equipo.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');
const { validar } = require('../middlewares/validar.middleware');
const { validarCrearEquipo, validarIdParam } = require('../utils/validators');

const router = Router();

// Equipos generales
router.get('/',       obtenerTodos);
router.get('/:id',    validarIdParam, validar, obtenerPorId);
router.post('/',      verificarToken, verificarRol('Superadmin', 'Administrador', 'Delegado'), validarCrearEquipo, validar, crear);
router.put('/:id',    verificarToken, verificarRol('Superadmin', 'Administrador', 'Delegado'), validarIdParam, validar, actualizar);
router.delete('/:id', verificarToken, verificarRol('Superadmin', 'Administrador'),           validarIdParam, validar, eliminar);

// Gestión de Plantel (Jugadores por Equipo)
// El plantel incluye DNI, teléfono y estado de cuota: nunca debe ser público
router.get('/:id/plantel',              verificarToken, validarIdParam, validar, obtenerPlantel);
router.post('/:id/plantel',             verificarToken, verificarRol('Superadmin', 'Administrador', 'Delegado'), validarIdParam, validar, asignarJugador);
router.put('/:id/plantel/:id_jugador',  verificarToken, verificarRol('Superadmin', 'Administrador', 'Delegado'), actualizarJugadorPlantel);
router.delete('/:id/plantel/:id_jugador', verificarToken, verificarRol('Superadmin', 'Administrador', 'Delegado'), desasignarJugador);
router.post('/transferir-jugador',       verificarToken, verificarRol('Superadmin', 'Administrador', 'Delegado'), transferirJugador);

module.exports = router;
