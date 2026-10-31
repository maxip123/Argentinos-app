const { Router } = require('express');
const {
  obtenerTodos,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  obtenerPorEquipo,
  asignarAEquipo,
  desasignarDeEquipo,
} = require('../controllers/cuerpoTecnico.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');
const { validar } = require('../middlewares/validar.middleware');
const { validarIdParam } = require('../utils/validators');

const router = Router();

// Padrón general: incluye DNI, teléfono y email, nunca debe ser público
router.get('/',       verificarToken, obtenerTodos);
router.get('/:id',    verificarToken, validarIdParam, validar, obtenerPorId);
router.post('/',      verificarToken, verificarRol('Superadmin', 'Administrador', 'Delegado'), crear);
router.put('/:id',    verificarToken, verificarRol('Superadmin', 'Administrador', 'Delegado'), validarIdParam, validar, actualizar);
router.delete('/:id', verificarToken, verificarRol('Superadmin', 'Administrador'),           validarIdParam, validar, eliminar);

// Asignación a equipos
router.get('/equipo/:id_equipo',                      verificarToken, obtenerPorEquipo);
router.post('/equipo/:id_equipo',                     verificarToken, verificarRol('Superadmin', 'Administrador', 'Delegado'), asignarAEquipo);
router.delete('/equipo/:id_equipo/:id_cuerpo_tecnico', verificarToken, verificarRol('Superadmin', 'Administrador', 'Delegado'), desasignarDeEquipo);

module.exports = router;
