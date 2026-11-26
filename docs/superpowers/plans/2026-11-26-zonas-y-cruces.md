# Zonas y cruces configurables: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada torneo tenga zonas opcionales (con interzonales automáticos) y un cuadro opcional cuyas rondas se jueguen a partido único o ida y vuelta, con cada partido del cruce como partido real del fixture.

**Architecture:**
- **Datos:** columnas nuevas en `equipo`, `llave_playoff` y `partido`.
- **Backend:** un util puro decide el cruce a partir de sus partidos (`decidirCruce`). Un wrapper transaccional (`recalcularLlave`) guarda el resultado y mueve al ganador, y lo llaman todos los handlers que tocan un partido de cruce.
- **Frontend:** agrupa las tablas por zona; los cruces dejan de cargar goles y pasan a programar partidos.

**Tech Stack:** Express 5 (CommonJS) + pg sobre Supabase Postgres; React 19 + Vite + Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-11-26-zonas-y-cruces-design.md`

## Global Constraints

- Código, UI y mensajes en español. Respuestas con `utils/respuesta.js` (`{ ok, mensaje, data }`).
- Cambios de esquema aditivos e idempotentes. Se aplican con `backend/scripts/migrate_zonas_cruces.js` y se agregan como sección 28 de `schema_supabase.sql`, que es un archivo local y no se versiona.
- `formato` ∈ `('unico', 'ida_vuelta')`. `numero_juego`: 1 = único o ida, 2 = vuelta.
- Sin gol de visitante. El desempate es siempre "quién pasa", elegido a mano en el partido que define el cruce. Los penales son opcionales y solo se muestran.
- Partido de cruce ⇒ `afecta_clasificacion = FALSE`, siempre.
- Los snapshots viejos de `historial_torneo` se leen igual que hoy: sin `formato` es `unico` y sin `zona` hay una sola tabla.
- UI: sin emojis, sin `window.confirm` ni `alert` (se usa `ConfirmModal`), escudos con `EscudoEquipo`. Responsive a 375 px sin scroll horizontal en la página. No rediseñar lo que no toca este cambio.
- Sin suite de tests. Cada tarea se prueba con un script en el scratchpad que corre contra la base real dentro de BEGIN…ROLLBACK, usando el arnés de la Tarea 1. La UI se prueba con una página temporal y la API simulada (`api.defaults.adapter`), nunca contra el backend local, porque el backend local escribe en la base de producción.
- No tocar el puerto 5173: es de otra app. El front de prueba usa la configuración `frontend` de `.claude/launch.json` (puerto 5181).
- No commitear ni pushear hasta que el dueño lo pida. No correr `seed_demo.js --reset` sin su OK explícito.

## Review Focus

1. **Corrección de un partido ya jugado en un cruce cuya ronda siguiente ya se jugó:** se espera 409 y que no cambie nada, ni el partido ni el cuadro. Lo prueba la Tarea 3 (`correccion_bloqueada`).
2. **Borrar el partido de ida o de vuelta de un cruce ya definido:** el cruce vuelve a "sin definir" y se limpia el cupo de la ronda siguiente si todavía no se jugó. Lo prueba la Tarea 3 (`borrar_vuelta_desdefine`).
3. **Editar los datos de un partido de cruce cambiando un equipo por otro que no es del cruce:** se espera 400. Lo prueba la Tarea 3 (`editar_equipo_ajeno`).
4. **Torneo con zonas donde un equipo queda sin zona:** se ve en el bloque "Sin zona", sin perderse ni duplicarse. Lo prueba la Tarea 6 (`agruparPorZona_sin_zona`).
5. **Historial archivado antes de este cambio:** cruces sin `formato` y llaves con goles propios se ven igual que antes. Lo prueba la Tarea 6 (`resumenCruce_legado`).

---

### Task 1: Migración, conversión de la demo y arnés de pruebas

**Files:**
- Create: `backend/scripts/migrate_zonas_cruces.js`
- Modify: `schema_supabase.sql` (agregar la sección 28 al final)
- Create (scratchpad): `harness_cruces.js`, `test_t1_migracion.js`

**Interfaces:**
- Produces:
  - Columnas:
    - `equipo.zona VARCHAR(20) NULL`
    - `llave_playoff.formato VARCHAR(12) NOT NULL DEFAULT 'unico' CHECK (formato IN ('unico','ida_vuelta'))`
    - `partido.id_llave BIGINT NULL REFERENCES llave_playoff(id_llave)`
    - `partido.numero_juego SMALLINT NULL CHECK (numero_juego IN (1,2))`
    - `partido.id_equipo_desempate BIGINT NULL REFERENCES equipo(id_equipo)`
    - `partido.penales_local INT NULL CHECK (>= 0)`
    - `partido.penales_visitante INT NULL CHECK (>= 0)`
  - Índices:
    - `CREATE UNIQUE INDEX ux_partido_llave_juego ON partido(id_llave, numero_juego) WHERE activo AND id_llave IS NOT NULL`
    - `CREATE INDEX idx_partido_llave ON partido(id_llave) WHERE id_llave IS NOT NULL`
    - `CREATE INDEX idx_equipo_zona ON equipo(id_division, zona) WHERE activo`
  - Arnés `harness_cruces.js`: exporta `conApp(fn)`.
    - Abre un cliente, hace BEGIN y redirige `db.query` al cliente. `db.withTransaction` pasa a usar SAVEPOINT, como en `test_padron_pagos.js`.
    - Levanta `index.js` en el puerto 0 y llama a `fn({ client, call, T, fx })`.
    - `call(method, url, token, body)` devuelve `{ status, body }`. `T` tiene tokens JWT para `admin` (Administrador), `deleg` (Delegado) y `tes` (Tesorero).
    - `fx` tiene helpers que crean fixtures dentro de la transacción:
      - `fx.division()` → `id_division`
      - `fx.equipo(idDiv, { zona, club })` → `id_equipo`
      - `fx.sede()` → `id_sede`
      - `fx.llave(idDiv, { fase, formato, local, visitante, siguiente, esLocalSiguiente })` → `id_llave`
    - Al final hace ROLLBACK, cierra el pool e imprime `N/N OK`. Exporta también `check(nombre, condicion, extra)`.

- [ ] **Step 1: Escribir `test_t1_migracion.js`.** Con el arnés, verifica que:
  - existan las columnas e índices de arriba (vía `information_schema` y `pg_indexes`);
  - ninguna llave activa con `estado_partido = 2` quede sin al menos un partido activo con su `id_llave`;
  - el partido convertido tenga `afecta_clasificacion = FALSE`, `numero_juego = 1` y los goles de la llave;
  - si la llave estaba empatada, `id_equipo_desempate = llave.id_equipo_ganador` y los penales copiados.
- [ ] **Step 2: Correr el test.** Esperado: FAIL, porque las columnas no existen.
- [ ] **Step 3: Escribir `migrate_zonas_cruces.js`** con el patrón de `migrate_padron_pagos.js` (BEGIN, DDL idempotente, conversión, COMMIT).
  - La conversión inserta un `partido` por cada llave activa con `estado_partido = 2` y sin partido ligado:
    - `id_sede` = primera sede activa por `id_sede`;
    - `fecha_partido` = `llave.updated_at`;
    - `nombre_partido` = `llave.fase`;
    - `estado_partido` = 2;
    - `afecta_clasificacion` = FALSE.
  - Imprime cuántas llaves convirtió. Si no hay sede activa y hay llaves para convertir, aborta con un mensaje claro.
  - Agregar la sección 28 a `schema_supabase.sql` con el mismo DDL, sin la conversión.
- [ ] **Step 4: Aplicar** `node scripts/migrate_zonas_cruces.js` (es aditiva) y correr el test. Esperado: PASS. La salida esperada de la migración es "llaves convertidas: 1".

### Task 2: Decisión del cruce (`utils/cruces.js`)

**Files:**
- Create: `backend/utils/cruces.js`
- Create (scratchpad): `test_t2_decidir.js`

**Interfaces:**
- Consumes: las columnas de la Tarea 1.
- Produces:
  - `decidirCruce(llave, partidos) -> { goles_local, goles_visitante, id_equipo_ganador, estado_partido, error }`. Es una función pura.
    - `llave`: `{ formato, id_equipo_local, id_equipo_visitante }`.
    - `partidos`: los activos del cruce, `{ numero_juego, estado_partido, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, id_equipo_desempate }`.
    - Los goles devueltos van desde el punto de vista del local y el visitante **del cruce**, sin importar la localía de cada partido.
    - `estado_partido`: 0 si no hay partidos finalizados, 1 si hay alguno pero el cruce no está definido, 2 si está definido.
    - `error`: string o null. Es para un partido decisivo finalizado empatado sin desempate válido.
  - `necesitaDesempate(llave, partidos, partidoEditado) -> boolean`: true si `partidoEditado` es el que define el cruce y, con sus goles, el cruce queda empatado.
  - `async recalcularLlave(client, idLlave) -> llaveActualizada`:
    - Hace `SELECT … FOR UPDATE` de la llave y lee sus partidos activos.
    - Aplica `decidirCruce`, guarda `goles_*`, `id_equipo_ganador` y `estado_partido` en la llave, y propaga el cambio a `id_llave_siguiente`.
    - Si el ganador cambia o se des-define y la llave siguiente tiene algún partido activo con `estado_partido = 2`, lanza `ErrorCruce` (status 409, mensaje: "La ronda siguiente ya se jugó con el ganador anterior. Anulá primero esos partidos.").
    - Si la llave siguiente no tiene partidos jugados, pone el nuevo ganador en el cupo (`es_local_siguiente`) o lo deja en NULL.
    - Si el cupo cambia y la llave siguiente tenía partidos programados (estado 0), esos partidos se dan de baja, porque ya no corresponden a esos equipos.
  - `class ErrorCruce extends Error { status }`.

- [ ] **Step 1: Escribir `test_t2_decidir.js`** con `node:assert`. Para `decidirCruce`, siendo L el local del cruce y V el visitante:
  - `unico_gana_por_goles`: un partido L 3–2 V finalizado → ganador L, `goles_local` 3, `goles_visitante` 2, estado 2.
  - `unico_localia_invertida`: el partido lo juega V de local, 1–0 → ganador V, `goles_local` 0, `goles_visitante` 1.
  - `unico_empate_con_desempate`: 2–2 con desempate V → ganador V, estado 2.
  - `unico_empate_sin_desempate`: 2–2 sin desempate → ganador null y `error` no null.
  - `iv_solo_ida`: ida finalizada → estado 1, ganador null.
  - `iv_global`: ida (V local) 2–1 para V y vuelta (L local) 3–1 para L → global L 4 – V 3, ganador L.
  - `iv_global_empatado`: el global empata y la vuelta tiene desempate L → ganador L.
  - `iv_global_empatado_sin_desempate`: lo mismo sin desempate → `error` no null.
  - `ignora_no_finalizados`: un partido en estado 0 o 3 no cuenta.
  - `necesitaDesempate`: true para la vuelta con el global empatado; false para la ida empatada; true para el partido único empatado.
- [ ] **Step 2: Correr el test.** Esperado: FAIL con `Cannot find module '…/utils/cruces'`.
- [ ] **Step 3: Implementar `decidirCruce` y `necesitaDesempate`.**
- [ ] **Step 4: Correr el test.** Esperado: PASS.
- [ ] **Step 5: Agregar al test los casos de `recalcularLlave`** con el arnés y fixtures:
  - `propaga_ganador`: semifinal definida → la final tiene al ganador en el cupo de `es_local_siguiente`.
  - `cambio_sin_jugar`: se corrige la semifinal antes de jugar la final → el cupo cambia y un partido programado de la final se da de baja.
  - `cambio_con_final_jugada`: la final tiene un partido finalizado → lanza `ErrorCruce` con status 409.

  Correr: FAIL. Implementar `recalcularLlave` y volver a correr: PASS.

### Task 3: Partidos de cruce en `partido.controller.js`

**Files:**
- Modify: `backend/controllers/partido.controller.js` (`BASE_SELECT`, `crear`, `actualizar`, `eliminar`), `backend/utils/validators.js` (`validarCrearPartido` y un nuevo `validarActualizarPartido`), `backend/routes/partido.routes.js` (PUT usa `validarActualizarPartido`)
- Create (scratchpad): `test_t3_partidos_cruce.js`

**Interfaces:**
- Consumes: `recalcularLlave`, `necesitaDesempate` y `ErrorCruce` de la Tarea 2.
- Produces:
  - `BASE_SELECT` agrega, siempre con LEFT JOIN, por lo que es NULL si el partido no es de cruce:
    - `lp.formato AS cruce_formato`, `lp.fase AS cruce_fase`;
    - `lp.id_equipo_local AS cruce_id_local`, `lp.id_equipo_visitante AS cruce_id_visitante`;
    - `el.zona AS zona_local`, `ev.zona AS zona_visitante`;
    - `cruce_otro_partido`: json con `goles_local`, `goles_visitante`, `id_equipo_local` y `estado_partido` del otro partido activo del mismo cruce, o null.
  - Body nuevo de POST y PUT `/partidos`: `id_llave`, `numero_juego`, `id_equipo_desempate`, `penales_local`, `penales_visitante`.

- [ ] **Step 1: Escribir `test_t3_partidos_cruce.js`** con el arnés y token admin, sobre una división con semifinal (L, V; `ida_vuelta`) que lleva a la final (`unico`):
  - `crear_ida`: POST con `id_llave`, `numero_juego` 1, local V y visitante L → 201, `afecta_clasificacion` false y `nombre_partido` "Semifinal · Ida".
  - `crear_juego_repetido`: otra ida → 400.
  - `crear_equipo_ajeno`: un equipo que no es del cruce → 400.
  - `crear_juego_3`: `numero_juego` 3 → 400 (validador).
  - `crear_unico_juego_2`: en un cruce `unico`, `numero_juego` 2 → 400.
  - `crear_sin_equipos`: un cruce sin los dos equipos → 400.
  - `finalizar_vuelta_global_empatado_sin_desempate`: PUT con estado 2 y global empatado sin `id_equipo_desempate` → 400 con el mensaje "El cruce está empatado: elegí quién pasa."
  - `finalizar_con_desempate`: el mismo PUT con `id_equipo_desempate` L → 200, y `GET /playoff/:div` muestra a L en el cupo de la final.
  - `desempate_invalido`: `id_equipo_desempate` de un tercer equipo → 400.
  - `desempate_se_borra`: corregir los goles para que no haya empate → `id_equipo_desempate` queda NULL.
  - `correccion_bloqueada`: con un partido de la final finalizado, un PUT que cambia el ganador de la semifinal → 409, y el partido y la llave siguen igual.
  - `editar_equipo_ajeno`: un PUT que cambia `id_equipo_local` por un equipo fuera del cruce → 400.
  - `borrar_vuelta_desdefine`: con la final sin jugar, DELETE de la vuelta → la semifinal queda en `estado_partido` 1 y el cupo de la final en NULL.
  - `no_afecta_tabla`: un partido de cruce finalizado no cambia `clasificacion`.
  - `regular_sin_cambios`: crear y finalizar un partido regular sigue funcionando como antes.
  - `interzonal_campos`: `GET /partidos` devuelve `zona_local` y `zona_visitante`.
  - `goleadores_incluye_cruce`: los goles cargados con `POST /partidos/:id/estadisticas` en un partido de cruce aparecen en `GET /jugadores/goleadores/:id_division`.
- [ ] **Step 2: Correr el test.** Esperado: FAIL.
- [ ] **Step 3: Implementar.**
  - Validadores: `numero_juego` isIn [1, 2]; penales int ≥ 0 o null; `id_llave` e `id_equipo_desempate` int ≥ 1 o null.
  - `crear`, `actualizar` y `eliminar` corren dentro de `withTransaction`. Si el partido tiene `id_llave`, cada uno valida contra la llave (bloqueada con FOR UPDATE) y llama a `recalcularLlave`.
  - `ErrorCruce` → `respuestaError(res, e.message, e.status)`.
  - Si el resultado no está empatado, `id_equipo_desempate` se guarda NULL.
  - `id_llave` y `numero_juego` no se pueden cambiar por PUT.
  - El recálculo de clasificación y la resincronización de estadísticas de `eliminar` siguen como hoy.
- [ ] **Step 4: Correr el test.** Esperado: PASS (todos los casos).

### Task 4: Cuadro con formato por ronda en `playoff.controller.js`

**Files:**
- Modify: `backend/controllers/playoff.controller.js` (`generarBracket`, `actualizarResultado`, `obtenerPorDivision`, `reiniciarBracket`)
- Create (scratchpad): `test_t4_cuadro.js`

**Interfaces:**
- Consumes: `recalcularLlave` de la Tarea 2.
- Produces:
  - `POST /playoff/generar` acepta `formatos: { [fase]: 'unico' | 'ida_vuelta' }`, con fase ∈ {'16avos de Final', 'Octavos de Final', 'Cuartos de Final', 'Semifinal', 'Final'}. Lo que no viene es `'unico'`; un valor inválido → 422.
  - `GET /playoff/:id_division`: cada llave trae `partidos: [{ id_partido, numero_juego, fecha_partido, nombre_sede, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, penales_local, penales_visitante, id_equipo_desempate, estado_partido }]`, ordenado por `numero_juego`, solo los activos.
  - `PUT /playoff/:id` acepta solo `id_equipo_local`, `id_equipo_visitante` y `formato`. Rechaza con 400 los cambios de equipos o formato si la llave tiene partidos activos. Los campos de goles, penales, estado y ganador se ignoran.
  - `DELETE /playoff/division/:id` también da de baja los partidos de esas llaves, recalcula la clasificación por las dudas y resincroniza los acumuladores de los jugadores con estadísticas en esos partidos.

- [ ] **Step 1: Escribir `test_t4_cuadro.js`:**
  - `generar_formatos`: 8 equipos con `{ 'Cuartos de Final': 'ida_vuelta', Semifinal: 'ida_vuelta' }` → los cuartos y las semis tienen `ida_vuelta` y la final `unico`.
  - `formato_invalido`: `'mejor_de_3'` → 422.
  - `get_con_partidos`: después de crear la ida de un cuarto por `/partidos`, el GET la trae en `partidos`.
  - `put_ignora_goles`: un PUT con `goles_local` no cambia los goles.
  - `put_equipos_con_partidos`: cambiar `id_equipo_local` de una llave con partidos → 400.
  - `put_formato`: cambiar el formato sin partidos → 200; con partidos → 400.
  - `reiniciar_baja_partidos`: después de reiniciar, esos partidos tienen `activo = FALSE` y los goles de un jugador del club bajan en `jugador.goles_totales`.
  - `copas_siguen`: generar Oro y Plata sigue funcionando y no se mezclan.
- [ ] **Step 2: Correr el test.** Esperado: FAIL.
- [ ] **Step 3: Implementar.**
  - En `generarBracket`, guardar `formato` al insertar cada llave, según su `fase`.
  - En `obtenerPorDivision`, armar `partidos` con un `json_agg` en subconsulta.
  - Usar `withTransaction` en `reiniciarBracket`.
- [ ] **Step 4: Correr el test.** Esperado: PASS.

### Task 5: Zonas en el backend e historial

**Files:**
- Modify:
  - `backend/controllers/equipo.controller.js` (`crear` y `actualizar` aceptan `zona`)
  - `backend/utils/validators.js` (`validarCrearEquipo` y PUT: `zona` opcional, string, máximo 20)
  - `backend/utils/clasificacion.js` (`SQL_TABLA_PUBLICA` agrega `e.zona`)
  - `backend/controllers/clasificacion.controller.js` (`obtenerDetallePorDivision` agrega `e.zona`)
  - `backend/controllers/division.controller.js`:
    - la copia de equipos lleva `zona`;
    - el snapshot de partidos agrega `p.id_llave`, `p.numero_juego`, `p.penales_local`, `p.penales_visitante`, `p.id_equipo_desempate` y la zona de cada equipo;
    - el snapshot de cruces ya trae `lp.*`, que incluye `formato`.
- Create (scratchpad): `test_t5_zonas.js`

**Interfaces:**
- Produces:
  - `equipo.zona` en todas las respuestas de equipo.
  - `zona` en cada fila de `GET /clasificacion/:id_division`, de `/detalle` y de `historial_torneo.tabla_posiciones` de las ediciones nuevas.
  - Para normalizar: se recortan los espacios y `''` → NULL. Se guarda tal cual la escribió el usuario; el frontend agrupa sin distinguir mayúsculas.

- [ ] **Step 1: Escribir `test_t5_zonas.js`:**
  - `crear_con_zona`: POST de un equipo con `zona: ' A '` → `zona` 'A'.
  - `zona_vacia_null`: un PUT con `zona: ''` → NULL.
  - `zona_larga`: 21 caracteres → 400 o 422.
  - `tabla_trae_zona`: GET de clasificación → cada fila trae `zona`.
  - `interzonal_suma_en_ambas`: zona A (E1, E2) y zona B (E3, E4), con E1 1–0 E3 finalizado → E1 tiene 3 puntos y E3 un partido jugado.
  - `copiar_division_conserva_zona`: la copia de una división mantiene `zona`.
  - `snapshot_zona_y_cruce`: archivar con `finalizarYArchivarTorneo` (vía HTTP) una división con zonas y un cruce de ida y vuelta → `tabla_posiciones[*].zona` presente, los partidos del snapshot con `id_llave` y `numero_juego`, y el campeón igual al ganador de la final.
- [ ] **Step 2: Correr el test.** Esperado: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Correr el test.** Esperado: PASS. Correr de nuevo los tests de las Tareas 2, 3 y 4. Esperado: PASS.

### Task 6: Utilidades del frontend (`utils/playoffs.js` y `utils/zonas.js`)

**Files:**
- Modify: `frontend/src/utils/playoffs.js`
- Create: `frontend/src/utils/zonas.js`
- Create (scratchpad): `test_t6_utils.mjs`, que importa los módulos con `node`. Son ESM puros sin JSX ni imports de React; si alguno importa algo de Vite, se extrae esa parte.

**Interfaces:**
- Produces:
  - `FORMATOS_CRUCE = [{ valor: 'unico', etiqueta: 'Partido único' }, { valor: 'ida_vuelta', etiqueta: 'Ida y vuelta' }]`.
  - `resumenCruce(llave) -> { global: { local, visitante } | null, partidos: [{ etiqueta, local, visitante, desempate }], desempate: string | null }`.
    - `etiqueta`: "Ida", "Vuelta" o "".
    - `desempate`: "(4-3 pen.)" o "(pasa <nombre>)".
    - En una llave de legado, sin `partidos` ni `formato`, devuelve el global con los goles de la llave y el desempate con los penales de la llave, como se ve hoy.
  - `necesitaDesempateFront(partido, golesLocal, golesVisitante) -> boolean`: usa `cruce_formato`, `numero_juego` y `cruce_otro_partido` de la Tarea 3 y da lo mismo que el backend.
  - `nombrePartidoCruce(fase, formato, numeroJuego) -> string`: "Semifinal · Ida", "Semifinal · Vuelta" o "Final".
  - `agruparPorZona(filas) -> [{ zona: string | null, titulo, filas }]`.
    - Si ninguna fila tiene zona, devuelve un solo grupo con `zona: null` y `titulo: null`.
    - Si alguna tiene, devuelve un grupo por zona, ordenados con `localeCompare('es')`, con `titulo` "Zona A", y al final "Sin zona" si hace falta.
    - Agrupa sin distinguir mayúsculas y usa como título la primera escritura encontrada.
  - `esInterzonal(partido) -> boolean`: las dos zonas no nulas y distintas, sin distinguir mayúsculas.

- [ ] **Step 1: Escribir `test_t6_utils.mjs`:**
  - `agruparPorZona_sin_zonas`: un solo grupo.
  - `agruparPorZona_dos`: los grupos A y B ordenados.
  - `agruparPorZona_sin_zona`: un equipo sin zona va al final, en "Sin zona", y el total de filas se conserva.
  - `agruparPorZona_mayusculas`: 'a' y 'A' van al mismo grupo.
  - `resumenCruce_legado`: una llave con goles 2–2 y penales 4–3, sin `partidos` → desempate "(4-3 pen.)".
  - `resumenCruce_iv`: ida y vuelta con los dos partidos → el global suma bien con la localía invertida.
  - `resumenCruce_pasa`: desempate sin penales → "(pasa X)".
  - `necesitaDesempateFront`: los mismos 3 casos de la Tarea 2.
  - `esInterzonal`: A/B → true; A/A → false; A/null → false.
- [ ] **Step 2: Correr** `node test_t6_utils.mjs`. Esperado: FAIL.
- [ ] **Step 3: Implementar.** `normalizarLlave` sigue aceptando snapshots viejos.
- [ ] **Step 4: Correr.** Esperado: PASS.

### Task 7: Tablas por zona, equipos con zona e interzonales

**Files:**
- Modify:
  - `frontend/src/components/standings/StandingsTable.jsx`
  - `frontend/src/components/admin/PosicionesManager.jsx`
  - `frontend/src/pages/HistorialPage.jsx` y `frontend/src/components/admin/HistorialManager.jsx` (tabla del snapshot)
  - `frontend/src/components/admin/EquiposManager.jsx`
  - `frontend/src/components/standings/FixtureList.jsx` y la lista de partidos de `frontend/src/pages/AdminPage.jsx`
- Create (temporal, se borra al final): `frontend/prueba-zonas.html` y `frontend/src/prueba-zonas.jsx`

**Interfaces:**
- Consumes: `agruparPorZona` y `esInterzonal` de la Tarea 6; `zona` de la Tarea 5; `zona_local` y `zona_visitante` de la Tarea 3.

- [ ] **Step 1: Crear la página temporal** con la API simulada. Monta `StandingsTable` (con y sin zonas), `PosicionesManager`, `EquiposManager` y `FixtureList` con datos de dos zonas y un interzonal.
- [ ] **Step 2: Verificar en el navegador** que hoy no hay agrupación. Esperado: falla, porque se ve una sola tabla.
- [ ] **Step 3: Implementar.**
  - Las tablas usan `agruparPorZona` y, si hay más de un grupo, muestran un título por bloque con el estilo de títulos existente. La posición se numera dentro de cada zona.
  - En `EquiposManager`, input "Zona" (máximo 20) con `<datalist>` de las zonas existentes del torneo, enviado en POST y PUT; el listado se agrupa por zona.
  - En `FixtureList` y la lista del panel, una etiqueta "Interzonal" chica cuando `esInterzonal(p)`.
- [ ] **Step 4: Verificar en el navegador**, en escritorio y a 375 px:
  - con zonas se ven bloques "Zona A" y "Zona B", y "Sin zona" al final;
  - sin zonas se ve igual que antes;
  - la etiqueta "Interzonal" aparece solo en el interzonal;
  - el POST de equipo lleva `zona`;
  - `document.documentElement.scrollWidth <= innerWidth`.

### Task 8: Cuadro con partidos reales en el panel y en el sitio

**Files:**
- Modify:
  - `frontend/src/components/admin/PlayoffsManager.jsx`:
    - en la generación, un selector de formato por ronda;
    - `LlavePartidoCard`: muestra los partidos y el botón "Programar…", y saca los inputs de goles, penales, ganador y "Terminado";
    - modal nuevo `ProgramarPartidoCruceModal` en el mismo archivo.
  - `frontend/src/pages/AdminPage.jsx`: en el modal "Cargar Resultado", si `partidoEditando.id_llave`, aparecen "¿Quién pasa?" y los penales opcionales cuando `necesitaDesempateFront` da true, y se envían en el PUT.
  - `frontend/src/components/standings/PlayoffBracket.jsx` y la vista de cuadro del historial: usan `resumenCruce`.
- Create (temporal): `frontend/prueba-cruces.html` y `frontend/src/prueba-cruces.jsx`

**Interfaces:**
- Consumes:
  - `FORMATOS_CRUCE`, `resumenCruce`, `necesitaDesempateFront` y `nombrePartidoCruce` de la Tarea 6.
  - `POST /playoff/generar` con `formatos` y `GET /playoff/:id` con `partidos`, de la Tarea 4.
  - `POST /partidos` con `id_llave` y `numero_juego`, de la Tarea 3.
- `ProgramarPartidoCruceModal({ llave, numeroJuego, sedes, onClose, onCreado })`:
  - campos: sede (obligatoria) y fecha y hora (obligatoria, `desdeInputFechaHora` de `utils/fechas.js`);
  - botón "Invertir localía";
  - local y visitante propuestos según la convención de la spec: en la ida, local = visitante del cruce; en la vuelta y en el partido único, local = local del cruce;
  - `nombre_partido` lo arma `nombrePartidoCruce`.
- El botón de cada cruce depende de lo que falta:
  - `unico` sin partido → "Programar partido";
  - `ida_vuelta` sin ida → "Programar ida";
  - con ida y sin vuelta → "Programar vuelta";
  - con los dos partidos → no hay botón.
  - No aparece si al cruce le falta un equipo.
- La carga del resultado se hace en la pestaña Partidos. La tarjeta muestra el texto "El resultado se carga en Partidos".

- [ ] **Step 1: Crear la página temporal** con la API simulada: un cuadro de 4 con semis `ida_vuelta` y final `unico`, una semi con la ida jugada, la otra definida por desempate, y un historial viejo con penales en la llave.
- [ ] **Step 2: Verificar** que hoy la tarjeta muestra inputs de goles. Esperado: falla respecto de lo pedido.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Verificar en el navegador**, en escritorio y a 375 px:
  - el generador manda `formatos` con el valor elegido por ronda;
  - "Programar vuelta" abre el modal con la localía propuesta y hace POST con `numero_juego` 2;
  - el modal de resultado de un partido de vuelta con el global empatado muestra "¿Quién pasa?" y no deja guardar finalizado sin elegir;
  - `PlayoffBracket` muestra el global, el detalle "Ida 2-1 · Vuelta 1-1" y "(pasa X)";
  - el historial viejo se ve como antes;
  - no hay scroll horizontal en la página.

### Task 9: Datos de demo, documentación y cierre

**Files:**
- Modify:
  - `backend/scripts/seed_demo.js`:
    - `jugarPlayoffs` crea partidos reales con `id_llave` mediante `insertar(client, 'partido', …)` y llama a `recalcularLlave(client, id)` en lugar de escribir los goles en la llave. Las semis de un torneo se juegan `ida_vuelta`, y al menos un cruce se define por desempate.
    - Un torneo tiene dos zonas e interzonales.
    - `verificar()` agrega estos chequeos: el ganador de cada llave coincide con `decidirCruce` sobre sus partidos; ningún partido con `id_llave` tiene `afecta_clasificacion`; la suma de puntos por zona es igual a la suma total.
  - `CLAUDE.md` (local): sección Torneos con zonas, formatos, partidos de cruce y `recalcularLlave`.
  - `README.md`: mencionar zonas y cruces.
  - `frontend/src/pages/LegalPage.jsx`: no cambia, porque no hay datos personales nuevos. Lo confirma el revisor.
- Delete: las páginas temporales de las Tareas 7 y 8.

- [ ] **Step 1: Verificar el seed sin borrar datos.** `node --check scripts/seed_demo.js` y una revisión de `jugarPlayoffs` contra la convención de localía. Esperado: sin errores de sintaxis.
- [ ] **Step 2: Correr los tests de las Tareas 1 a 6.** Esperado: todos PASS.
- [ ] **Step 3: En `frontend/`, correr `npm run lint` y `npm run build`.** Esperado: build OK y ningún aviso nuevo en los archivos tocados.
- [ ] **Step 4: Confirmar que no quedó nada de las pruebas en la base**: ninguna división, equipo o partido de los fixtures.
- [ ] **Step 5: Pedirle al dueño el OK** para correr `seed_demo.js --reset`, con las verificaciones nuevas, y para commitear y pushear. No hacer ninguna de las dos cosas sin ese OK.
