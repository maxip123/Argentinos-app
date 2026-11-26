const { Router } = require('express');
const {
  listarConceptos,
  crearConcepto,
  actualizarConcepto,
  crearCargos,
  listarCargos,
  estadoCuenta,
  registrarPago,
  marcarNoCorresponde,
  anularPagoHandler,
} = require('../controllers/cobro.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');
const { validar } = require('../middlewares/validar.middleware');
const {
  validarIdParam,
  validarConcepto,
  validarActualizarConcepto,
  validarCargarDeuda,
  validarRegistrarPago,
  validarMotivo,
} = require('../utils/validators');

const router = Router();

// Datos financieros internos: siempre con token
router.use(verificarToken);
const soloFinanzas = verificarRol('Superadmin', 'Administrador', 'Tesorero');

router.get('/conceptos',                    soloFinanzas, listarConceptos);
router.post('/conceptos',                   soloFinanzas, validarConcepto, validar, crearConcepto);
router.put('/conceptos/:id',                soloFinanzas, validarActualizarConcepto, validar, actualizarConcepto);

router.post('/cargos',                      soloFinanzas, validarCargarDeuda, validar, crearCargos);
router.get('/cargos',                       soloFinanzas, listarCargos);
router.post('/cargos/:id/pagos',            soloFinanzas, validarIdParam, validarRegistrarPago, validar, registrarPago);
router.post('/cargos/:id/no-corresponde',   soloFinanzas, validarMotivo, validar, marcarNoCorresponde);
router.get('/jugadores/:id/estado-cuenta',  soloFinanzas, validarIdParam, validar, estadoCuenta);

// Anular un cobro: los mismos roles que anulan movimientos de caja
router.post('/pagos/:id/anular', verificarRol('Superadmin', 'Administrador'), validarMotivo, validar, anularPagoHandler);

module.exports = router;
