require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

async function seed() {
  console.log('🌱 Iniciando Seed de datos...');

  try {
    // 1. Sedes
    await query(`
      INSERT INTO public.sede (nombre_sede, direccion, google_maps_url, es_sede_propia) VALUES
      ('Predio Central Argentinos del Norte', 'Av. Benjamín Aráoz 650, San Miguel de Tucumán', 'https://maps.google.com/?q=Argentinos+del+Norte', TRUE),
      ('Polideportivo Municipal', 'Calle Belgrano 1200, Yerba Buena', 'https://maps.google.com/?q=Polideportivo', FALSE),
      ('Cancha Defensores FC', 'Av. Sarmiento 3400', 'https://maps.google.com/?q=Defensores', FALSE)
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Sedes listas');

    // 2. Divisiones
    await query(`
      INSERT INTO public.division (nombre_division, categoria, genero, temporada, fecha_inicio) VALUES
      ('Primera División - Torneo Apertura', 'Primera', 'Masculino', 2026, '2026-03-01'),
      ('Reserva - Torneo Apertura', 'Reserva', 'Masculino', 2026, '2026-03-01'),
      ('Sub-17 Juveniles', 'Sub-17', 'Masculino', 2026, '2026-03-15'),
      ('Femenino Primera', 'Primera', 'Femenino', 2026, '2026-03-08')
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Divisiones listas');

    // Obtener los IDs de divisiones insertadas
    const { rows: divisiones } = await query(`SELECT id_division, nombre_division FROM public.division ORDER BY id_division ASC LIMIT 2;`);
    const idDiv1 = divisiones[0]?.id_division || 1;
    const idDiv2 = divisiones[1]?.id_division || 2;

    // 3. Equipos (Con 2 equipos de Argentinos del Norte en la misma división)
    await query(`
      INSERT INTO public.equipo (id_division, nombre_equipo, nombre_corto, es_argentinos_del_norte, logo_url) VALUES
      ($1, 'Argentinos del Norte Azul (A)', 'ARG Azul', TRUE, '/gemini-svg.svg'),
      ($1, 'Argentinos del Norte Blanco (B)', 'ARG Blanco', TRUE, '/gemini-svg.svg'),
      ($1, 'Atlético Futsal', 'ATF', FALSE, NULL),
      ($1, 'Club Villa Mitre', 'VMI', FALSE, NULL),
      ($2, 'Argentinos del Norte Reserva', 'ARG Res', TRUE, '/gemini-svg.svg'),
      ($2, 'Atlético Futsal Reserva', 'ATF Res', FALSE, NULL)
      ON CONFLICT (id_division, nombre_equipo) DO NOTHING;
    `, [idDiv1, idDiv2]);
    console.log('✅ Equipos listos');

    // Obtener IDs de equipos
    const { rows: equipos } = await query(`SELECT id_equipo, nombre_equipo FROM public.equipo WHERE id_division = $1 ORDER BY id_equipo ASC;`, [idDiv1]);
    const eqArgA = equipos[0]?.id_equipo;
    const eqArgB = equipos[1]?.id_equipo;
    const eqAtl = equipos[2]?.id_equipo;
    const eqMitre = equipos[3]?.id_equipo;

    if (eqArgA && eqArgB && eqAtl && eqMitre) {
      // 4. Jugadores
      await query(`
        INSERT INTO public.jugador (id_equipo, id_division, nombre, apellido, dni, es_jugador_club, goles_totales, amarillas_totales, rojas_totales) VALUES
        ($1, $2, 'Lucas', 'González', '42111222', TRUE, 7, 2, 0),
        ($1, $2, 'Mateo', 'Fernández', '43555666', TRUE, 12, 1, 0),
        ($1, $2, 'Ignacio', 'Romero', '41999888', TRUE, 0, 0, 0),
        ($1, $2, 'Facundo', 'Benítez', '44123987', TRUE, 3, 4, 1),
        ($3, $2, 'Santiago', 'Díaz', '42333444', TRUE, 8, 3, 0),
        ($3, $2, 'Lautaro', 'Alonso', '43888777', TRUE, 6, 1, 0),
        ($3, $2, 'Franco', 'Pérez', '40555111', TRUE, 0, 1, 0),
        ($4, $2, 'Emiliano', 'Martínez', '39111444', FALSE, 9, 2, 0)
        ON CONFLICT (dni, id_division) DO NOTHING;
      `, [eqArgA, idDiv1, eqArgB, eqAtl]);
      console.log('✅ Jugadores listos');

      // Obtener jugadores para cuotas
      const { rows: jugadoresClub } = await query(`SELECT id_jugador FROM public.jugador WHERE id_division = $1 AND es_jugador_club = TRUE ORDER BY id_jugador ASC LIMIT 5;`, [idDiv1]);
      if (jugadoresClub.length >= 3) {
        await query(`
          INSERT INTO public.cuota_jugador (id_jugador, id_division, periodo_mes, periodo_anio, monto_esperado, monto_abonado, fecha_vencimiento, fecha_pago, estado_pago, metodo_pago) VALUES
          ($1, $4, 3, 2026, 15000.00, 15000.00, '2026-03-10', '2026-03-05 14:30:00-03', 'Pagado', 'Transferencia'),
          ($2, $4, 3, 2026, 15000.00, 15000.00, '2026-03-10', '2026-03-08 19:15:00-03', 'Pagado', 'MercadoPago'),
          ($3, $4, 3, 2026, 15000.00, 7500.00, '2026-03-10', '2026-03-12 11:00:00-03', 'Parcial', 'Efectivo')
          ON CONFLICT (id_jugador, periodo_mes, periodo_anio) DO NOTHING;
        `, [jugadoresClub[0].id_jugador, jugadoresClub[1].id_jugador, jugadoresClub[2].id_jugador, idDiv1]);
        console.log('✅ Cuotas de prueba listas');
      }

      // 5. Partidos de Ejemplo
      const { rows: sedes } = await query(`SELECT id_sede FROM public.sede ORDER BY id_sede ASC LIMIT 2;`);
      const idSede1 = sedes[0]?.id_sede || 1;
      const idSede2 = sedes[1]?.id_sede || idSede1;

      await query(`
        INSERT INTO public.partido (id_division, id_sede, id_equipo_local, id_equipo_visitante, fecha_partido, jornada_numero, nombre_partido, goles_local, goles_visitante, estado_partido, afecta_clasificacion) VALUES
        ($1, $2, $3, $5, '2026-03-14 20:00:00-03', 1, 'Fecha 1 - Torneo Apertura', 5, 3, 2, TRUE),
        ($1, $2, $4, $6, '2026-03-14 21:30:00-03', 1, 'Fecha 1 - Torneo Apertura', 4, 4, 2, TRUE),
        ($1, $2, $3, $4, '2026-03-28 20:30:00-03', 2, 'Fecha 2 - Clásico Argentinos Azul vs Blanco', 0, 0, 0, TRUE),
        ($1, $7, $5, $6, '2026-03-29 19:00:00-03', 2, 'Fecha 2 - Torneo Apertura', 0, 0, 0, TRUE)
        ON CONFLICT DO NOTHING;
      `, [idDiv1, idSede1, eqArgA, eqArgB, eqAtl, eqMitre, idSede2]);
      console.log('✅ Partidos listos');

      // Recalcular posiciones
      await query(`SELECT public.recalcular_clasificacion_division($1);`, [idDiv1]);
      console.log('✅ Clasificación calculada automáticamente');
    }

    // 6. Usuario Administrador por defecto
    const passwordHash = await bcrypt.hash('admin1234', 10);
    const { rows: usuarioExistente } = await query(`SELECT id_perfil FROM public.perfil_usuario WHERE email = $1`, ['admin@argentinosdelnorte.com']);
    if (usuarioExistente.length === 0) {
      await query(`
        INSERT INTO public.perfil_usuario (email, nombre_completo, rol, contrasena_hash)
        VALUES ($1, $2, $3, $4);
      `, ['admin@argentinosdelnorte.com', 'Administrador General', 'Superadmin', passwordHash]);
      console.log('✅ Usuario Administrador creado: admin@argentinosdelnorte.com / admin1234');
    } else {
      console.log('ℹ️ Usuario admin ya existe');
    }

    console.log('🎉 SEED COMPLETADO CON ÉXITO');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando seed:', error);
    process.exit(1);
  }
}

seed();
