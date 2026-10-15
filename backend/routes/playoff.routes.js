const { Router } = require('express');
const {
  obtenerPorDivision,
  generarBracket,
  actualizarResultado,
  reiniciarBracket,
  eliminar,
} = require('../controllers/playoff.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');
const { validar } = require('../middlewares/validar.middleware');
const { validarIdParam } = require('../utils/validators');

const router = Router();

// Bracket generation and division reset
router.post('/generar', verificarToken, verificarRol('Superadmin', 'Administrador'), generarBracket);
router.delete('/division/:id_division', verificarToken, verificarRol('Superadmin', 'Administrador'), reiniciarBracket);

// Public query by tournament / division
router.get('/:id_division', obtenerPorDivision);

// Match result updates and single match removal
router.put('/:id', verificarToken, verificarRol('Superadmin', 'Administrador', 'Delegado'), validarIdParam, validar, actualizarResultado);
router.delete('/:id', verificarToken, verificarRol('Superadmin'), validarIdParam, validar, eliminar);

module.exports = router;

