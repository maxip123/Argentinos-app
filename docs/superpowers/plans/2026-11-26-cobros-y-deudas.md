# Cobros y deudas por concepto — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar las cuotas por deudas por concepto (cuota mensual incluida) que se cobran total o parcialmente, con canje y "no corresponde", todo trazable en la caja.

**Architecture:** Tres tablas nuevas (`concepto_cobro`, `cargo_jugador`, `pago_cargo`) y `gasto_club.id_pago`. Un módulo `/api/cobros` concentra la lógica; el estado del jugador (`estado_cuota`, `deuda_total`, `deuda_vencida`) sale de un fragmento SQL compartido en `utils/deudas.js`. El front reemplaza la pestaña Cuotas de Finanzas por Cobros (lista, estado de cuenta, cargar deuda, conceptos) y suma la planilla por equipo.

**Tech Stack:** Express 5 + `pg` (SQL crudo), express-validator, React 19 + Vite + Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-11-26-cobros-y-deudas-design.md`

## Global Constraints
- Toda operación financiera trazable: pagos y deudas no se editan ni se borran; se anulan con motivo, autor y fecha.
- Cada pago que no es Canje crea exactamente un INGRESO en `gasto_club` con `id_pago`, `categoria` = nombre del concepto y `concepto` = `"<Concepto> - <Apellido> <Nombre> - <período o descripción>"`, en la misma transacción.
- Métodos de pago: Efectivo, Transferencia, MercadoPago, Débito, Crédito, Otro, Canje. Canje exige observaciones y no genera caja.
- Un pago no puede superar el saldo de la deuda. "No corresponde" solo sin pagos activos.
- Roles: Superadmin, Administrador y Tesorero para todo `/api/cobros`, salvo anular pagos (Superadmin, Administrador).
- Estado: `Inactivo` si `es_inactivo`; `Pendiente` si `deuda_vencida > 0`; si no, `Al dia` (mismos valores que hoy).
- Respuestas con `utils/respuesta.js`; UI en español, sin emojis, sin `window.confirm`/`alert`, responsive a 375 px.
- Sin suite de tests: cada tarea de backend se verifica con un script en el scratchpad que corre los handlers reales dentro de una transacción con `ROLLBACK` (mismo esqueleto que `probar_logos.js`). Front: `npm run lint` sin errores nuevos y `npm run build`.
- No commitear ni pushear sin pedido del usuario. No correr `seed_demo.js --reset` sin su OK.

## Review Focus
- Jugador en dos equipos al cargar la cuota mensual a ambos → una sola deuda (la segunda carga la cuenta como omitida). (Task 2)
- Dos cobros simultáneos sobre la misma deuda que juntos superan el saldo → el segundo da 400 (bloqueo `FOR UPDATE` de la deuda). (Task 2)
- Anular desde la caja un cobro de deuda → el pago se anula y la deuda vuelve a tener saldo; anular desde el estado de cuenta → el movimiento de caja se anula. (Task 3)
- Monto con decimales o como texto ("20000.50", "20.000") → se acepta el número válido y se rechaza el texto con formato inválido con 400. (Task 2)
- Deuda vencida hoy (vencimiento = fecha actual) → todavía no cuenta como vencida; vence al día siguiente. (Task 3)

---

### Task 1: Esquema y migración

**Files:**
- Create: `backend/scripts/migrate_cobros_conceptos.js`
- Modify: `schema_supabase.sql` (sección 25 al final, mismo SQL; local, no versionado)

**Interfaces:**
- Produces: tablas `concepto_cobro`, `cargo_jugador`, `pago_cargo` y columna `gasto_club.id_pago`, con las columnas del spec (montos `NUMERIC(12,2)`, `CHECK (monto > 0)`, `metodo_pago` con `CHECK` sobre los 7 valores, índice único parcial de cuota mensual, índices por `id_jugador`, `id_cargo`, `id_equipo`), RLS habilitado. Conceptos precargados con `ON CONFLICT (nombre) DO NOTHING`: Cuota mensual (es_mensual), Inscripción, Seguro, Indumentaria, Aporte por partido, Viaje.

- [ ] **Step 1:** Escribir el script idempotente (patrón de `migrate_logos_equipos.js`), con chequeo final que imprime cantidad de conceptos.
- [ ] **Step 2:** Correrlo dos veces; esperado: "Conceptos: 6" ambas veces, sin errores.
- [ ] **Step 3:** Agregar la sección 25 a `schema_supabase.sql`.

### Task 2: Módulo `/api/cobros`

**Files:**
- Create: `backend/utils/deudas.js`, `backend/controllers/cobro.controller.js`, `backend/routes/cobro.routes.js`
- Modify: `backend/utils/validators.js`, `backend/index.js` (montar `/api/cobros`)
- Test: `<scratchpad>/probar_cobros.js`

**Interfaces:**
- Produces:
  - `utils/deudas.js`: `SQL_CARGOS_CON_SALDO` (cargos activos con `pagado`, `saldo`, `estado` ∈ `No corresponde|Pagada|Parcial|Vencida|Pendiente`, `tiene_canje`, nombre del concepto); `sqlDeudaJugador(aliasJugador)` → fragmento con `deuda_total`, `deuda_vencida`; `sqlEstadoCuota(aliasJugador)` → `CASE` de Global Constraints. Vencida = `fecha_vencimiento < CURRENT_DATE`.
  - Endpoints del spec: `GET/POST /conceptos`, `PUT /conceptos/:id`, `POST /cargos` → `{ creados, omitidos }`, `GET /cargos`, `GET /jugadores/:id/estado-cuenta` → `{ cargos: [... pagos: [] ], deuda_total, deuda_vencida }`, `POST /cargos/:id/pagos`, `POST /cargos/:id/no-corresponde`, `POST /pagos/:id/anular`.
  - `anularPago(client, idPago, motivo, idUsuario)` exportada desde el controller para reusar en Task 3.

- [ ] **Step 1: Script de prueba.** Asserts:
  - Concepto nuevo se crea; nombre repetido → 409; concepto desactivado no admite deudas (400).
  - Cuota mensual de noviembre a un equipo → `creados` = jugadores activos del plantel (sin `es_inactivo`); repetir → todos omitidos; jugador de dos equipos → una sola deuda.
  - Concepto mensual sin período → 400; monto `"20.000"` → 400; monto `"20000.50"` → 201.
  - Pago parcial 10000 de 20000 → estado Parcial, saldo 10000, un INGRESO con `id_pago` y categoría "Inscripción"; pago 15000 → 400 (supera saldo); pago 10000 → Pagada.
  - Canje sin observaciones → 400; con observaciones → salda y no crea movimiento de caja.
  - No corresponde con pagos activos → 409; sin pagos → estado "No corresponde" con motivo y autor.
  - Anular pago → pago inactivo, movimiento de caja inactivo con motivo, saldo vuelve.
  - Estado de cuenta: `deuda_vencida` cuenta solo vencimientos `< hoy` (vencimiento hoy no suma).
- [ ] **Step 2:** Correrlo; esperado: falla al no existir el controller.
- [ ] **Step 3:** Implementar. Pagos y no-corresponde bloquean la deuda con `SELECT ... FOR UPDATE` antes de calcular el saldo. Carga por equipo en una transacción; omitidos por índice único (mensual) o por concepto + `lower(descripcion)` activos.
- [ ] **Step 4:** Correr; esperado: todo OK y "todo deshecho con ROLLBACK".

### Task 3: Integración con caja, estado del jugador y retiro de cuotas

**Files:**
- Modify: `backend/controllers/gasto.controller.js` (`anular`, `obtenerResumen`), `backend/controllers/jugador.controller.js`, `backend/controllers/equipo.controller.js` (`obtenerPlantel`), `backend/index.js`, `backend/utils/validators.js` (quitar `validarCrearCuota`)
- Delete: `backend/controllers/cuota.controller.js`, `backend/routes/cuota.routes.js`, `backend/utils/cobrosCuota.js`
- Test: ampliar `<scratchpad>/probar_cobros.js`

**Interfaces:**
- Consumes: `anularPago`, `sqlDeudaJugador`, `sqlEstadoCuota` (Task 2).
- Produces: `GET /gastos/resumen` → `ingresos: { total_ingresos, ... }` sin `total_cuotas/cuotas_pagadas/cuotas_pendientes`, más `deudas: { pendiente, vencida }`. Jugadores y plantel devuelven `estado_cuota`, `deuda_total`, `deuda_vencida` (sin `fecha_vencimiento`/`fecha_ultimo_pago`). Filtro `estado_cuota=pendiente|al_dia|inactivo|activos` igual que hoy.

- [ ] **Step 1:** Asserts nuevos: anular por `/gastos/:id/anular` un cobro de deuda anula el pago y devuelve saldo; jugador con deuda vencida → `Pendiente` en lista y plantel, sin deuda → `Al dia`; filtro `pendiente` lo incluye; resumen del mes suma el cobro una sola vez y reporta deuda.
- [ ] **Step 2:** Correr; esperado: fallan los asserts nuevos.
- [ ] **Step 3:** Implementar y quitar el código de cuotas. `grep -rn "cuota_jugador\|cobrosCuota\|CATEGORIA_CUOTA" backend --include=*.js` solo puede quedar en scripts viejos de `backend/scripts/` (no `seed_demo.js`).
- [ ] **Step 4:** Correr el script completo y `node -e "require('./index.js')"` con `VERCEL=1`; esperado: todo OK, carga sin errores.

### Task 4: Pestaña Cobros en Finanzas

**Files:**
- Create: `frontend/src/components/admin/cobros/CargarDeudaModal.jsx`, `EstadoCuentaModal.jsx`, `ConceptosModal.jsx`, `frontend/src/utils/cobros.js`
- Modify: `frontend/src/components/admin/FinanzasManager.jsx` (pestaña `cuotas` → `cobros`, quitar modales de cuota, resumen sin campos de cuotas y con deuda)

**Interfaces:**
- Consumes: endpoints de Task 2 y resumen de Task 3.
- Produces: `utils/cobros.js` con `METODOS_PAGO` (los 7), `formatearMonto(n)` (`$ 20.000`), `etiquetaPeriodo(cargo)` ("Noviembre 2026" o la descripción), `COLOR_ESTADO` por estado de deuda.

- [ ] **Step 1:** Implementar los tres modales y la pestaña. Cargar deuda: al elegir concepto se completa su monto sugerido; si es mensual pide mes/año y sugiere vencimiento el día 10 de ese mes; destino equipo o jugador, y con jugador un equipo opcional (para que aparezca en la planilla). Cobrar: monto por defecto = saldo; Canje muestra observaciones obligatorias. No corresponde y Anular piden motivo con `ConfirmModal` o campo de texto, nunca `window.confirm`.
- [ ] **Step 2:** `npm run lint` sin errores nuevos y `npm run build`.

### Task 5: Planilla por equipo

**Files:**
- Create: `frontend/src/components/admin/cobros/PlanillaEquipo.jsx`
- Modify: `frontend/src/components/admin/FinanzasManager.jsx` (vista dentro de Cobros: "Por jugador" / "Planilla por equipo")

**Interfaces:**
- Consumes: `GET /cobros/cargos?id_equipo=`, `GET /equipos/:id/plantel`, `EstadoCuentaModal` (Task 4).
- Produces: grilla filas = plantel, columnas = (concepto, período/descripción) de las deudas de ese equipo en orden de vencimiento; celda Pagado / Debe $ / Parcial / Canje / NO / vacío (sin deuda); clic abre el estado de cuenta del jugador. Scroll horizontal dentro de la grilla, primera columna fija; la página no scrollea en horizontal a 375 px.

- [ ] **Step 1:** Implementar.
- [ ] **Step 2:** `npm run lint` y `npm run build`.

### Task 6: Otros lugares que mostraban la cuota

**Files:**
- Modify: `frontend/src/components/admin/JugadoresManager.jsx`, `frontend/src/components/admin/EquiposManager.jsx` (badges y "vence el..." → deuda), `frontend/src/pages/AdminPage.jsx` (quitar `cuotas`, `formCuota`, `handleActualizarCuota` y la llamada a `/cuotas`)

- [ ] **Step 1:** Reemplazar. `grep -rn "/cuotas\|fecha_vencimiento\|fecha_ultimo_pago" frontend/src` sin resultados.
- [ ] **Step 2:** `npm run lint` y `npm run build`.

### Task 7: Legal, demo y documentación

**Files:**
- Modify: `frontend/src/pages/LegalPage.jsx`, `docs/legal/consentimiento-socios.md`, `backend/scripts/seed_demo.js`, `CLAUDE.md` (sección Finanzas; local)

- [ ] **Step 1:** Legal: "Cuotas sociales: período, monto, fecha, método de pago y vencimiento" → cobros por concepto (concepto, período, monto, vencimiento, pagos y método); "estado de cuotas" → "deudas y pagos" en lo que no se publica; fecha de actualización.
- [ ] **Step 2:** `seed_demo.js`: generar conceptos, deudas (cuota mensual, inscripción, seguro), pagos parciales, un canje y un no corresponde, con caja vinculada por `id_pago`; chequeos: suma de pagos no canje activos = suma de ingresos de caja con `id_pago`; ningún ingreso de cobro sin `id_pago`. `node --check`.
- [ ] **Step 3:** CLAUDE.md: reemplazar la descripción de `cuota_jugador`/pago-rápido por el modelo nuevo.

### Task 8: Verificación final
- [ ] **Step 1:** Re-correr `probar_cobros.js` completo y confirmar que no quedó nada escrito en la base.
- [ ] **Step 2:** Página de prueba temporal (como en logos) para montar `CargarDeudaModal`, `EstadoCuentaModal` y `PlanillaEquipo` con la API **simulada** (un adapter de axios en la página con datos en memoria; el backend local escribe en la base de producción, así que no se usa); probar cobrar parcial, canje, no corresponde y la planilla a 375 px. Borrarla al terminar.
- [ ] **Step 3:** Revisión final del diff completo; reportar decisiones tomadas. Commit/push y `seed_demo --reset` solo si el usuario lo pide.
