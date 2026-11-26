// Límite de intentos de inicio de sesión, guardado en la base (intento_login) porque en Vercel
// cada request puede caer en una instancia distinta.
// - 5 fallas del mismo email desde la misma IP en 15 minutos bloquean ese par.
// - 20 fallas desde la misma IP (con cualquier email) en 15 minutos bloquean la IP.
// Se cuenta por email + IP y no solo por email para que alguien de afuera no pueda dejar bloqueado
// al administrador probando su email.
const { query } = require('../config/db');

const VENTANA_MIN = 15;
const MAX_POR_EMAIL_IP = 5;
const MAX_POR_IP = 20;

// Minutos que faltan para poder volver a intentar, o 0 si no está bloqueado
async function minutosDeBloqueo(email, ip) {
  const { rows } = await query(
    `WITH recientes AS (
       SELECT email, created_at FROM public.intento_login
        WHERE ip = $2 AND created_at > NOW() - make_interval(mins => $3)
     ),
     por_par AS (
       SELECT created_at FROM recientes WHERE email = $1 ORDER BY created_at DESC LIMIT 1 OFFSET $4 - 1
     ),
     por_ip AS (
       SELECT created_at FROM recientes ORDER BY created_at DESC LIMIT 1 OFFSET $5 - 1
     )
     SELECT EXTRACT(EPOCH FROM GREATEST(
       (SELECT created_at FROM por_par),
       (SELECT created_at FROM por_ip)
     ) + make_interval(mins => $3) - NOW())::int AS segundos`,
    [email, ip, VENTANA_MIN, MAX_POR_EMAIL_IP, MAX_POR_IP]
  );
  const segundos = Number(rows[0]?.segundos) || 0;
  return segundos > 0 ? Math.ceil(segundos / 60) : 0;
}

async function registrarFalla(email, ip) {
  await query(`INSERT INTO public.intento_login (email, ip) VALUES ($1, $2)`, [email, ip]);
  // Limpieza de lo viejo; no hace falta un cron aparte
  await query(`DELETE FROM public.intento_login WHERE created_at < NOW() - INTERVAL '24 hours'`);
}

async function limpiarFallas(email, ip) {
  await query(`DELETE FROM public.intento_login WHERE email = $1 AND ip = $2`, [email, ip]);
}

module.exports = { minutosDeBloqueo, registrarFalla, limpiarFallas, VENTANA_MIN, MAX_POR_EMAIL_IP, MAX_POR_IP };
