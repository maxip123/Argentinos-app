/**
 * Seed de demostración: deja la base como si el club ya la estuviera usando.
 *
 * Uso:  node scripts/seed_demo.js --reset
 *
 * BORRA todos los datos deportivos y financieros (conserva solo el usuario
 * de ADMIN_EMAIL, definido en backend/.env) y carga una temporada completa. Los torneos
 * terminados se archivan con los mismos handlers que usa el panel
 * (finalizarYArchivarTorneo + iniciarNuevaEdicion), por eso corre en fases.
 * Si una fase falla a mitad, volver a correr con --reset.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getPool, withTransaction } = require('../config/db');
const { finalizarYArchivarTorneo, iniciarNuevaEdicion } = require('../controllers/division.controller');

const EMAIL_ADMIN = process.env.ADMIN_EMAIL;

// ─── Azar reproducible ────────────────────────────────────────────────────────
let semilla = 20261029;
const rand = () => {
  semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const randInt = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const mezclar = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pickPeso = (items, peso) => {
  const total = items.reduce((s, x) => s + peso(x), 0);
  let r = rand() * total;
  for (const x of items) {
    r -= peso(x);
    if (r <= 0) return x;
  }
  return items[items.length - 1];
};
const poisson = (l) => {
  const L = Math.exp(-l);
  let k = 0;
  let p = 1;
  do { k++; p *= rand(); } while (p > L);
  return k - 1;
};
const redondear = (n, paso = 500) => Math.round(n / paso) * paso;

// ─── Fechas (hora de Argentina, UTC-3) ───────────────────────────────────────
const DIA = 86400000;
const civil = (y, m, d) => Date.UTC(y, m - 1, d);
const conHora = (dia, h, min = 0) => new Date(dia + (h + 3) * 3600000 + min * 60000);
const isoFecha = (ms) => new Date(ms).toISOString().slice(0, 10);
const AHORA = new Date();
const HOY = (() => {
  const t = new Date(AHORA.getTime() - 3 * 3600000);
  return civil(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
})();
const Y = new Date(HOY).getUTCFullYear();
const MES_ACTUAL = new Date(HOY).getUTCMonth() + 1;
const ULTIMO_SABADO = (() => {
  let d = HOY - DIA;
  while (new Date(d).getUTCDay() !== 6) d -= DIA;
  return d;
})();
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// ─── Catálogos ───────────────────────────────────────────────────────────────
const NOMBRES_M = ['Lucas', 'Mateo', 'Santiago', 'Benjamín', 'Thiago', 'Joaquín', 'Tomás', 'Facundo', 'Nicolás', 'Agustín', 'Franco', 'Lautaro', 'Ignacio', 'Valentín', 'Gonzalo', 'Matías', 'Juan Cruz', 'Bautista', 'Emiliano', 'Ezequiel', 'Federico', 'Leandro', 'Maximiliano', 'Rodrigo', 'Gastón', 'Marcos', 'Ramiro', 'Nahuel', 'Brian', 'Axel', 'Iván', 'Julián', 'Martín', 'Pablo', 'Cristian', 'Sebastián', 'Alan', 'Enzo'];
const NOMBRES_F = ['Sofía', 'Valentina', 'Martina', 'Camila', 'Lucía', 'Agustina', 'Florencia', 'Milagros', 'Micaela', 'Rocío', 'Julieta', 'Antonella', 'Candela', 'Abril', 'Paula', 'Carolina', 'Belén', 'Daiana', 'Brenda', 'Aldana'];
const APELLIDOS = ['González', 'Rodríguez', 'Gómez', 'Fernández', 'López', 'Díaz', 'Martínez', 'Pérez', 'Romero', 'Sosa', 'Álvarez', 'Ruiz', 'Juárez', 'Medina', 'Herrera', 'Aguirre', 'Paz', 'Ledesma', 'Villagra', 'Albornoz', 'Córdoba', 'Carrizo', 'Navarro', 'Ibáñez', 'Toledo', 'Barrionuevo', 'Costilla', 'Acosta', 'Molina', 'Figueroa', 'Robles', 'Campos', 'Coronel', 'Ponce', 'Vega', 'Quiroga', 'Luna', 'Moreno', 'Salas', 'Arias'];
const ARBITROS = ['Carlos Villagra', 'Miguel Ángel Paz', 'Jorge Sosa', 'Ricardo Juárez', 'Luis Herrera', 'Daniel Aguirre'];
const PLANILLEROS = ['Silvia Molina', 'Oscar Campos', 'Andrea Luna'];
const POS12 = ['Arquero', 'Arquero', 'Cierre', 'Cierre', 'Ala', 'Ala', 'Ala', 'Ala', 'Pívot', 'Pívot', 'Universal', 'Universal'];
const TITULARES12 = new Set([0, 2, 4, 5, 8]);
const PESO_GOL = { 'Pívot': 4, 'Ala': 3, 'Universal': 3, 'Cierre': 1.5, 'Arquero': 0.08 };

const SEDES = [
  { nombre: 'Predio Central Argentinos del Norte', direccion: 'Av. Benjamín Aráoz 650, San Miguel de Tucumán', propia: true },
  { nombre: 'Polideportivo Municipal de Yerba Buena', direccion: 'Av. Aconquija 1800, Yerba Buena', propia: false },
  { nombre: 'Gimnasio Juventud Alberdi', direccion: 'Calle 25 de Mayo 300, Juan Bautista Alberdi', propia: false },
  { nombre: 'Estadio Cubierto Banda del Río Salí', direccion: 'Av. Independencia 950, Banda del Río Salí', propia: false },
];

const rival = (key, nombre, corto, fuerza) => ({ key, nombre, corto, arg: false, fuerza });
const DIVISIONES = {
  PRIMERA: {
    nombre: 'Primera División - Clausura', categoria: 'Primera', genero: 'Masculino', temporada: Y - 1, hora: 19,
    equipos: [
      { key: 'AZUL', nombre: 'Argentinos del Norte Azul (A)', corto: 'ARG Azul', arg: true, fuerza: 1.0 },
      { key: 'BLANCO', nombre: 'Argentinos del Norte Blanco (B)', corto: 'ARG Blanco', arg: true, fuerza: 0.35 },
      rival('P_DYB', 'Deportivo Yerba Buena', 'DYB', 0.6),
      rival('P_SMT', 'San Martín de Tafí Viejo', 'SMT', 0.45),
      rival('P_UBR', 'Unión Banda del Río Salí', 'UBR', 0.1),
      rival('P_JAF', 'Juventud Alberdi Futsal', 'JAF', 0.2),
      rival('P_SFA', 'Sportivo Famaillá', 'SFA', -0.2),
      rival('P_ALU', 'Atlético Lules', 'ALU', -0.35),
    ],
  },
  FEMENINO: {
    nombre: 'Femenino Primera - Apertura', categoria: 'Primera', genero: 'Femenino', temporada: Y, hora: 17,
    equipos: [
      { key: 'FEM', nombre: 'Argentinos del Norte Femenino', corto: 'ARG Fem', arg: true, fuerza: 0.7 },
      rival('F_LEO', 'Las Leonas Futsal', 'LEO', 0.8),
      rival('F_DYB', 'Deportivo Yerba Buena Femenino', 'DYB', 0.5),
      rival('F_JAF', 'Juventud Alberdi Femenino', 'JAF', 0),
      rival('F_SMT', 'San Martín de Tafí Viejo Femenino', 'SMT', -0.1),
      rival('F_CSC', 'Club Social Concepción Femenino', 'CSC', -0.4),
    ],
  },
  RESERVA: {
    nombre: 'Reserva - Clausura', categoria: 'Reserva', genero: 'Masculino', temporada: Y, hora: 16, minuto: 30,
    equipos: [
      { key: 'RES', nombre: 'Argentinos del Norte Reserva', corto: 'ARG Res', arg: true, fuerza: 0.8 },
      rival('R_DYB', 'Deportivo Yerba Buena Reserva', 'DYB', 0.5),
      rival('R_SMT', 'San Martín de Tafí Viejo Reserva', 'SMT', 0.3),
      rival('R_JAF', 'Juventud Alberdi Reserva', 'JAF', 0),
      rival('R_ALU', 'Atlético Lules Reserva', 'ALU', -0.2),
      rival('R_UBR', 'Unión Banda del Río Salí Reserva', 'UBR', -0.4),
    ],
  },
  SUB17: {
    nombre: 'Sub-17 Juveniles - Clausura', categoria: 'Sub-17', genero: 'Masculino', temporada: Y, hora: 15,
    equipos: [
      { key: 'SUB17', nombre: 'Argentinos del Norte Sub-17', corto: 'ARG Sub17', arg: true, fuerza: 0.2 },
      rival('S_DYB', 'Deportivo Yerba Buena Sub-17', 'DYB', 0.4),
      rival('S_EFT', 'Escuela de Futsal Tafí', 'EFT', 0.3),
      rival('S_SFA', 'Sportivo Famaillá Sub-17', 'SFA', 0.1),
      rival('S_ALU', 'Atlético Lules Sub-17', 'ALU', -0.1),
      rival('S_CSC', 'Club Social Concepción Sub-17', 'CSC', -0.3),
    ],
  },
  VERANO: {
    nombre: 'Copa de Verano', categoria: 'Libre', genero: 'Masculino', temporada: Y, hora: 20,
    equipos: [
      { key: 'VERANO', nombre: 'Argentinos del Norte (Copa de Verano)', corto: 'ARG', arg: true, fuerza: 0.8 },
      rival('V_ALU', 'Atlético Lules', 'ALU', 0),
      rival('V_SFA', 'Sportivo Famaillá', 'SFA', 0.2),
      rival('V_CSC', 'Club Social Concepción', 'CSC', -0.1),
    ],
  },
};

// ─── Utilidades de base ──────────────────────────────────────────────────────
async function insertar(client, tabla, filas, devolver) {
  if (filas.length === 0) return [];
  const cols = Object.keys(filas[0]);
  const tam = Math.max(1, Math.floor(20000 / cols.length));
  const salida = [];
  for (let i = 0; i < filas.length; i += tam) {
    const params = [];
    const values = filas.slice(i, i + tam).map((f) =>
      `(${cols.map((c) => { params.push(f[c] === undefined ? null : f[c]); return `$${params.length}`; }).join(',')})`
    );
    const sql = `INSERT INTO public.${tabla} (${cols.join(',')}) VALUES ${values.join(',')}${devolver ? ` RETURNING ${devolver}` : ''}`;
    const { rows } = await client.query(sql, params);
    salida.push(...rows);
  }
  return salida;
}

async function llamarHandler(handler, id, body = {}) {
  let estado = 0;
  let cuerpo = null;
  const res = {
    status(c) { estado = c; return this; },
    json(b) { cuerpo = b; return this; },
  };
  await handler({ params: { id: String(id) }, body }, res);
  if (!cuerpo?.ok) throw new Error(`${handler.name} falló (${estado}): ${cuerpo?.mensaje} ${cuerpo?.detalle || ''}`);
  return cuerpo.data;
}

// ─── Estado en memoria ───────────────────────────────────────────────────────
const ids = { sede: [], division: {}, equipo: {} };
const equipoPorKey = {};
const planteles = {};
const jugadores = [];
const partidosClubCaja = [];

const nombresUsados = new Set();
const dnisUsados = new Set();
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '');

function crearJugador(genero, anioDesde, anioHasta, extra = {}) {
  let nombre;
  let apellido;
  do {
    nombre = pick(genero === 'F' ? NOMBRES_F : NOMBRES_M);
    apellido = pick(APELLIDOS);
  } while (nombresUsados.has(nombre + apellido));
  nombresUsados.add(nombre + apellido);
  const anio = randInt(anioDesde, anioHasta);
  let dni;
  do {
    dni = String(20000000 + (anio - 1970) * 750000 + randInt(0, 700000));
  } while (dnisUsados.has(dni));
  dnisUsados.add(dni);
  const j = {
    nombre,
    apellido,
    dni,
    fecha_nacimiento: `${anio}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
    telefono: `381-${randInt(400, 699)}-${randInt(1000, 9999)}`,
    email: rand() < 0.75 ? `${slug(nombre)}.${slug(apellido)}${randInt(1, 99)}@example.com` : null,
    ...extra,
  };
  jugadores.push(j);
  return j;
}

function agregarAPlantel(equipoKey, jugador, posicion, { titular = false, ex = false, desde2026 = false } = {}) {
  if (!planteles[equipoKey]) planteles[equipoKey] = [];
  planteles[equipoKey].push({ jugador, posicion, titular, ex, desde2026 });
}

function armarPlanteles() {
  const plantelCompleto = (key, genero, desde, hasta, opciones = {}) => {
    POS12.forEach((pos, i) => {
      const j = crearJugador(genero, desde, hasta, { principal: key });
      agregarAPlantel(key, j, pos, { titular: TITULARES12.has(i), desde2026: opciones.desde2026?.includes(i) });
    });
  };

  plantelCompleto('AZUL', 'M', 1992, 2004, { desde2026: [5, 9] });
  agregarAPlantel('AZUL', crearJugador('M', 1990, 1999, { principal: 'AZUL', es_inactivo: true }), 'Ala', { ex: true });
  agregarAPlantel('AZUL', crearJugador('M', 1990, 1999, { principal: 'AZUL', es_inactivo: true }), 'Pívot', { ex: true });

  plantelCompleto('RES', 'M', 2003, 2007);
  const posBlanco = ['Arquero', 'Arquero', 'Cierre', 'Cierre', 'Ala', 'Ala', 'Pívot', 'Universal'];
  posBlanco.forEach((pos, i) => {
    const j = crearJugador('M', 1995, 2004, { principal: 'BLANCO' });
    agregarAPlantel('BLANCO', j, pos, { titular: [0, 2, 4, 6].includes(i), desde2026: i === 5 });
  });
  for (const r of planteles.RES.filter((x) => ['Ala', 'Pívot', 'Universal'].includes(x.posicion)).slice(0, 4)) {
    agregarAPlantel('BLANCO', r.jugador, r.posicion);
  }
  agregarAPlantel('BLANCO', crearJugador('M', 1991, 1998, { principal: 'BLANCO', es_inactivo: true }), 'Cierre', { ex: true });

  plantelCompleto('SUB17', 'M', 2009, 2010);
  plantelCompleto('FEM', 'F', 1994, 2006);

  const verano = mezclar([...planteles.AZUL, ...planteles.BLANCO].filter((x) => !x.ex && x.jugador.principal !== 'RES'));
  const arq = verano.filter((x) => x.posicion === 'Arquero').slice(0, 2);
  const campo = verano.filter((x) => x.posicion !== 'Arquero').slice(0, 8);
  [...arq, ...campo].forEach((x, i) => agregarAPlantel('VERANO', x.jugador, x.posicion, { titular: i === 0 || (i >= 2 && i < 6) }));
}

// ─── Simulación de partidos ──────────────────────────────────────────────────
function fixtureTodosContraTodos(equipos) {
  const t = mezclar(equipos);
  if (t.length % 2) t.push(null);
  const n = t.length;
  const fechas = [];
  for (let r = 0; r < n - 1; r++) {
    const cruces = [];
    for (let i = 0; i < n / 2; i++) {
      const a = t[i];
      const b = t[n - 1 - i];
      if (a && b) cruces.push((r + i) % 2 === 0 ? [a, b] : [b, a]);
    }
    fechas.push(cruces);
    t.splice(1, 0, t.pop());
  }
  return fechas;
}

function resultado(fl, fv) {
  const lam = (a, b) => Math.min(7, Math.max(0.5, 3 * Math.exp((a - b) * 0.55)));
  return [poisson(lam(fl + 0.15, fv)), poisson(lam(fv, fl + 0.15))];
}

function sedePara(local) {
  if (local.arg) return ids.sede[0];
  const h = [...local.nombre].reduce((s, c) => s + c.charCodeAt(0), 0);
  return ids.sede[1 + (h % 3)];
}

function plantelEdicion(equipoKey, edicion) {
  const p = planteles[equipoKey] || [];
  return edicion === 'pasada' ? p.filter((x) => !x.desde2026) : p.filter((x) => !x.ex);
}

function generarEstadisticas(roster, goles, idPartido, idEquipo, jornada, ctx) {
  const arqueros = mezclar(roster.filter((r) => r.posicion === 'Arquero'));
  const campo = mezclar(roster.filter((r) => r.posicion !== 'Arquero')).slice(0, randInt(8, 10));
  const jugaron = [arqueros[0], ...(arqueros[1] && rand() < 0.2 ? [arqueros[1]] : []), ...campo].filter(Boolean);

  const golesPor = new Map();
  const asistPor = new Map();
  for (let g = 0; g < goles; g++) {
    const autor = pickPeso(jugaron, (r) => PESO_GOL[r.posicion]);
    golesPor.set(autor, (golesPor.get(autor) || 0) + 1);
    if (rand() < 0.65) {
      const otros = jugaron.filter((r) => r !== autor && r.posicion !== 'Arquero');
      if (otros.length) {
        const asistente = pickPeso(otros, (r) => PESO_GOL[r.posicion]);
        asistPor.set(asistente, (asistPor.get(asistente) || 0) + 1);
      }
    }
  }

  const filas = [];
  const sanciones = [];
  for (const r of jugaron) {
    const titular = r === arqueros[0] || r.titular;
    let amarillas = 0;
    let rojas = 0;
    let motivo = null;
    let fechasSusp = 0;
    if (rand() < 0.11) {
      amarillas = 1;
      if (rand() < 0.07) { amarillas = 2; rojas = 1; motivo = 'Doble amarilla'; fechasSusp = 1; }
    } else if (rand() < 0.012) {
      rojas = 1; motivo = 'Roja directa por juego brusco grave'; fechasSusp = 2;
    }
    filas.push({
      id_partido: idPartido,
      id_jugador: r.jugador.id,
      id_equipo: idEquipo,
      goles: golesPor.get(r) || 0,
      tarjetas_amarillas: amarillas,
      tarjetas_rojas: rojas,
      minutos_jugados: titular ? randInt(22, 40) : randInt(4, 20),
      es_titular: titular,
      asistencias: asistPor.get(r) || 0,
    });
    if (rojas) {
      const cumplidas = ctx.archivada ? fechasSusp : Math.min(fechasSusp, Math.max(0, ctx.jornadasJugadas - jornada));
      sanciones.push({
        id_jugador: r.jugador.id,
        id_partido_origen: idPartido,
        motivo,
        fechas_suspension: fechasSusp,
        fechas_cumplidas: cumplidas,
      });
    }
  }
  return { filas, sanciones };
}

/**
 * Inserta el fixture de una edición, sus estadísticas y sanciones.
 * jugadas: cuántas fechas ya se disputaron (el resto queda programado).
 */
async function jugarEdicion(client, divKey, { edicion, fechaJornada, jugadas, fuerzas = {}, suspender = false, registrarCaja = false }) {
  const def = DIVISIONES[divKey];
  const idDivision = ids.division[divKey];
  const equipos = def.equipos.map((e) => ({ ...e, fuerza: fuerzas[e.key] ?? e.fuerza, id: ids.equipo[e.key] }));
  const fechas = fixtureTodosContraTodos(equipos);
  const archivada = jugadas >= fechas.length;

  const filas = [];
  let suspendido = false;
  fechas.forEach((cruces, idx) => {
    const jornada = idx + 1;
    const dia = fechaJornada(jornada);
    cruces.forEach(([local, visita], i) => {
      const fecha = conHora(dia, def.hora, (def.minuto || 0) + i * 75);
      let estado = jornada <= jugadas ? 2 : 0;
      let gl = 0;
      let gv = 0;
      let observaciones = null;
      if (estado === 2 && suspender && !suspendido && jornada === 3 && !local.arg && !visita.arg) {
        estado = 3;
        suspendido = true;
        observaciones = 'Suspendido por corte de luz en el estadio. A reprogramar.';
      } else if (estado === 2) {
        [gl, gv] = resultado(local.fuerza, visita.fuerza);
      }
      const clasico = local.arg && visita.arg;
      filas.push({
        id_division: idDivision,
        id_sede: sedePara(local),
        id_equipo_local: local.id,
        id_equipo_visitante: visita.id,
        fecha_partido: fecha,
        jornada_numero: jornada,
        nombre_partido: clasico ? `Fecha ${jornada} - Clásico Azul vs Blanco` : `Fecha ${jornada}`,
        goles_local: gl,
        goles_visitante: gv,
        estado_partido: estado,
        afecta_clasificacion: true,
        datos_adicionales: JSON.stringify({ arbitro: pick(ARBITROS), planillero: pick(PLANILLEROS) }),
        observaciones,
      });
      if (registrarCaja && estado === 2) {
        for (const lado of [local, visita].filter((e) => e.arg)) {
          partidosClubCaja.push({
            fecha,
            divKey,
            jornada,
            esLocal: lado === local,
            rival: (lado === local ? visita : local).nombre,
            yaContado: clasico && lado === visita,
          });
        }
      }
    });
  });

  const insertados = await insertar(client, 'partido', filas, 'id_partido, id_equipo_local, id_equipo_visitante, jornada_numero');
  const idPorCruce = new Map(insertados.map((p) => [`${p.id_equipo_local}-${p.id_equipo_visitante}-${p.jornada_numero}`, p.id_partido]));

  const stats = [];
  const sanciones = [];
  const ctx = { archivada, jornadasJugadas: jugadas };
  for (const f of filas.filter((x) => x.estado_partido === 2)) {
    const idPartido = idPorCruce.get(`${f.id_equipo_local}-${f.id_equipo_visitante}-${f.jornada_numero}`);
    for (const [idEquipo, goles] of [[f.id_equipo_local, f.goles_local], [f.id_equipo_visitante, f.goles_visitante]]) {
      const eq = equipos.find((e) => e.id === idEquipo);
      if (!eq.arg) continue;
      const r = generarEstadisticas(plantelEdicion(eq.key, edicion), goles, idPartido, idEquipo, f.jornada_numero, ctx);
      stats.push(...r.filas);
      sanciones.push(...r.sanciones);
    }
  }
  await insertar(client, 'partido_estadistica_jugador', stats);
  await insertar(client, 'sancion_jugador', sanciones);

  const tabla = new Map(equipos.map((e) => [e.id, { ...e, pts: 0, gf: 0, gc: 0 }]));
  for (const f of filas.filter((x) => x.estado_partido === 2)) {
    const l = tabla.get(f.id_equipo_local);
    const v = tabla.get(f.id_equipo_visitante);
    l.gf += f.goles_local; l.gc += f.goles_visitante;
    v.gf += f.goles_visitante; v.gc += f.goles_local;
    if (f.goles_local > f.goles_visitante) l.pts += 3;
    else if (f.goles_local < f.goles_visitante) v.pts += 3;
    else { l.pts += 1; v.pts += 1; }
  }
  const posiciones = [...tabla.values()].sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf);
  return { posiciones, partidos: filas.length, estadisticas: stats.length };
}

function definirLlave(a, b, ganaARG) {
  let ganador;
  if (a.arg !== b.arg) ganador = (a.arg === ganaARG) ? a : b;
  else ganador = rand() < 0.5 + (a.fuerza - b.fuerza) * 0.3 ? a : b;
  const perdedor = ganador === a ? b : a;
  const empate = rand() < 0.2;
  const gGan = randInt(2, 6);
  const gPer = empate ? gGan : randInt(0, gGan - 1);
  const pGan = empate ? randInt(4, 5) : null;
  const pPer = empate ? randInt(2, pGan - 1) : null;
  const golesDe = (e) => (e === ganador ? gGan : gPer);
  const penalesDe = (e) => (e === ganador ? pGan : pPer);
  return {
    ganador,
    fila: {
      id_equipo_local: a.id,
      id_equipo_visitante: b.id,
      goles_local: golesDe(a),
      goles_visitante: golesDe(b),
      penales_local: penalesDe(a),
      penales_visitante: penalesDe(b),
      estado_partido: 2,
      id_equipo_ganador: ganador.id,
    },
  };
}

async function jugarPlayoffs(client, divKey, posiciones, { campeonARG, soloFinal = false }) {
  const idDivision = ids.division[divKey];
  const base = { id_division: idDivision, activo: true };
  if (soloFinal) {
    const final = definirLlave(posiciones[0], posiciones[1], campeonARG);
    await insertar(client, 'llave_playoff', [{ ...base, fase: 'Final', orden: 1, ...final.fila }]);
    return final.ganador;
  }
  const s1 = definirLlave(posiciones[0], posiciones[3], true);
  const s2 = definirLlave(posiciones[1], posiciones[2], true);
  const final = definirLlave(s1.ganador, s2.ganador, campeonARG);
  const [{ id_llave }] = await insertar(client, 'llave_playoff', [{ ...base, fase: 'Final', orden: 1, ...final.fila }], 'id_llave');
  await insertar(client, 'llave_playoff', [
    { ...base, fase: 'Semifinal', orden: 1, ...s1.fila, id_llave_siguiente: id_llave, es_local_siguiente: true },
    { ...base, fase: 'Semifinal', orden: 2, ...s2.fila, id_llave_siguiente: id_llave, es_local_siguiente: false },
  ]);
  return final.ganador;
}

const semanal = (inicio) => (j) => inicio + (j - 1) * 7 * DIA;
const enCurso = (jugadas) => (j) => ULTIMO_SABADO - (jugadas - j) * 7 * DIA;

// ─── Fase 0: limpieza ────────────────────────────────────────────────────────
async function limpiar(client) {
  // Sin este control, un ADMIN_EMAIL mal escrito dejaría la base sin ningún usuario
  const { rows: admins } = await client.query(`SELECT 1 FROM public.perfil_usuario WHERE email = $1`, [EMAIL_ADMIN]);
  if (admins.length === 0) throw new Error('ADMIN_EMAIL no coincide con ningún usuario: no se borró nada');

  await client.query(`DELETE FROM public.perfil_usuario WHERE email <> $1`, [EMAIL_ADMIN]);
  await client.query(`UPDATE public.perfil_usuario SET id_division_asignada = NULL`);
  await client.query(`UPDATE public.division SET id_equipo_campeon = NULL`);
  const orden = [
    ['partido_estadistica_jugador', 'id_estadistica'], ['sancion_jugador', 'id_sancion'], ['llave_playoff', 'id_llave'],
    ['clasificacion', 'id_clasificacion'], ['historial_torneo', 'id_historial'], ['cuota_jugador', 'id_cuota'],
    ['gasto_club', 'id_gasto'], ['equipo_jugador', 'id_equipo_jugador'], ['equipo_cuerpo_tecnico', 'id_equipo_cuerpo_tecnico'],
    ['cuerpo_tecnico', 'id_cuerpo_tecnico'], ['partido', 'id_partido'], ['jugador', 'id_jugador'], ['equipo', 'id_equipo'],
    ['division', 'id_division'], ['sede', 'id_sede'],
  ];
  for (const [tabla] of orden) await client.query(`DELETE FROM public.${tabla}`);
  for (const [tabla, col] of orden) await client.query(`ALTER TABLE public.${tabla} ALTER COLUMN ${col} RESTART WITH 1`);
}

// ─── Fase A: estructura + torneos 2025 y Copa de Verano ─────────────────────
async function cargarEstructura(client) {
  const sedes = await insertar(client, 'sede', SEDES.map((s) => ({
    nombre_sede: s.nombre,
    direccion: s.direccion,
    google_maps_url: `https://maps.google.com/?q=${encodeURIComponent(s.direccion)}`,
    es_sede_propia: s.propia,
  })), 'id_sede');
  ids.sede = sedes.map((s) => s.id_sede);

  for (const [key, d] of Object.entries(DIVISIONES)) {
    const [{ id_division }] = await insertar(client, 'division', [{
      nombre_division: d.nombre, categoria: d.categoria, genero: d.genero, temporada: d.temporada,
    }], 'id_division');
    ids.division[key] = id_division;
    const eqs = await insertar(client, 'equipo', d.equipos.map((e) => ({
      id_division, nombre_equipo: e.nombre, nombre_corto: e.corto, es_argentinos_del_norte: e.arg,
    })), 'id_equipo, nombre_equipo');
    for (const e of d.equipos) {
      ids.equipo[e.key] = eqs.find((x) => x.nombre_equipo === e.nombre).id_equipo;
      equipoPorKey[e.key] = { ...e, divKey: key };
    }
  }

  armarPlanteles();
  const filasJug = jugadores.map((j) => ({
    id_equipo: ids.equipo[j.principal],
    id_division: ids.division[equipoPorKey[j.principal].divKey],
    nombre: j.nombre, apellido: j.apellido, dni: j.dni, fecha_nacimiento: j.fecha_nacimiento,
    telefono: j.telefono, email: j.email, es_jugador_club: true, es_inactivo: Boolean(j.es_inactivo),
  }));
  const insJug = await insertar(client, 'jugador', filasJug, 'id_jugador, dni');
  const idPorDni = new Map(insJug.map((r) => [r.dni, r.id_jugador]));
  for (const j of jugadores) j.id = idPorDni.get(j.dni);

  const filasPlantel = [];
  for (const [key, plantel] of Object.entries(planteles)) {
    const libres = mezclar([...Array(24).keys()].map((n) => n + 2).filter((n) => n !== 12));
    let arqueros = 0;
    for (const p of plantel) {
      const camiseta = p.posicion === 'Arquero' && arqueros < 2 ? [1, 12][arqueros++] : libres.pop();
      filasPlantel.push({
        id_equipo: ids.equipo[key],
        id_jugador: p.jugador.id,
        numero_camiseta: camiseta,
        posicion: p.posicion,
        es_titular_habitual: p.titular,
        fecha_alta: p.desde2026 ? `${Y}-01-15` : `${randInt(Y - 3, Y - 1)}-${String(randInt(2, 11)).padStart(2, '0')}-01`,
        activo: !p.ex,
      });
    }
  }
  await insertar(client, 'equipo_jugador', filasPlantel);

  const staff = [
    ['Raúl', 'Medina', 'Director Técnico', [['AZUL', 'Director Técnico'], ['VERANO', 'Director Técnico']]],
    ['Hernán', 'Carrizo', 'Director Técnico', [['BLANCO', 'Director Técnico']]],
    ['Diego', 'Albornoz', 'Director Técnico', [['RES', 'Director Técnico']]],
    ['Marcelo', 'Ledesma', 'Director Técnico', [['SUB17', 'Director Técnico']]],
    ['Gabriela', 'Ruiz', 'Directora Técnica', [['FEM', 'Directora Técnica']]],
    ['Sergio', 'Navarro', 'Preparador Físico', [['AZUL', 'Preparador Físico'], ['BLANCO', 'Preparador Físico'], ['RES', 'Preparador Físico']]],
    ['Pablo', 'Toledo', 'Entrenador de Arqueros', [['AZUL', 'Entrenador de Arqueros'], ['BLANCO', 'Entrenador de Arqueros']]],
    ['Natalia', 'Ponce', 'Kinesióloga', [['AZUL', 'Kinesióloga'], ['FEM', 'Kinesióloga']]],
    ['Lucía', 'Robles', 'Ayudante de Campo', [['FEM', 'Ayudante de Campo']]],
  ];
  const insStaff = await insertar(client, 'cuerpo_tecnico', staff.map(([nombre, apellido, rol, eqs]) => ({
    id_equipo: ids.equipo[eqs[0][0]], nombre, apellido,
    dni: String(randInt(22000000, 34000000)), telefono: `381-${randInt(400, 699)}-${randInt(1000, 9999)}`,
    email: `${slug(nombre)}.${slug(apellido)}@example.com`, es_club: true, rol_principal: rol,
  })), 'id_cuerpo_tecnico');
  await insertar(client, 'equipo_cuerpo_tecnico', staff.flatMap(([, , , eqs], i) =>
    eqs.map(([key, rol]) => ({ id_equipo: ids.equipo[key], id_cuerpo_tecnico: insStaff[i].id_cuerpo_tecnico, rol_en_equipo: rol }))
  ));

  await jugarEdicion(client, 'PRIMERA', {
    edicion: 'pasada', fechaJornada: semanal(civil(Y - 1, 8, 9)), jugadas: 7,
    fuerzas: { P_DYB: 1.2, AZUL: 0.55 },
  });
  const verano = await jugarEdicion(client, 'VERANO', {
    edicion: 'actual', fechaJornada: semanal(civil(Y, 2, 7)), jugadas: 3, registrarCaja: true,
  });
  await jugarPlayoffs(client, 'VERANO', verano.posiciones, { campeonARG: true, soloFinal: true });
}

// ─── Fase B: Apertura del año (Primera y Femenino) ──────────────────────────
async function cargarApertura(client) {
  const primera = await jugarEdicion(client, 'PRIMERA', {
    edicion: 'actual', fechaJornada: semanal(civil(Y, 3, 14)), jugadas: 7, registrarCaja: true,
  });
  await jugarPlayoffs(client, 'PRIMERA', primera.posiciones, { campeonARG: true });
  const fem = await jugarEdicion(client, 'FEMENINO', {
    edicion: 'actual', fechaJornada: semanal(civil(Y, 3, 14)), jugadas: 5, registrarCaja: true,
  });
  await jugarPlayoffs(client, 'FEMENINO', fem.posiciones, { campeonARG: false });
}

// ─── Fase C: Clausura en curso, cuotas y caja ───────────────────────────────
const CUOTA = (divKey, mes) => (divKey === 'SUB17' ? (mes <= 6 ? 12000 : 14000) : (mes <= 6 ? 15000 : 18000));

function generarCuotas() {
  const activos = jugadores.filter((j) => !j.es_inactivo);
  const becados = new Set(planteles.SUB17.slice(10, 12).map((p) => p.jugador));
  const cuotas = [];
  const fichas = [];
  for (const j of activos) {
    const divKey = equipoPorKey[j.principal].divKey;
    const r = rand();
    const perfil = becados.has(j) ? 'becado' : r < 0.58 ? 'puntual' : r < 0.78 ? 'tarde' : r < 0.92 ? 'atrasado' : 'moroso';
    const impagos = perfil === 'atrasado' ? randInt(1, 2) : perfil === 'moroso' ? randInt(3, 4) : 0;
    const mesParcial = ['atrasado', 'moroso'].includes(perfil) ? randInt(3, Math.max(3, MES_ACTUAL - impagos - 1)) : null;
    let ultimoPago = null;

    for (let mes = 3; mes <= MES_ACTUAL; mes++) {
      const esperado = CUOTA(divKey, mes);
      const base = {
        id_jugador: j.id, id_division: ids.division[divKey], periodo_mes: mes, periodo_anio: Y,
        monto_esperado: esperado,
      };
      if (perfil === 'becado') {
        cuotas.push({ ...base, monto_abonado: 0, fecha_vencimiento: isoFecha(civil(Y, mes, 10)), fecha_pago: null, estado_pago: 'Exonerado/Becado', metodo_pago: null, observaciones: 'Beca deportiva juveniles' });
        continue;
      }
      const dia = perfil === 'puntual' ? randInt(1, 10) : perfil === 'tarde' ? randInt(11, 27) : randInt(3, 15);
      const fechaPago = conHora(civil(Y, mes, dia), randInt(9, 21), pick([0, 15, 30, 45]));
      const debe = mes > MES_ACTUAL - impagos || fechaPago > AHORA;
      if (debe) {
        const venc = civil(Y, mes, 10);
        cuotas.push({ ...base, monto_abonado: 0, fecha_vencimiento: isoFecha(venc), fecha_pago: null, estado_pago: venc < HOY ? 'Vencido' : 'Pendiente', metodo_pago: null, observaciones: null });
        continue;
      }
      const parcial = mes === mesParcial;
      const abonado = parcial ? esperado / 2 : esperado;
      cuotas.push({
        ...base, monto_abonado: abonado, fecha_vencimiento: isoFecha(fechaPago.getTime() - 3 * 3600000 + 31 * DIA),
        fecha_pago: fechaPago, estado_pago: parcial ? 'Parcial' : 'Pagado',
        metodo_pago: pickPeso(['Transferencia', 'MercadoPago', 'Efectivo'], (m) => ({ Transferencia: 45, MercadoPago: 25, Efectivo: 30 })[m]),
        observaciones: parcial ? 'Abonó la mitad, completa el mes próximo' : null,
      });
      ultimoPago = fechaPago;
    }
    fichas.push({
      id: j.id,
      ultimo: ultimoPago ? ultimoPago.toISOString() : null,
      venc: perfil === 'becado' ? `${Y}-12-31` : ultimoPago ? isoFecha(ultimoPago.getTime() - 3 * 3600000 + 31 * DIA) : null,
    });
  }
  return { cuotas, fichas };
}

function generarCaja(cuotas) {
  const mov = [];
  const nombreJug = new Map(jugadores.map((j) => [j.id, `${j.apellido} ${j.nombre}`]));
  for (const c of cuotas.filter((x) => x.monto_abonado > 0)) {
    mov.push({
      concepto: `Cuota - ${nombreJug.get(c.id_jugador)} - ${MESES[c.periodo_mes - 1]} ${c.periodo_anio}`,
      monto: c.monto_abonado, fecha_gasto: c.fecha_pago, categoria: 'Cuota Socio', tipo: 'INGRESO', metodo_pago: c.metodo_pago,
    });
  }

  const ingreso = (concepto, monto, fecha, categoria, metodo = 'Transferencia') => mov.push({ concepto, monto: redondear(monto), fecha_gasto: fecha, categoria, tipo: 'INGRESO', metodo_pago: metodo });
  const egreso = (concepto, monto, fecha, categoria, metodo = 'Transferencia') => mov.push({ concepto, monto: redondear(monto), fecha_gasto: fecha, categoria, tipo: 'EGRESO', metodo_pago: metodo });

  const etiqueta = { PRIMERA: 'Primera', FEMENINO: 'Femenino', RESERVA: 'Reserva', SUB17: 'Sub-17', VERANO: 'Copa de Verano' };
  for (const p of partidosClubCaja) {
    const div = etiqueta[p.divKey];
    egreso(`Arbitraje Fecha ${p.jornada} ${div} vs ${p.rival}`, p.divKey === 'PRIMERA' ? 28000 : 22000, p.fecha, 'Arbitraje', 'Efectivo');
    if (p.esLocal && !p.yaContado) {
      ingreso(`Buffet Fecha ${p.jornada} ${div}`, randInt(35, 95) * 1000, p.fecha, 'Cantina / Buffet', 'Efectivo');
      if (['PRIMERA', 'FEMENINO'].includes(p.divKey)) ingreso(`Entradas Fecha ${p.jornada} ${div} vs ${p.rival}`, randInt(20, 60) * 1000, p.fecha, 'Entradas Partido', 'Efectivo');
    } else if (!p.esLocal && ['SUB17', 'FEMENINO'].includes(p.divKey)) {
      egreso(`Traslado en combi - ${div} vs ${p.rival}`, randInt(15, 30) * 1000, p.fecha, 'Viáticos y Traslados', 'Efectivo');
    }
  }

  for (let mes = 2; mes <= MES_ACTUAL; mes++) {
    const d = (dia, h = 11) => conHora(civil(Y, mes, dia), h);
    if (mes >= 3) {
      ingreso('Sponsor camiseta - Corralón El Progreso', 250000, d(3), 'Sponsors y Publicidad');
      egreso('Honorarios preparador físico', 150000, d(5), 'Sueldos y Honorarios');
      egreso('Honorarios entrenador de arqueros', 80000, d(5), 'Sueldos y Honorarios');
      egreso('Factura de luz - Predio Central', randInt(48, 72) * 1000, d(12), 'Servicios Públicos');
      egreso('Factura de agua - Predio Central', randInt(9, 14) * 1000, d(15), 'Servicios Públicos');
    }
    if (mes >= 4) ingreso('Alquiler de cancha - Escuelita de fútbol infantil', 60000, d(6), 'Alquiler de Canchas');
    if (mes >= 7) ingreso('Cartel publicitario - Farmacia del Norte', 80000, d(4), 'Sponsors y Publicidad');
    if (mes >= 3 && rand() < 0.45) egreso(pick(['Arreglo de redes de arco', 'Pintura de líneas de la cancha', 'Reparación de luminarias', 'Limpieza de vestuarios']), randInt(25, 90) * 1000, d(randInt(16, 26)), 'Mantenimiento', 'Efectivo');
  }

  const unico = [
    [2, 2, 'EGRESO', 'Inscripción Copa de Verano', 120000, 'General'],
    [3, 2, 'EGRESO', 'Inscripción Liga AFA Tucumán - Apertura', 350000, 'General'],
    [3, 5, 'EGRESO', 'Seguro de jugadores (anual)', 420000, 'General'],
    [3, 10, 'EGRESO', 'Juego de camisetas Primera (titular y suplente)', 680000, 'Equipamiento Deportivo'],
    [4, 8, 'EGRESO', 'Pelotas de futsal x10', 240000, 'Equipamiento Deportivo'],
    [5, 16, 'INGRESO', 'Venta de camisetas réplica', 210000, 'Venta de Indumentaria'],
    [6, 5, 'EGRESO', 'Reparación techo de vestuario', 310000, 'Infraestructura'],
    [6, 20, 'INGRESO', 'Rifa aniversario del club', 520000, 'Eventos y Rifas'],
    [7, 20, 'EGRESO', 'Inscripción Liga AFA Tucumán - Clausura', 350000, 'General'],
    [8, 3, 'EGRESO', 'Pecheras y conos de entrenamiento', 65000, 'Equipamiento Deportivo'],
    [8, 22, 'INGRESO', 'Donación socio benefactor', 100000, 'Donaciones'],
    [9, 13, 'INGRESO', 'Peña folclórica a beneficio', 380000, 'Eventos y Rifas'],
  ];
  for (const [mes, dia, tipo, concepto, monto, categoria] of unico) {
    (tipo === 'INGRESO' ? ingreso : egreso)(concepto, monto, conHora(civil(Y, mes, dia), 12), categoria);
  }
  return mov.filter((m) => m.fecha_gasto <= AHORA);
}

async function cargarClausura(client) {
  const opciones = (jugadas) => ({ edicion: 'actual', fechaJornada: enCurso(jugadas), jugadas, registrarCaja: true });
  await jugarEdicion(client, 'PRIMERA', { ...opciones(5), suspender: true });
  await jugarEdicion(client, 'FEMENINO', opciones(3));
  await jugarEdicion(client, 'RESERVA', opciones(3));
  await jugarEdicion(client, 'SUB17', opciones(4));

  const { cuotas, fichas } = generarCuotas();
  await insertar(client, 'cuota_jugador', cuotas);
  const params = [];
  const values = fichas.map((f) => {
    params.push(f.id, f.ultimo, f.venc);
    return `($${params.length - 2}::bigint, $${params.length - 1}::timestamptz, $${params.length}::date)`;
  });
  await client.query(
    `UPDATE public.jugador j SET fecha_ultimo_pago = v.ultimo, fecha_vencimiento = v.venc
     FROM (VALUES ${values.join(',')}) AS v(id, ultimo, venc) WHERE j.id_jugador = v.id`,
    params
  );
  await insertar(client, 'gasto_club', generarCaja(cuotas));

  const inicioClausura = (jugadas) => isoFecha(enCurso(jugadas)(1));
  const fechas = [
    ['PRIMERA', inicioClausura(5), null], ['FEMENINO', inicioClausura(3), null],
    ['RESERVA', inicioClausura(3), null], ['SUB17', inicioClausura(4), null],
    ['VERANO', `${Y}-02-07`, `${Y}-02-28`],
  ];
  for (const [key, ini, fin] of fechas) {
    await client.query(`UPDATE public.division SET fecha_inicio = $1, fecha_fin = $2 WHERE id_division = $3`, [ini, fin, ids.division[key]]);
  }
  await client.query(`SELECT public.sincronizar_estadisticas_jugador(id_jugador) FROM public.jugador`);
  for (const key of ['PRIMERA', 'FEMENINO', 'RESERVA', 'SUB17']) {
    await client.query(`SELECT public.recalcular_clasificacion_division($1)`, [ids.division[key]]);
  }
}

async function archivar(divKey, fechaFin, siguiente) {
  const h = await llamarHandler(finalizarYArchivarTorneo, ids.division[divKey]);
  await getPool().query(`UPDATE public.historial_torneo SET fecha_finalizacion = $1 WHERE id_historial = $2`, [conHora(fechaFin, 23), h.id_historial]);
  console.log(`   archivado: ${h.nombre_torneo} ${h.temporada} (campeón: ${h.nombre_equipo_campeon})`);
  if (siguiente) {
    await llamarHandler(iniciarNuevaEdicion, ids.division[divKey], siguiente);
    console.log(`   nueva edición: ${siguiente.nombre_division} ${siguiente.temporada}`);
  }
}

// ─── Verificación ────────────────────────────────────────────────────────────
async function verificar() {
  const q = (sql) => getPool().query(sql).then((r) => r.rows);
  const problemas = [];

  const [{ n: golesMal }] = await q(`
    SELECT count(*)::int AS n FROM public.partido p
    JOIN public.equipo e ON e.id_equipo IN (p.id_equipo_local, p.id_equipo_visitante) AND e.es_argentinos_del_norte
    WHERE p.estado_partido = 2 AND COALESCE((SELECT SUM(s.goles) FROM public.partido_estadistica_jugador s
          WHERE s.id_partido = p.id_partido AND s.id_equipo = e.id_equipo), 0)
      <> CASE WHEN e.id_equipo = p.id_equipo_local THEN p.goles_local ELSE p.goles_visitante END`);
  if (golesMal) problemas.push(`${golesMal} partidos con goles de jugadores que no suman el resultado`);

  const [{ n: tablaMal }] = await q(`
    SELECT count(*)::int AS n FROM public.clasificacion
    WHERE partidos_jugados <> partidos_ganados + partidos_empatados + partidos_perdidos
       OR puntos <> 3 * partidos_ganados + partidos_empatados`);
  if (tablaMal) problemas.push(`${tablaMal} filas de clasificación inconsistentes`);

  const [caja] = await q(`
    SELECT (SELECT COALESCE(SUM(monto_abonado), 0) FROM public.cuota_jugador)::numeric AS cuotas,
           (SELECT COALESCE(SUM(monto), 0) FROM public.gasto_club WHERE categoria = 'Cuota Socio')::numeric AS caja,
           (SELECT COALESCE(SUM(CASE WHEN tipo = 'INGRESO' THEN monto ELSE -monto END), 0) FROM public.gasto_club)::numeric AS saldo,
           (SELECT count(*) FROM public.gasto_club)::int AS movimientos`);
  if (Number(caja.cuotas) !== Number(caja.caja)) problemas.push(`cuotas cobradas (${caja.cuotas}) != ingresos de caja por cuotas (${caja.caja})`);

  const historial = await q(`
    SELECT nombre_torneo, temporada, jsonb_array_length(tabla_posiciones) AS equipos,
           jsonb_array_length(partidos_resultados) AS partidos, jsonb_array_length(goleadores_club) AS goleadores,
           nombre_equipo_campeon, (resumen_estadisticas->>'total_goles')::int AS goles
    FROM public.historial_torneo ORDER BY fecha_finalizacion`);
  for (const h of historial) {
    if (!h.equipos || !h.partidos || !h.nombre_equipo_campeon) problemas.push(`historial incompleto: ${h.nombre_torneo} ${h.temporada}`);
  }

  const divisiones = await q(`
    SELECT d.nombre_division, d.temporada, d.terminado,
           (SELECT count(*) FROM public.partido p WHERE p.id_division = d.id_division AND p.activo AND p.estado_partido = 2)::int AS jugados,
           (SELECT count(*) FROM public.partido p WHERE p.id_division = d.id_division AND p.activo AND p.estado_partido = 0)::int AS programados
    FROM public.division d ORDER BY d.id_division`);
  const estados = await q(`
    SELECT CASE WHEN es_inactivo THEN 'Inactivo' WHEN fecha_vencimiento IS NULL THEN 'Sin cuota'
                WHEN fecha_vencimiento >= CURRENT_DATE THEN 'Al día' ELSE 'Pendiente' END AS estado, count(*)::int AS jugadores
    FROM public.jugador GROUP BY 1 ORDER BY 1`);

  console.log('\nDivisiones');
  console.table(divisiones);
  console.log('Historial');
  console.table(historial);
  console.log('Estado de cuotas de los jugadores');
  console.table(estados);
  console.log(`Caja: ${caja.movimientos} movimientos, saldo $${Number(caja.saldo).toLocaleString('es-AR')}`);
  return problemas;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  if (!process.argv.includes('--reset')) {
    console.log('Este script BORRA todos los datos (excepto el usuario admin) y carga datos de demo.');
    console.log('Para confirmar: node scripts/seed_demo.js --reset');
    process.exit(1);
  }
  if (!EMAIL_ADMIN) {
    console.log('Definí ADMIN_EMAIL en backend/.env: es el único usuario que se conserva.');
    process.exit(1);
  }
  const host = (process.env.DATABASE_URL || '').split('@')[1]?.split('/')[0] || '(sin DATABASE_URL)';
  console.log(`Base destino: ${host}`);

  console.log('Fase A: limpieza, estructura, Clausura pasado y Copa de Verano...');
  await withTransaction(async (client) => {
    await limpiar(client);
    await cargarEstructura(client);
  });
  await archivar('PRIMERA', civil(Y - 1, 9, 27), { nombre_division: 'Primera División - Apertura', temporada: Y });
  await archivar('VERANO', civil(Y, 2, 28));

  console.log('Fase B: Apertura...');
  await withTransaction(cargarApertura);
  await archivar('PRIMERA', civil(Y, 5, 9), { nombre_division: 'Primera División - Clausura', temporada: Y });
  await archivar('FEMENINO', civil(Y, 4, 25), { nombre_division: 'Femenino Primera - Clausura', temporada: Y });

  console.log('Fase C: Clausura en curso, cuotas y caja...');
  await withTransaction(cargarClausura);

  const problemas = await verificar();
  if (problemas.length) {
    console.error('\nVERIFICACIÓN CON PROBLEMAS:');
    problemas.forEach((p) => console.error(` - ${p}`));
    process.exitCode = 1;
  } else {
    console.log('\nVerificación OK.');
  }
}

main()
  .catch((err) => {
    console.error('Error en el seed:', err);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
