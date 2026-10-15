require('dotenv').config();
const { getPool } = require('../config/db');

async function check() {
  const pool = getPool();
  try {
    const { rows: tables } = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('STATUS: SUPABASE ACTIVE');
    console.log('TABLE COUNT:', tables.length);
    for (const t of tables) {
      const { rows: count } = await pool.query(`SELECT COUNT(*) AS total FROM public."${t.table_name}"`);
      console.log(` - ${t.table_name}: ${count[0].total} registros`);
    }

    // Check cuota_jugador id_division nullable constraint
    const { rows: cols } = await pool.query(`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'cuota_jugador' AND column_name = 'id_division';
    `);
    console.log('cuota_jugador.id_division is_nullable:', cols[0]?.is_nullable);

    // Check superadmin user
    const { rows: admins } = await pool.query(`SELECT email, rol, activo FROM perfil_usuario;`);
    console.log('Admins:', admins);

    // Check historial_torneo
    const { rows: htExists } = await pool.query(`SELECT to_regclass('public.historial_torneo') as exists;`);
    console.log('historial_torneo exists:', htExists[0]);

    process.exit(0);
  } catch (err) {
    console.error('ERROR CONECTANDO A SUPABASE:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

check();
