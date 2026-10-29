# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

MVP de gestión del Club Argentinos del Norte (futsal, Liga AFA Tucumán): padrón de jugadores, planteles, partidos, tablas, playoffs, historial de torneos, cuotas y caja. Todo el código, la UI y los mensajes de commit están en español.

### Reglas de negocio (no derivables del código)

- Solo se cargan jugadores, goles y tarjetas de **Argentinos del Norte**. Los equipos rivales existen (fixture, resultados, tabla) pero sin plantel ni estadísticas individuales. Se distinguen con `equipo.es_argentinos_del_norte` y `jugador.es_jugador_club`.
- Un jugador puede estar en **varios equipos del club a la vez** (`equipo_jugador`, N-a-M). `jugador.id_equipo` / `jugador.id_division` son columnas legadas; usar `equipo_jugador`.
- Pagos y caja son prioridad: toda operación financiera debe quedar trazable.
- Debe quedar historial permanente de cada torneo con su tabla.
- La UI debe ser responsive. Al dueño le gusta la visual actual: no rediseñar sin que lo pida.

## Comandos

Backend (`backend/`, Node + Express 5, CommonJS):
```bash
npm run dev      # nodemon index.js, puerto 4000 (health: /api/health)
npm start
node scripts/run_schema_and_seed.js   # aplica ../schema_supabase.sql y ../seed_data.sql a DATABASE_URL
node scripts/seed_demo.js --reset     # BORRA todo salvo el usuario admin y carga una temporada de demo completa
```

`seed_demo.js` archiva los torneos terminados llamando a los handlers reales (`finalizarYArchivarTorneo` + `iniciarNuevaEdicion`), así que corre en fases y termina con chequeos de consistencia (goles vs. resultados, tabla, caja vs. cuotas, historial).

Frontend (`frontend/`, React 19 + Vite, ESM):
```bash
npm run dev      # Vite en :5173
npm run build
npm run lint     # oxlint
```

No hay suite de tests. `backend/scripts/test_flow_complete.js` es un script manual de flujo end-to-end contra la base real; el resto de `backend/scripts/` son migraciones/chequeos puntuales ya ejecutados.

Variables: `backend/.env` (ver `.env.example`: `DATABASE_URL` del pooler de Supabase, `JWT_SECRET`, `JWT_EXPIRES_IN`) y `frontend/.env` (`VITE_API_URL`, default `http://localhost:4000/api`).

## Arquitectura

### Base de datos
- PostgreSQL en Supabase. **El esquema vive en `schema_supabase.sql`** (raíz), que es una sucesión acumulativa de `CREATE ... IF NOT EXISTS` + `ALTER` (secciones numeradas 1–20). Los cambios de esquema se agregan al final como nueva sección idempotente. Ojo: `*.sql` está en `.gitignore`, así que ese archivo no se versiona.
- Prisma está instalado pero `prisma/schema.prisma` no tiene modelos: **no se usa**. Todo el acceso es SQL crudo vía `pg` en `backend/config/db.js` (`query(text, params)` y `withTransaction(async client => ...)`).
- Lógica en la base que el backend invoca:
  - `recalcular_clasificacion_division(id)`: reconstruye `clasificacion` desde partidos finalizados (`estado_partido = 2`, `afecta_clasificacion`). Se dispara por trigger en `partido` y también se llama explícitamente desde controllers.
  - `sincronizar_estadisticas_jugador(id)`: recalcula los acumuladores denormalizados `jugador.goles_totales`, `amarillas_totales`, etc. desde `partido_estadistica_jugador`. Llamarla tras cualquier cambio de estadísticas o borrado de partido.
- `estado_partido`: 0 programado, 1 en juego, 2 finalizado, 3 suspendido, 4 cancelado.
- Borrado **lógico** en todas las tablas (`activo = FALSE`); toda consulta filtra `activo = TRUE`.
- RLS está habilitado pero el backend conecta con el rol de la connection string, así que la autorización real la hace Express.

### Torneos e historial
`division` = un torneo/categoría (con `genero`, `temporada`, `terminado`). Ciclo de vida en `division.controller.js`:
- `finalizarYArchivarTorneo` guarda un snapshot JSONB completo (tabla, partidos, playoffs, goleadores, tarjetas) en `historial_torneo` y marca `terminado`.
- `iniciarNuevaEdicion` reutiliza la misma división: desactiva partidos y llaves y resetea la clasificación, manteniendo equipos y planteles. Después de esto, la temporada anterior solo existe en `historial_torneo`.

### Finanzas
- `cuota_jugador`: una fila por jugador y período (`UNIQUE (id_jugador, periodo_mes, periodo_anio)`). `POST /cuotas/pago-rapido` hace upsert y actualiza `jugador.fecha_ultimo_pago` / `fecha_vencimiento` (+31 días) / `es_inactivo`. El estado "Al día / Pendiente" del jugador se deriva de `jugador.fecha_vencimiento`.
- `gasto_club`: libro de caja con `tipo` INGRESO/EGRESO. `GET /gastos/resumen` combina cuotas del período con los movimientos del mes.

### Backend
`index.js` monta `routes/*.routes.js` bajo `/api/<recurso>`; cada ruta delega en `controllers/*.controller.js`. Convenciones:
- Respuestas siempre con `utils/respuesta.js`: `{ ok, mensaje, data }`.
- Auth: `verificarToken` + `verificarRol('Superadmin', 'Administrador', ...)` de `middlewares/auth.middleware.js`. Roles: Superadmin, Administrador, Tesorero, Delegado, DT, Visor. Los GET de datos deportivos son públicos; cuotas y gastos requieren token (`router.use(verificarToken)`).
- Validaciones con express-validator en `utils/validators.js` + `middlewares/validar.middleware.js`.
- Deploy en Vercel como función serverless (`vercel.json`); el pool usa `max: 1` en producción y `app.listen` se omite si existe `VERCEL`.

### Frontend
- `src/api/axios.js`: instancia única con el JWT de `localStorage` y que emite `auth:unauthorized` ante un 401. Estado global en Zustand (`stores/authStore.js`, `stores/divisionStore.js`).
- Rutas públicas: `/`, `/masculino`, `/femenino`, `/torneo`, `/sobre-nosotros`. Rutas privadas: `/admin`.
- `pages/AdminPage.jsx` es el panel con pestañas; cada área es un `components/admin/*Manager.jsx` (Torneos, Equipos, Jugadores, Finanzas, Historial, Usuarios, Playoffs). Son archivos grandes y autocontenidos con sus propios modales.
- Estilos: Tailwind v4 con tokens de color en `@theme` dentro de `src/index.css` (primario `#151f89`, rojo `#E31B23`). Iconos con `react-icons`.
- Convenciones de UI vigentes: no usar emojis, no usar `window.confirm` ni `alert` (usar `components/ui/ConfirmModal.jsx`) y usar el escudo oficial vía `components/ui/ClubShield.jsx`.

## Git
Ramas: se trabaja en `dev` y `main` es la principal. Commits en español con prefijo convencional, por ejemplo `feat(ui): ...`, `fix(cruds): ...`.
