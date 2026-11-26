const { body, param, query } = require('express-validator');
const { RUTA_LOGO_PROPIA } = require('./logos');

const esLinkHttps = (url) => {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname.includes('.');
  } catch {
    return false;
  }
};

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

// logo_url: vacío/null (escudo o iniciales por defecto), un link https o la ruta de una imagen subida
const validarLogoUrl = [
  body('logo_url')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .custom((url) => RUTA_LOGO_PROPIA.test(url) || esLinkHttps(url))
    .withMessage('El logo tiene que ser un link que empiece con https://.'),
];

const validarSubirLogo = [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo.'),
  body('imagen').isString().isLength({ max: 500 * 1024 }).withMessage('La imagen es demasiado pesada.'),
];

// ─── JUGADOR ──────────────────────────────────────────────────────────────────
// Domicilio y obra social (opcionales; el controller los ignora si el rol no puede verlos)
const camposPadron = [
  body('domicilio').optional({ nullable: true }).isString().withMessage('El domicilio debe ser texto.')
    .isLength({ max: 200 }).withMessage('El domicilio no puede superar 200 caracteres.'),
  body('obra_social').optional({ nullable: true }).isString().withMessage('La obra social debe ser texto.')
    .isLength({ max: 100 }).withMessage('La obra social no puede superar 100 caracteres.'),
];

const validarCrearJugador = [
  body('id_equipo').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('El ID del equipo debe ser válido.'),
  body('id_division').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('El ID de la división debe ser válido.'),
  body('nombre').trim().notEmpty().withMessage('El nombre es requerido.'),
  body('apellido').trim().notEmpty().withMessage('El apellido es requerido.'),
  body('dni').trim().notEmpty().withMessage('El DNI es requerido.').isLength({ max: 30 }).withMessage('El DNI no puede superar 30 caracteres.'),
  body('fecha_nacimiento').optional({ checkFalsy: true }).isDate().withMessage('La fecha de nacimiento debe ser válida (YYYY-MM-DD).'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('El email debe ser una dirección válida.'),
  ...camposPadron,
];

const validarActualizarJugador = [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo.'),
  body('dni').optional({ nullable: true }).isString().isLength({ max: 30 }).withMessage('El DNI no puede superar 30 caracteres.'),
  body('fecha_nacimiento').optional({ nullable: true, checkFalsy: true }).isDate().withMessage('La fecha de nacimiento debe ser válida (YYYY-MM-DD).'),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('El email debe ser una dirección válida.'),
  body('es_inactivo').optional().isBoolean().withMessage('"Inactivo" debe ser verdadero o falso.').toBoolean(),
  body('fecha_baja').optional({ nullable: true, checkFalsy: true }).isDate({ format: 'YYYY-MM-DD', strictMode: true })
    .withMessage('La fecha de baja debe ser válida (AAAA-MM-DD).'),
  ...camposPadron,
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
  body('afecta_clasificacion').optional().isBoolean().withMessage('"Afecta la tabla" debe ser verdadero o falso.').toBoolean(),
];

// ─── SEDE ─────────────────────────────────────────────────────────────────────
const validarCrearSede = [
  body('nombre_sede').trim().notEmpty().withMessage('El nombre de la sede es requerido.'),
  body('direccion').trim().notEmpty().withMessage('La dirección es requerida.'),
  body('es_sede_propia').optional().isBoolean().withMessage('"Sede propia" debe ser verdadero o falso.').toBoolean(),
];

// En la edición cada campo es opcional, pero si viene no puede quedar vacío.
const validarActualizarSede = [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo.'),
  body('nombre_sede').optional().isString().trim().notEmpty().withMessage('El nombre de la sede no puede quedar vacío.'),
  body('direccion').optional().isString().trim().notEmpty().withMessage('La dirección no puede quedar vacía.'),
  body('es_sede_propia').optional().isBoolean().withMessage('"Sede propia" debe ser verdadero o falso.').toBoolean(),
];

// ─── COBROS Y DEUDAS ──────────────────────────────────────────────────────────
// Montos como número o texto con punto decimal ("20000.50"); "20.000" (punto de miles) se rechaza para no
// tomarlo como veinte pesos.
const esMonto = (valor) => /^\d{1,10}(\.\d{1,2})?$/.test(String(valor ?? '').trim()) && Number(valor) > 0;
const campoMonto = (campo, obligatorio = true) => {
  const cadena = body(campo);
  return (obligatorio ? cadena : cadena.optional({ nullable: true, checkFalsy: true }))
    .custom(esMonto)
    .withMessage('El monto tiene que ser un número mayor a cero, con punto para los centavos (ej. 20000 o 20000.50).');
};

const validarConcepto = [
  body('nombre').isString().trim().notEmpty().withMessage('El nombre del concepto es obligatorio.').isLength({ max: 50 }).withMessage('Máximo 50 caracteres (es la categoría en la caja).'),
  campoMonto('monto_sugerido', false),
  body('es_mensual').optional().isBoolean().withMessage('"Mensual" debe ser verdadero o falso.').toBoolean(),
];

const validarActualizarConcepto = [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo.'),
  body('nombre').optional().isString().trim().notEmpty().withMessage('El nombre no puede quedar vacío.').isLength({ max: 50 }).withMessage('Máximo 50 caracteres (es la categoría en la caja).'),
  campoMonto('monto_sugerido', false),
  body('activo').optional().isBoolean().withMessage('"Activo" debe ser verdadero o falso.').toBoolean(),
];

const validarCargarDeuda = [
  body('id_concepto').isInt({ min: 1 }).withMessage('Elegí un concepto.'),
  campoMonto('monto'),
  body('fecha_vencimiento').isDate({ format: 'YYYY-MM-DD', strictMode: true }).withMessage('La fecha de vencimiento debe ser una fecha válida (AAAA-MM-DD).'),
  body('periodo_mes').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1, max: 12 }).withMessage('El mes debe estar entre 1 y 12.'),
  body('periodo_anio').optional({ nullable: true, checkFalsy: true }).isInt({ min: 2000, max: 2100 }).withMessage('El año no es válido.'),
  body('descripcion').optional({ nullable: true }).isString().trim().isLength({ max: 150 }).withMessage('La descripción no puede superar 150 caracteres.'),
  body('id_jugador').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('Jugador inválido.'),
  body('id_equipo').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('Equipo inválido.'),
  body().custom((b) => Boolean(b?.id_jugador) || Boolean(b?.id_equipo)).withMessage('Elegí un jugador o un equipo.'),
  // Con jugador, el equipo es opcional (para que la deuda aparezca en la planilla de ese equipo);
  // sin jugador, el equipo es el destino. Las dos cosas no pueden faltar a la vez (regla de arriba).
];

const validarRegistrarPago = [
  param('id').optional().isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo.'),
  campoMonto('monto'),
  body('metodo_pago').isIn(['Efectivo', 'Transferencia', 'MercadoPago', 'Débito', 'Crédito', 'Otro', 'Canje']).withMessage('Método de pago inválido.'),
  body('fecha_pago').optional({ nullable: true, checkFalsy: true }).isDate({ format: 'YYYY-MM-DD', strictMode: true }).withMessage('La fecha de pago debe ser una fecha válida (AAAA-MM-DD).'),
  body('observaciones').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('Máximo 500 caracteres.'),
  body('referencia').optional({ nullable: true }).isString().withMessage('La referencia debe ser texto.')
    .isLength({ max: 100 }).withMessage('La referencia no puede superar 100 caracteres.'),
  body('recibido_por').optional({ nullable: true }).isString().withMessage('"Recibido por" debe ser texto.')
    .isLength({ max: 100 }).withMessage('"Recibido por" no puede superar 100 caracteres.'),
];

const validarMotivo = [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo.'),
  body('motivo').isString().trim().notEmpty().withMessage('Indicá el motivo.').isLength({ max: 500 }).withMessage('Máximo 500 caracteres.'),
];

// ─── CLASIFICACIÓN ────────────────────────────────────────────────────────────
const validarIdDivisionParam = [
  param('id_division').isInt({ min: 1 }).withMessage('El ID de la división debe ser un número entero positivo.'),
];

const validarAjusteClasificacion = [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo.'),
  body('puntos').isInt({ min: -999, max: 999 }).withMessage('Los puntos deben ser un número entero.'),
  ...['partidos_ganados', 'partidos_empatados', 'partidos_perdidos'].map((campo) =>
    body(campo).isInt({ min: 0, max: 999 }).withMessage('Los partidos deben ser un número entero de 0 o más.')
  ),
  ...['goles_a_favor', 'goles_en_contra'].map((campo) =>
    body(campo).isInt({ min: 0, max: 9999 }).withMessage('Los goles deben ser un número entero de 0 o más.')
  ),
  body('motivo').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('El motivo no puede superar los 500 caracteres.'),
  // Valores "según partidos" que vio el formulario: el controller los compara con los actuales.
  body('base').isObject().withMessage('Faltan los valores de referencia de la fila. Recargá la página.'),
  ...['puntos', 'partidos_ganados', 'partidos_empatados', 'partidos_perdidos', 'goles_a_favor', 'goles_en_contra'].map((campo) =>
    body(`base.${campo}`).isInt().withMessage('Faltan los valores de referencia de la fila. Recargá la página.')
  ),
];

module.exports = {
  validarAjusteClasificacion,
  validarIdDivisionParam,
  validarActualizarSede,
  validarConcepto,
  validarActualizarConcepto,
  validarCargarDeuda,
  validarRegistrarPago,
  validarMotivo,
  validarLogin,
  validarRegistro,
  validarCambioContrasena,
  validarCrearDivision,
  validarIdParam,
  validarCrearEquipo,
  validarLogoUrl,
  validarSubirLogo,
  validarCrearJugador,
  validarActualizarJugador,
  validarCrearPartido,
  validarCrearSede,
};
