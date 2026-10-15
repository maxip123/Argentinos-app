const { body, param, query } = require('express-validator');

// ─── AUTH ──────────────────────────────────────────────────────────────────────
const validarLogin = [
  body('email').isEmail().withMessage('El email debe ser una dirección válida.').normalizeEmail(),
  body('contrasena').notEmpty().withMessage('La contraseña es requerida.').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.'),
];

const validarRegistro = [
  body('email').isEmail().withMessage('El email debe ser una dirección válida.').normalizeEmail(),
  body('contrasena').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.'),
  body('nombre_completo').trim().notEmpty().withMessage('El nombre completo es requerido.'),
  body('rol').isIn(['Superadmin', 'Administrador', 'Tesorero', 'Delegado', 'DT', 'Visor']).withMessage('Rol inválido.'),
];

const validarCambioContrasena = [
  body('contrasena_actual').notEmpty().withMessage('La contraseña actual es requerida.'),
  body('contrasena_nueva').isLength({ min: 8 }).withMessage('La nueva contraseña debe tener al menos 8 caracteres.'),
];

// ─── DIVISIÓN ─────────────────────────────────────────────────────────────────
const validarCrearDivision = [
  body('nombre_division').trim().notEmpty().withMessage('El nombre de la división es requerido.').isLength({ max: 100 }).withMessage('El nombre no puede superar los 100 caracteres.'),
  body('genero').isIn(['Masculino', 'Femenino']).withMessage("El género debe ser 'Masculino' o 'Femenino'."),
  body('temporada').optional({ checkFalsy: true }).isInt({ min: 2000, max: 2100 }).withMessage('La temporada debe ser un año válido.'),
  body('fecha_inicio').optional({ checkFalsy: true }).isDate().withMessage('La fecha de inicio debe ser una fecha válida (YYYY-MM-DD).'),
  body('fecha_fin').optional({ checkFalsy: true }).isDate().withMessage('La fecha de fin debe ser una fecha válida (YYYY-MM-DD).'),
];

const validarIdParam = [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo.'),
];

// ─── EQUIPO ───────────────────────────────────────────────────────────────────
const validarCrearEquipo = [
  body('id_division').isInt({ min: 1 }).withMessage('El ID de la división es requerido.'),
  body('nombre_equipo').trim().notEmpty().withMessage('El nombre del equipo es requerido.').isLength({ max: 120 }).withMessage('Máximo 120 caracteres.'),
  body('nombre_corto').optional({ checkFalsy: true }).isLength({ max: 30 }).withMessage('El nombre corto no puede superar 30 caracteres.'),
  body('es_argentinos_del_norte').optional().isBoolean().withMessage('Debe ser un valor booleano.'),
];

// ─── JUGADOR ──────────────────────────────────────────────────────────────────
const validarCrearJugador = [
  body('id_equipo').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('El ID del equipo debe ser válido.'),
  body('id_division').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('El ID de la división debe ser válido.'),
  body('nombre').trim().notEmpty().withMessage('El nombre es requerido.'),
  body('apellido').trim().notEmpty().withMessage('El apellido es requerido.'),
  body('dni').trim().notEmpty().withMessage('El DNI es requerido.').isLength({ max: 30 }).withMessage('El DNI no puede superar 30 caracteres.'),
  body('fecha_nacimiento').optional({ checkFalsy: true }).isDate().withMessage('La fecha de nacimiento debe ser válida (YYYY-MM-DD).'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('El email debe ser una dirección válida.'),
];

// ─── PARTIDO ──────────────────────────────────────────────────────────────────
const validarCrearPartido = [
  body('id_division').isInt({ min: 1 }).withMessage('El ID de la división es requerido.'),
  body('id_sede').isInt({ min: 1 }).withMessage('El ID de la sede es requerido.'),
  body('id_equipo_local').isInt({ min: 1 }).withMessage('El ID del equipo local es requerido.'),
  body('id_equipo_visitante').isInt({ min: 1 }).withMessage('El ID del equipo visitante es requerido.'),
  body('fecha_partido').notEmpty().withMessage('La fecha del partido es requerida.').isISO8601().withMessage('La fecha debe ser una fecha ISO8601 válida.'),
  body('goles_local').optional().isInt({ min: 0 }).withMessage('Los goles locales deben ser un número positivo.'),
  body('goles_visitante').optional().isInt({ min: 0 }).withMessage('Los goles visitantes deben ser un número positivo.'),
  body('estado_partido').optional().isIn([0, 1, 2, 3, 4]).withMessage('Estado del partido inválido (0-4).'),
];

// ─── CUOTA ────────────────────────────────────────────────────────────────────
const validarCrearCuota = [
  body('id_jugador').isInt({ min: 1 }).withMessage('El ID del jugador es requerido.'),
  body('id_division').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('El ID de la división debe ser un número entero positivo.'),
  body('periodo_mes').isInt({ min: 1, max: 12 }).withMessage('El mes debe ser entre 1 y 12.'),
  body('periodo_anio').isInt({ min: 2020 }).withMessage('El año debe ser 2020 o posterior.'),
  body('monto_esperado').isFloat({ min: 0 }).withMessage('El monto esperado debe ser un número positivo.'),
  body('fecha_vencimiento').isDate().withMessage('La fecha de vencimiento debe ser válida (YYYY-MM-DD).'),
  body('estado_pago').optional().isIn(['Pendiente', 'Pagado', 'Parcial', 'Vencido', 'Exonerado/Becado']).withMessage('Estado de pago inválido.'),
  body('metodo_pago').optional().isIn(['Efectivo', 'Transferencia', 'MercadoPago', 'Débito', 'Crédito', 'Otro']).withMessage('Método de pago inválido.'),
];

// ─── SEDE ─────────────────────────────────────────────────────────────────────
const validarCrearSede = [
  body('nombre_sede').trim().notEmpty().withMessage('El nombre de la sede es requerido.'),
  body('direccion').trim().notEmpty().withMessage('La dirección es requerida.'),
  body('google_maps_url').optional().isURL().withMessage('El enlace de Google Maps debe ser una URL válida.'),
];

module.exports = {
  validarLogin,
  validarRegistro,
  validarCambioContrasena,
  validarCrearDivision,
  validarIdParam,
  validarCrearEquipo,
  validarCrearJugador,
  validarCrearPartido,
  validarCrearCuota,
  validarCrearSede,
};
