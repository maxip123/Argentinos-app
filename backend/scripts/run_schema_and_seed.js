require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getPool } = require('../config/db');

async function main() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    console.log('⚡ Conectado a Supabase PostgreSQL. Iniciando migración de esquema...');
    
    // 1. Ejecutar schema_supabase.sql
    const schemaPath = path.resolve(__dirname, '../../schema_supabase.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log(`📄 Leyendo ${schemaPath} (${schemaSql.length} bytes)...`);
    await client.query(schemaSql);
    console.log('✅ Esquema creado exitosamente en Supabase (Tablas, Índices, Triggers, RLS).');

    // 2. Ejecutar seed_data.sql
    const seedPath = path.resolve(__dirname, '../../seed_data.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    
    console.log(`🌱 Leyendo ${seedPath} (${seedSql.length} bytes)...`);
    await client.query(seedSql);
    console.log('✅ Datos semilla insertados exitosamente.');

    // 3. Verificar tablas creadas
    const { rows: tables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\n📊 TABLAS ACTIVAS EN SUPABASE:');
    for (const t of tables) {
      const { rows: count } = await client.query(`SELECT COUNT(*) AS total FROM public."${t.table_name}"`);
      console.log(`   - ${t.table_name}: ${count[0].total} registros`);
    }

    console.log('\n🎉 ¡Base de datos de Supabase completamente configurada y lista!');
  } catch (error) {
    console.error('\n❌ Error ejecutando migración:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
