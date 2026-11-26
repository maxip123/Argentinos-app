# Zonas y cruces configurables

## Para qué

Los torneos de la liga no tienen un formato fijo. Algunos se juegan en una sola tabla y otros en varias zonas, con partidos interzonales. Después de la fase de grupos puede haber un cuadro de eliminación, o no haberlo, y cada ronda del cuadro puede jugarse a partido único o a ida y vuelta. El sistema tiene que permitir armar cada torneo como se juega de verdad, incluidos los torneos históricos de los Excel de 2019 y 2021, que se van a importar después.

Hoy cada torneo tiene una sola tabla, y cada cruce del cuadro es un único resultado guardado en `llave_playoff`. Ese resultado no es un partido del fixture, así que no tiene fecha ni sede y no registra goles ni tarjetas.

## Decisiones del dueño

- La estructura es siempre de dos etapas: primero grupos (una zona o varias) y después, si lo hay, un cuadro. No hay segundas fases de grupos.
- Todo es opcional: un torneo sin zonas y sin cuadro funciona igual que hoy.
- Cada partido de un cruce es un partido real del fixture (enfoque A).
- Cada ronda del cuadro se juega a **partido único o a ida y vuelta**. No hay series al mejor de 3.
- Si el cruce queda empatado, **se elige a mano quién pasa**, como hoy con los penales. El resultado de los penales se puede anotar, pero no es obligatorio.

## Objetivos

1. **Zonas opcionales por torneo.** Sin zonas, el torneo muestra una sola tabla, como hoy. Con zonas, muestra una tabla por zona.
2. **Interzonales automáticos.** Un partido entre equipos de zonas distintas suma en la tabla de la zona de cada equipo. No se marca a mano.
3. **Formato del cruce elegido por ronda** al generar el cuadro: partido único o ida y vuelta. Por ejemplo, cuartos y semifinales de ida y vuelta, y final a partido único.
4. **Partidos reales.** Cada partido de un cruce es una fila de `partido`, con fecha, sede, resultado, goles y tarjetas. No suma en la tabla (`afecta_clasificacion = FALSE`).
5. **El cruce calcula solo quién pasa** a partir de sus partidos y lleva al ganador a la ronda siguiente, como hoy.
6. **Los goles y tarjetas de los partidos de playoff** cuentan en los goleadores y las tarjetas del torneo y quedan en el historial.

## Fuera de alcance

- Segundas fases de grupos (zona campeonato o repechaje como todos contra todos).
- Series al mejor de 3.
- Pasar equipos de la tabla al cuadro de forma automática. Los clasificados se siguen eligiendo a mano.
- Cuadros con equipos libres o con cantidades que no sean potencia de 2. Siguen siendo 2, 4, 8, 16 o 32.
- La regla del gol de visitante.
- Importar los Excel. Es el paso siguiente y usa lo que construye este diseño.

## Lo que no puede pasar

- Que un torneo actual o un historial ya archivado se vea distinto o se rompa. Los snapshots viejos no tienen zona, ni formato, ni partidos ligados a cruces.
- Que la tabla de posiciones sume partidos de playoff.
- Que el cambio de resultado de un partido de cruce deje el cuadro inconsistente. Por ejemplo, que el ganador cambie después de que la ronda siguiente ya se jugó.
- Que la carga de un cruce simple de partido único sea más trabajosa que hoy.

## Modelo de datos

Cambios aditivos, con una migración nueva (`scripts/migrate_zonas_cruces.js`) y la sección 28 de `schema_supabase.sql`:

- `equipo.zona VARCHAR(20) NULL`: "A", "B", "Norte", etc. NULL significa sin zona. Como `equipo` ya pertenece a una división, la zona es por torneo.
- `llave_playoff.formato VARCHAR(12) NOT NULL DEFAULT 'unico'`, con CHECK en `('unico', 'ida_vuelta')`.
- `partido.id_llave BIGINT NULL REFERENCES llave_playoff`, más `partido.numero_juego SMALLINT NULL` (1 = único o ida, 2 = vuelta). Índice único parcial `(id_llave, numero_juego) WHERE activo`.
- En el partido que define el cruce, para desempatar:
  - `partido.id_equipo_desempate BIGINT NULL REFERENCES equipo`: quién pasa si el cruce queda empatado.
  - `partido.penales_local` y `partido.penales_visitante` (INT NULL): opcionales, solo para mostrar.
- `llave_playoff.goles_local`, `goles_visitante` e `id_equipo_ganador` pasan a ser **calculados**: el resultado en partido único y el global en ida y vuelta. Se siguen guardando para que el cuadro y el snapshot los lean sin recalcular. `llave_playoff.penales_*` y `llave_playoff.estado_partido` siguen existiendo por los snapshots viejos, y `estado_partido` se recalcula: 0 sin partidos jugados, 1 en curso, 2 definido.

**Convención de local y visitante:** en el cruce, el `id_equipo_local` es el mejor ubicado. En ida y vuelta, la ida la juega de local el visitante del cruce y la vuelta, el local del cruce. El formulario propone esa localía y se puede cambiar.

## Cómo se decide un cruce

Se toman los partidos activos del cruce con `estado_partido = 2`:

- **Partido único:** gana el que hizo más goles. Si empatan, pasa el `id_equipo_desempate` del partido. Un partido de cruce empatado no se puede finalizar sin elegir quién pasa.
- **Ida y vuelta:** se suma el global (goles de cada equipo en los dos partidos, sin importar la localía). El cruce se define cuando la vuelta (`numero_juego = 2`) está finalizada. Si el global empata, pasa el `id_equipo_desempate` de la vuelta, y la vuelta no se puede finalizar sin elegirlo. La ida puede terminar empatada sin elegir a nadie.
- `id_equipo_desempate` tiene que ser uno de los dos equipos del cruce y solo se guarda cuando hace falta. Si el resultado deja de estar empatado, se borra.

Al definirse un cruce se guarda el ganador y se lo lleva a la ronda siguiente, como hoy.

Si una corrección cambia el ganador, o deja el cruce sin definir:
- si la ronda siguiente todavía no tiene partidos jugados, se limpia el cupo y, si corresponde, se pone al nuevo ganador;
- si ya tiene partidos jugados, el cambio se rechaza con un 409 que explica que primero hay que anular esos partidos.

## Backend

**Un solo lugar recalcula el cruce:** `recalcularLlave(client, idLlave)` en un util nuevo, `utils/cruces.js`. Lo llaman, dentro de su transacción, todos los handlers que crean, editan, finalizan o borran un partido con `id_llave`. También se llama al cambiar los equipos de un cruce. Bloquea el cruce con `FOR UPDATE`, para que dos cargas simultáneas de partidos del mismo cruce se apliquen una después de la otra.

Un cruce "Tercer Puesto", si existe, se decide con las mismas reglas.

**Partidos de cruce** (`partido.controller.js`):
- Crear y editar validan:
  - que el cruce exista y tenga los dos equipos;
  - que local y visitante sean esos dos equipos, en cualquier orden;
  - que `numero_juego` sea válido para el formato (solo 1 en partido único; 1 o 2 en ida y vuelta) y no esté repetido.
- Fuerza `afecta_clasificacion = FALSE`. Si no viene `nombre_partido`, lo arma como "Semifinal · Ida", "Semifinal · Vuelta" o "Final" (partido único).
- Para finalizar un partido de cruce, la regla del desempate de la sección anterior se aplica en el backend y se refleja en el formulario.
- El formulario solo muestra "¿Quién pasa?" y los penales opcionales cuando el partido es de un cruce y el empate los necesita.

**Cuadro** (`playoff.controller.js`):
- `generarBracket` recibe el formato de cada ronda (`{ fase, formato }`). Si falta, usa `unico`.
- `actualizarResultado`:
  - Deja de aceptar goles y penales.
  - Mantiene la edición de equipos del cruce, pero la rechaza si el cruce ya tiene partidos.
  - Agrega cambiar `formato` mientras el cruce no tenga partidos.
- `obtenerPorDivision` devuelve cada cruce con sus partidos: id, número de juego, fecha, sede, local, visitante, goles, penales, quién pasó por desempate y estado.
- `reiniciarBracket` también da de baja los partidos de los cruces que reinicia. Las estadísticas de esos partidos se borran como en el borrado de partido actual, y se resincronizan los acumuladores de los jugadores.

**Zonas:**
- `equipo.controller.js` y sus validaciones aceptan `zona`: texto corto, con espacios recortados y vacío como NULL.
- `SQL_TABLA_PUBLICA` y `obtenerDetallePorDivision` agregan `e.zona`. La tabla se sigue calculando igual; la zona solo agrupa.

**Historial** (`division.controller.js`):
- El snapshot de la tabla lleva `zona`.
- El de partidos lleva `id_llave`, `numero_juego`, los penales y el desempate.
- El de cruces lleva `formato` y el global.
- `finalDeCopa` y el podio siguen usando `id_equipo_ganador`, que ahora siempre está calculado.
- Lectura de snapshots viejos: sin `formato` es `unico`; sin `zona` hay una sola tabla.

## Frontend

**Equipos (`EquiposManager`):**
- Campo "Zona" opcional al crear o editar un equipo, con sugerencias de las zonas que ya existen en el torneo.
- En el listado, los equipos se agrupan por zona cuando hay zonas.

**Tablas (`StandingsTable`, `PosicionesManager`, historial):**
- Sin zonas: igual que hoy.
- Con zonas: un bloque por zona con el título "Zona A", "Zona B", etc., ordenado por nombre de zona.
- Los equipos sin zona en un torneo con zonas van a un bloque "Sin zona" al final.

**Fixture (`FixtureList`, Partidos del panel):**
- Los partidos de cruce se ven con su nombre ("Semifinal · Vuelta").
- Los interzonales llevan una etiqueta chica "Interzonal".
- El formulario de partido, cuando el partido es de un cruce, muestra el cruce y, si hace falta desempatar, "¿Quién pasa?" con los penales opcionales.

**Cuadro, en el panel (`PlayoffsManager`):**
- Al generar el cuadro aparece un selector de formato por cada ronda (partido único / ida y vuelta). Por defecto, partido único.
- Cada cruce muestra sus partidos y un botón "Programar ida", "Programar vuelta" o "Programar partido", según lo que falte. El botón abre el formulario de partido ya completo con el torneo, los equipos con la localía propuesta, el número de juego y el nombre; solo hay que poner fecha y sede.
- El resultado se carga en el partido, igual que cualquier partido: goles, tarjetas y goleadores. El cruce se actualiza solo.
- La carga directa de goles en el cruce desaparece.

**Cuadro, en el sitio (`PlayoffBracket`) y en el historial:**
- Partido único: "3-2". Si hubo desempate: "(4-3 pen.)" cuando se cargaron los penales, o "(pasa X)" cuando no.
- Ida y vuelta: el global en grande y debajo cada partido ("Ida 2-1 · Vuelta 1-1"), con el desempate si hubo.
- Snapshots viejos: igual que hoy.

## Datos existentes y de demo

- Hoy hay un solo cruce activo en la base, de datos de demo. La migración convierte cada cruce activo con resultado en un partido único ligado, usando como sede la primera sede activa y como fecha la última actualización del cruce. Si estaba empatado, pasa `id_equipo_ganador` y los penales del cruce al partido. Así no queda ningún cruce con el resultado cargado solo en el cuadro.
- `seed_demo.js` pasa a jugar los playoffs con partidos reales: al menos una ronda de ida y vuelta, un cruce definido por desempate y un torneo con dos zonas e interzonales. `verificar()` agrega estos chequeos:
  - el ganador de cada cruce coincide con sus partidos;
  - ningún partido de cruce suma a la tabla;
  - las tablas por zona suman lo mismo que la tabla total.

  El `--reset` solo se corre con el OK del dueño.

## Verificación

No hay suite de tests. Se prueba con scripts sobre la base real, dentro de una transacción que se revierte, y en el navegador con la API simulada:

1. Un torneo sin zonas y con cuadro de partido único se ve y se carga como hoy (salvo que el resultado se carga en el partido).
2. Zonas: dos zonas con un interzonal. Cada tabla suma bien y el interzonal cuenta en las dos.
3. Partido único:
   - gana el que hizo más goles;
   - un empate sin elegir quién pasa no se puede finalizar;
   - con quién pasa elegido, avanza ese equipo.
4. Ida y vuelta:
   - el global define;
   - la ida empatada se finaliza sin elegir a nadie;
   - una vuelta con el global empatado exige elegir quién pasa;
   - el cruce no se define hasta que se juega la vuelta.
5. Corregir un resultado que cambia el ganador:
   - si la ronda siguiente no tiene partidos jugados, se actualiza;
   - si ya los tiene, devuelve 409.
6. Reiniciar el cuadro da de baja sus partidos, y los goleadores del torneo se recalculan.
7. Archivar un torneo con zonas e ida y vuelta. El historial muestra las tablas por zona y el cuadro con sus partidos. Un historial viejo se ve igual que antes.
8. En el sitio, `/masculino`, `/femenino`, `/historial` y el panel se ven bien en escritorio y a 375 px, sin scroll horizontal en la página.
9. `npm run lint` y `npm run build` en `frontend/`.

## Decisiones que tomé yo (para revisar)

- **Sin gol de visitante.**
- En **ida y vuelta, el desempate se carga en la vuelta**.
- **Elegir quién pasa reemplaza la opción de ventaja deportiva** del primer borrador: cubre los dos casos (penales y ventaja) sin una configuración aparte.
- La **zona es un texto libre** en el equipo, y no una tabla aparte. Alcanza para agrupar y no agrega pantallas.
- Si una corrección cambiaría a un ganador que ya jugó la ronda siguiente, se **rechaza** en lugar de recalcular en cascada.
- El **cruce activo de la demo se convierte** a partido real en la migración, en lugar de pedir un `--reset`.

## Lo que queda a criterio de quien lo construya

- El diseño visual exacto de los selectores por ronda y de los partidos dentro de cada cruce, respetando el estilo actual del panel.
- Cómo se ve la etiqueta "Interzonal" y dónde va dentro de la tarjeta del partido.
- La forma de los mensajes de error, siempre en español y explicando qué hacer.
