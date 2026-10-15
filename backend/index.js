require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

// ─── Rutas ────────────────────────────────────────────────────────────────────
const authRoutes          = require('./routes/auth.routes');
const divisionRoutes      = require('./routes/division.routes');
const equipoRoutes        = require('./routes/equipo.routes');
const jugadorRoutes       = require('./routes/jugador.routes');
const partidoRoutes       = require('./routes/partido.routes');
const clasificacionRoutes = require('./routes/clasificacion.routes');
const playoffRoutes       = require('./routes/playoff.routes');
const cuotaRoutes         = require('./routes/cuota.routes');
const sedeRoutes          = require('./routes/sede.routes');
const gastoRoutes         = require('./routes/gasto.routes');
const cuerpoTecnicoRoutes = require('./routes/cuerpoTecnico.routes');

// ─── Inicialización de la app ─────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 4000;

// ─── Middlewares globales ─────────────────────────────────────────────────────

// Seguridad de cabeceras HTTP
app.use(helmet());

// CORS — permite peticiones desde cualquier origen local o el configurado
app.use(cors({
  origin: true, // Refleja dinámicamente el origen de la petición (localhost, 127.0.0.1, etc.)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parseo de JSON y URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logger HTTP (solo en desarrollo)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  // Testea la conexión a la DB en cada health check
  try {
    const { query } = require('./config/db');
    await query('SELECT 1');
    res.status(200).json({
      ok: true,
      proyecto: 'Club Argentinos del Norte — API',
      version: '1.0.0',
      db: 'conectada',
      entorno: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      proyecto: 'Club Argentinos del Norte — API',
      db: 'desconectada',
      error: err.message,
    });
  }
});

// ─── Montaje de rutas de la API ───────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/divisiones',    divisionRoutes);
app.use('/api/equipos',       equipoRoutes);
app.use('/api/jugadores',     jugadorRoutes);
app.use('/api/partidos',      partidoRoutes);
app.use('/api/clasificacion', clasificacionRoutes);
app.use('/api/playoff',       playoffRoutes);
app.use('/api/cuotas',        cuotaRoutes);
app.use('/api/sedes',         sedeRoutes);
app.use('/api/gastos',        gastoRoutes);
app.use('/api/cuerpo-tecnico', cuerpoTecnicoRoutes);

// ─── Ruta raíz ────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    mensaje: 'API Oficial — Club Argentinos del Norte',
    healthCheck: '/api/health',
    endpoints: [
      'POST   /api/auth/login',
      'GET    /api/divisiones',
      'GET    /api/equipos',
      'GET    /api/jugadores',
      'GET    /api/jugadores/goleadores/:id_division',
      'GET    /api/jugadores/tarjetas/:id_division',
      'GET    /api/partidos',
      'GET    /api/partidos/proximos',
      'GET    /api/clasificacion/:id_division',
      'GET    /api/playoff/:id_division',
      'GET    /api/sedes',
      'GET    /api/cuotas (auth requerida)',
    ],
  });
});

// ─── Manejador 404 ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    mensaje: `Ruta '${req.method} ${req.originalUrl}' no encontrada.`,
  });
});

// ─── Manejador global de errores ──────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]', err);
  res.status(err.status || 500).json({
    ok: false,
    mensaje: err.message || 'Error interno del servidor.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── Servidor ─────────────────────────────────────────────────────────────────
// En Vercel este bloque no se ejecuta (serverless handler), pero sí en local y Railway.
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log('══════════════════════════════════════════════════');
    console.log(`  🚀  Servidor corriendo en el puerto ${PORT}`);
    console.log(`  📡  URL local:  http://localhost:${PORT}`);
    console.log(`  🩺  Health:     http://localhost:${PORT}/api/health`);
    console.log('══════════════════════════════════════════════════');
  });

  server.on('error', (err) => {
    console.error(`❌ Error fatal en el servidor en el puerto ${PORT}:`, err.message);
  });
}

// Exportar para Vercel (serverless handler)
module.exports = app;
