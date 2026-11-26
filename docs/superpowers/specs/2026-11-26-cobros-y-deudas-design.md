# Cobros y deudas por concepto — diseño

## Intención
El coordinador de futsal lleva en Excel, por categoría y jugador, todo lo que cada uno tiene que pagar y lo que pagó:
cuota mensual, inscripción (dos pagos semestrales), seguro (tres cuotas), indumentaria, aporte por partido,
viajes, nutricionista, gimnasio. Marca cada casillero como "Pago", "Debe", "Canje" o "NO". El sistema hoy solo
registra el pago de la cuota mensual, sin deuda previa. Objetivo: reemplazar esa planilla por el sistema, sabiendo
en todo momento quién debe qué, y que cada peso cobrado quede en la caja con su concepto.

Todavía no hay datos reales cargados (solo la demo), así que se puede rehacer el modelo de cuotas sin migrar nada.

## Objetivos
- Cargar deudas por concepto a un jugador o a un equipo entero ("inscripción 20 mil a toda la 3ra").
- Cobrar total o parcialmente cada deuda; el cobro entra a la caja con el concepto como categoría.
- Canje: salda la deuda sin entrar plata a la caja, con motivo y autor.
- "No corresponde": anula una deuda con motivo, sin borrarla.
- Ver por jugador su estado de cuenta, y por equipo una planilla jugadores × deudas como la del Excel.
- La cuota mensual pasa a ser un concepto más. "Al día" = no tiene deudas vencidas.

## No objetivos (por ahora)
- Recargo por pago fuera de término (el Excel anota "rec 2.5 - 5mil"): se puede sumar después como concepto.
- Un único pago que salde varias deudas a la vez: se cobra deuda por deuda.
- Cobro online, avisos automáticos a los jugadores, portal del jugador.
- Sueldos del cuerpo técnico, rendición de lo que cobra cada DT, presupuesto de la obra.

## Anti-objetivos
- Un cobro en efectivo o transferencia que no deje movimiento en la caja.
- Editar o borrar un pago o una deuda: solo se anulan con motivo, quién y cuándo (CLAUDE.md: toda operación
  financiera trazable).
- Cobrar dos veces la misma cuota mensual a un jugador que está en dos equipos.

## Enfoques considerados
- **A. Cuota mensual como está + deudas aparte para el resto.** Menos riesgo sobre lo que funciona, pero dos
  modelos de cobro conviviendo.
- **B. Todo como deuda, incluida la cuota mensual (elegido).** Un solo modelo, igual al Excel. Su costo era
  rehacer el cobro de cuotas y migrar datos; sin datos reales, la migración no existe.
- **C. Agregar "concepto" a `cuota_jugador`.** Descartado: esa tabla es por mes (UNIQUE jugador+mes+año) y los
  cobros únicos (indumentaria, viaje) no encajan; además arrastra la lógica de vencimiento +31 días.

## Modelo de datos (nueva sección 25 del esquema + script de migración)
- `concepto_cobro`: `id_concepto`, `nombre` (único), `monto_sugerido` (nullable), `es_mensual` (bool),
  `activo`, `created_at`. Se precargan: Cuota mensual (mensual), Inscripción, Seguro, Indumentaria,
  Aporte por partido, Viaje.
- `cargo_jugador` (una deuda): `id_cargo`, `id_jugador`, `id_concepto`, `id_equipo` (nullable: equipo desde el
  que se cargó), `periodo_mes`/`periodo_anio` (obligatorios si el concepto es mensual), `descripcion` (texto
  libre: "1er semestre", "Fecha 3 vs D10 FC"), `monto` (> 0), `fecha_vencimiento`, `no_corresponde` (bool),
  `motivo_no_corresponde`, `marcado_por`, `fecha_marcado`, `creado_por`, `activo`, `created_at`.
  Índice único parcial `(id_jugador, id_concepto, periodo_anio, periodo_mes) WHERE activo AND periodo_mes IS NOT NULL`.
- `pago_cargo`: `id_pago`, `id_cargo`, `monto` (> 0), `fecha_pago`, `metodo_pago` (Efectivo, Transferencia,
  MercadoPago, Débito, Crédito, Otro, Canje), `observaciones` (obligatoria en Canje), `registrado_por`,
  `activo`, `motivo_anulacion`, `anulado_por`, `fecha_anulacion`, `created_at`.
- `gasto_club.id_pago` (FK a `pago_cargo`): el movimiento de caja de cada cobro que no es canje.
- Estado de una deuda (derivado, no se guarda): No corresponde · Pagada (pagos activos ≥ monto) · Parcial ·
  Vencida (saldo > 0 y vencimiento < hoy) · Pendiente.
- `cuota_jugador`, `jugador.fecha_vencimiento` y `jugador.fecha_ultimo_pago` quedan en la base pero el código
  deja de usarlos. `jugador.es_inactivo` sigue siendo la marca manual de jugador inactivo.

## API (`/api/cobros`, con token; Superadmin, Administrador y Tesorero salvo donde se indica)
- `GET/POST /conceptos`, `PUT /conceptos/:id` (nombre, monto sugerido, activo).
- `POST /cargos` — `{ id_concepto, monto, fecha_vencimiento, periodo_mes?, periodo_anio?, descripcion?,
  id_jugador | id_equipo }`. Con equipo, crea una deuda por cada jugador activo del plantel. Omite (y cuenta)
  a quien ya tiene esa misma deuda activa: mismo concepto y período si es mensual, mismo concepto y
  descripción si no. Responde `{ creados, omitidos }`.
- `GET /cargos?id_equipo=&id_jugador=&id_concepto=&estado=` — deudas con pagado y saldo.
- `GET /jugadores/:id/estado-cuenta` — deudas con sus pagos, saldo total y saldo vencido.
- `POST /cargos/:id/pagos` — `{ monto, metodo_pago, fecha_pago?, observaciones? }`. No puede superar el saldo.
  En una transacción: crea el pago y, si no es canje, el INGRESO de caja con `categoria = nombre del concepto`
  y `concepto = "<Concepto> - <Apellido> <Nombre> - <período o descripción>"`.
- `POST /cargos/:id/no-corresponde` — `{ motivo }`. Solo si la deuda no tiene pagos activos.
- `POST /pagos/:id/anular` — `{ motivo }`. Superadmin y Administrador. Anula el pago y su movimiento de caja.
- `POST /gastos/:id/anular` existente: si el movimiento tiene `id_pago`, anula también el pago.
- Se eliminan `/api/cuotas/*` y `utils/cobrosCuota.js`; `GET /gastos/resumen` deja de sumar `cuota_jugador`
  aparte (todos los cobros ya están en la caja) y agrega deuda pendiente y vencida del total.

## Estado del jugador
`estado_cuota` (mismo nombre de campo que hoy en jugadores, plantel y finanzas): `Inactivo` si `es_inactivo`;
`Pendiente` si tiene saldo vencido; si no, `Al dia`. Se agregan `deuda_total` y `deuda_vencida`.
Donde hoy se muestra "vence el ..." se muestra lo que debe.

## Interfaz (Finanzas)
- Pestaña **Cobros** (reemplaza Cuotas): lista de jugadores con estado y deuda, filtros por división/equipo,
  estado y búsqueda. Botón **Cargar deuda** (concepto → monto sugerido, vencimiento, período o descripción,
  destino equipo o jugador; al confirmar muestra creados/omitidos).
- **Estado de cuenta** del jugador (modal): deudas pendientes primero, con Cobrar (monto por defecto = saldo,
  método incluido Canje) y No corresponde; pagos con Anular.
- **Planilla por equipo**: filas = jugadores del plantel, columnas = deudas cargadas a ese equipo
  (concepto + período/descripción), celda = Pagado / Debe $ / Parcial / Canje / NO; clic en la celda abre el cobro.
- **Conceptos**: lista editable (alta, monto sugerido, desactivar).
- Caja y Resumen siguen igual; el resumen suma la deuda pendiente.

## Legal
Cambian los datos financieros que se registran: actualizar `LegalPage.jsx` (qué datos tratamos, qué no se
publica) y `docs/legal/consentimiento-socios.md` para hablar de cobros por concepto en lugar de cuotas.

## Demo
`seed_demo.js` pasa a generar conceptos, deudas (cuota mensual, inscripción, seguro), pagos parciales, un canje
y un "no corresponde", y sus chequeos comparan pagos no canje con ingresos de caja vinculados por `id_pago`.
Correr `--reset` borra la base: solo con OK del usuario.

## Decisiones de detalle (criterio propio, a revisar)
- "Jugador activo del plantel" = `equipo_jugador.activo`, `jugador.activo` y no `es_inactivo`: a un jugador
  marcado inactivo no se le generan deudas por equipo.
- Vencimiento sugerido: día 10 del mes para conceptos mensuales; para el resto, la fecha que se elija.
- El pago toma la fecha de hoy si no se indica; el movimiento de caja usa esa misma fecha.
- Un concepto desactivado no admite deudas nuevas; las existentes se siguen viendo y cobrando.
- La categoría de caja guarda el nombre del concepto al momento del cobro; renombrar un concepto no cambia
  movimientos pasados.
- La planilla por equipo muestra las deudas con `id_equipo` de ese equipo. Una deuda cargada a un jugador suelto
  puede indicar equipo; si no, solo aparece en su estado de cuenta.
- En la planilla, una deuda saldada con al menos un pago en canje se muestra como "Canje".
- "No corresponde" lo puede marcar quien cobra (incluido Tesorero); anular pagos, solo Superadmin y Administrador,
  igual que hoy en la caja.
- Se quita el código viejo de cuotas que quedó en `AdminPage.jsx` (estado `cuotas`, edición de cuota sin uso).

## Queda a criterio de quien lo construya
Textos, orden de columnas de la planilla, formato de montos, y si la planilla pagina o hace scroll horizontal
(debe ser usable a 375 px sin scroll horizontal de la página).
