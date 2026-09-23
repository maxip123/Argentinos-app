-- ==============================================================================
-- DATOS SEMILLA (SEED DATA) - CLUB ARGENTINOS DEL NORTE
-- Inserta datos iniciales para probar divisiones, múltiples equipos del club (A y B),
-- jugadores, sedes, cuotas y cálculo automático de posiciones.
-- ==============================================================================

-- 1. Sedes
INSERT INTO public.sede (nombre_sede, direccion, google_maps_url, es_sede_propia) VALUES
('Predio Central Argentinos del Norte', 'Av. Benjamín Aráoz 650, San Miguel de Tucumán', 'https://maps.google.com/?q=Argentinos+del+Norte', TRUE),
('Polideportivo Municipal', 'Calle Belgrano 1200, Yerba Buena', 'https://maps.google.com/?q=Polideportivo', FALSE),
('Cancha Defensores FC', 'Av. Sarmiento 3400', 'https://maps.google.com/?q=Defensores', FALSE)
ON CONFLICT DO NOTHING;

-- 2. Divisiones
INSERT INTO public.division (nombre_division, categoria, genero, temporada, fecha_inicio) VALUES
('Primera División - Torneo Apertura', 'Primera', 'Masculino', 2026, '2026-03-01'),
('Reserva - Torneo Apertura', 'Reserva', 'Masculino', 2026, '2026-03-01'),
('Sub-17 Juveniles', 'Sub-17', 'Masculino', 2026, '2026-03-15'),
('Femenino Primera', 'Primera', 'Femenino', 2026, '2026-03-08')
ON CONFLICT DO NOTHING;

-- 3. Equipos (Demostrando 2 equipos de Argentinos del Norte en la MISMA división + rivales)
INSERT INTO public.equipo (id_division, nombre_equipo, nombre_corto, es_argentinos_del_norte) VALUES
-- Primera División (ID 1): Argentinos A, Argentinos B y Rivales
(1, 'Argentinos del Norte Azul (A)', 'ARG Azul', TRUE),
(1, 'Argentinos del Norte Blanco (B)', 'ARG Blanco', TRUE),
(1, 'Atlético Futsal', 'ATF', FALSE),
(1, 'Club Villa Mitre', 'VMI', FALSE),

-- Reserva (ID 2)
(2, 'Argentinos del Norte Reserva', 'ARG Res', TRUE),
(2, 'Atlético Futsal Reserva', 'ATF Res', FALSE)
ON CONFLICT DO NOTHING;

-- 4. Jugadores (Plantel propio y rivales)
INSERT INTO public.jugador (id_equipo, id_division, nombre, apellido, dni, es_jugador_club, goles_totales, amarillas_totales, rojas_totales) VALUES
-- Argentinos del Norte Azul (Equipo 1, Div 1)
(1, 1, 'Lucas', 'González', '42111222', TRUE, 7, 2, 0),
(1, 1, 'Mateo', 'Fernández', '43555666', TRUE, 12, 1, 0),
(1, 1, 'Ignacio', 'Romero', '41999888', TRUE, 0, 0, 0),
(1, 1, 'Facundo', 'Benítez', '44123987', TRUE, 3, 4, 1),

-- Argentinos del Norte Blanco (Equipo 2, Div 1)
(2, 1, 'Santiago', 'Díaz', '42333444', TRUE, 8, 3, 0),
(2, 1, 'Lautaro', 'Alonso', '43888777', TRUE, 6, 1, 0),
(2, 1, 'Franco', 'Pérez', '40555111', TRUE, 0, 1, 0),

-- Atlético Futsal (Equipo 3, Div 1)
(3, 1, 'Emiliano', 'Martínez', '39111444', FALSE, 9, 2, 0)
ON CONFLICT DO NOTHING;

-- 5. Control de Cuotas (Jugadores de Argentinos del Norte)
INSERT INTO public.cuota_jugador (id_jugador, id_division, periodo_mes, periodo_anio, monto_esperado, monto_abonado, fecha_vencimiento, fecha_pago, estado_pago, metodo_pago) VALUES
(1, 1, 3, 2026, 15000.00, 15000.00, '2026-03-10', '2026-03-05 14:30:00-03', 'Pagado', 'Transferencia'),
(2, 1, 3, 2026, 15000.00, 15000.00, '2026-03-10', '2026-03-08 19:15:00-03', 'Pagado', 'MercadoPago'),
(3, 1, 3, 2026, 15000.00, 7500.00, '2026-03-10', '2026-03-12 11:00:00-03', 'Parcial', 'Efectivo'),
(4, 1, 3, 2026, 15000.00, 0.00, '2026-03-10', NULL, 'Vencido', NULL),
(5, 1, 3, 2026, 15000.00, 15000.00, '2026-03-10', '2026-03-04 10:00:00-03', 'Pagado', 'Transferencia')
ON CONFLICT DO NOTHING;

-- 6. Partidos de Ejemplo (Fecha 1 jugada, Fecha 2 programada)
-- Partido Finalizado (estado_partido = 2) -> Activará automáticamente el trigger de posiciones
INSERT INTO public.partido (id_division, id_sede, id_equipo_local, id_equipo_visitante, fecha_partido, jornada_numero, nombre_partido, goles_local, goles_visitante, estado_partido, afecta_clasificacion) VALUES
(1, 1, 1, 3, '2026-03-14 20:00:00-03', 1, 'Fecha 1 - Torneo Apertura', 5, 3, 2, TRUE),
(1, 1, 2, 4, '2026-03-14 21:30:00-03', 1, 'Fecha 1 - Torneo Apertura', 4, 4, 2, TRUE),

-- Próximos partidos programados (estado_partido = 0)
(1, 1, 1, 2, '2026-03-28 20:30:00-03', 2, 'Fecha 2 - Clásico Interno Argentinos A vs B', 0, 0, 0, TRUE),
(1, 2, 3, 4, '2026-03-29 19:00:00-03', 2, 'Fecha 2 - Torneo Apertura', 0, 0, 0, TRUE)
ON CONFLICT DO NOTHING;

-- Ejecución inicial del recálculo de posiciones para sincronizar
SELECT public.recalcular_clasificacion_division(1);
