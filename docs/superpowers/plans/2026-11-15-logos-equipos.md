# Logos de equipos editables — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cualquier equipo pueda tener logo por link o por imagen subida, con escudo del club / iniciales como valor por defecto, y que se vea igual en todo el sitio.

**Architecture:** La imagen subida se reduce en el navegador a WebP de 256 px, se guarda en la tabla `equipo_logo` (bytea) y se sirve en `GET /api/equipos/:id/logo`. `equipo.logo_url` guarda un link `https://` o la ruta relativa `/api/equipos/:id/logo?v=<ms>`; el front la resuelve contra la URL de la API. Un componente `EscudoEquipo` reemplaza la lógica duplicada en cada vista.

**Tech Stack:** Express 5 + `pg` (SQL crudo), express-validator, React 19 + Vite + Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-11-15-logos-equipos-design.md`

## Global Constraints
- Formatos de subida: `image/png`, `image/jpeg`, `image/webp`. SVG rechazado en front y back.
- Archivo de entrada ≤ 5 MB (front); imagen ya reducida ≤ 300 KB decodificada (back).
- Imagen reducida: lado mayor 256 px, WebP calidad 0.85.
- Link manual: solo `https://`. Ruta propia: `^/api/equipos/\d+/logo(\?v=\d+)?$`.
- Escribir logo: roles `Superadmin`, `Administrador`, `Delegado`. Leer logo: público.
- `/gemini-svg.svg` en `equipo.logo_url` pasa a `NULL`.
- Sin suite de tests: cada tarea de backend se verifica con un script en el scratchpad que corre los handlers dentro de una transacción con `ROLLBACK`. Front: `npm run lint` sin errores nuevos y `npm run build`.
- UI y mensajes en español, sin emojis, sin `window.confirm`/`alert`.
- No commitear ni pushear sin pedido explícito del usuario.

## Review Focus
- Link roto o caído → `EscudoEquipo` cae al escudo/iniciales, no muestra la imagen rota. (Task 3)
- Volver a "Por defecto" tras haber subido una imagen → `logo_url = NULL` y se borra la fila de `equipo_logo`. (Task 2)
- Subir un SVG renombrado o un base64 trucho → 400 claro, nada guardado. (Task 2)
- Front y back en dominios distintos (Vercel) → la ruta `/api/...` se resuelve contra `VITE_API_URL`, no contra el dominio del front. (Task 3)
- Snapshots del historial y equipos copiados a otro torneo apuntan al logo del equipo original → la ruta sirve también si el equipo está dado de baja. (Task 2)

---

### Task 1: Tabla de logos y migración

**Files:**
- Create: `backend/scripts/migrate_logos_equipos.js`
- Modify: `schema_supabase.sql` (nueva sección 24 al final, mismo SQL; archivo local, no versionado)

**Interfaces:**
- Produces: tabla `public.equipo_logo (id_equipo BIGINT PRIMARY KEY REFERENCES public.equipo(id_equipo) ON DELETE CASCADE, contenido BYTEA NOT NULL, tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('image/png','image/jpeg','image/webp')), actualizado TIMESTAMPTZ NOT NULL DEFAULT NOW())`, con RLS habilitado como el resto.

- [ ] **Step 1:** Escribir el script idempotente (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, `UPDATE public.equipo SET logo_url = NULL WHERE logo_url = '/gemini-svg.svg'`), con el mismo patrón que `migrate_ajustes_clasificacion.js` (lee `DATABASE_URL`, corre en transacción, imprime filas afectadas).
- [ ] **Step 2:** Correrlo contra la base. Esperado: tabla creada y "Equipos pasados a escudo por defecto: N".
- [ ] **Step 3:** Agregar la sección 24 a `schema_supabase.sql`.

### Task 2: API de logos

**Files:**
- Modify: `backend/controllers/equipo.controller.js` (`actualizar`, nuevos `obtenerLogo`, `subirLogo`)
- Modify: `backend/routes/equipo.routes.js`
- Modify: `backend/utils/validators.js` (`validarLogoUrl`, `validarSubirLogo`)
- Test: `<scratchpad>/probar_logos.js`

**Interfaces:**
- Produces:
  - `GET /api/equipos/:id/logo` → bytes con `Content-Type` = `tipo` y `Cache-Control: public, max-age=31536000, immutable`; 404 si no hay fila. No filtra `equipo.activo`.
  - `PUT /api/equipos/:id/logo` body `{ imagen: "data:image/webp;base64,..." }` → `{ ok, data: equipo }` con `logo_url = /api/equipos/:id/logo?v=<Date.now()>`.
  - `PUT /api/equipos/:id` acepta `logo_url` explícito: si la clave viene (incluido `null`), se asigna tal cual; si no viene, no se toca. Si el valor nuevo no es la ruta propia de ese equipo, borra su fila de `equipo_logo`.
  - `POST /api/equipos` valida `logo_url` igual (opcional, nullable).

- [ ] **Step 1: Script de prueba** con el mismo esqueleto que `probar_fixes.js` (handlers reales, `withTransaction` con savepoints, `ROLLBACK` al final). Asserts:
  - `subirLogo` con PNG 1x1 válido → 200, `logo_url` coincide con `^/api/equipos/\d+/logo\?v=\d+$`.
  - `obtenerLogo` → 200, `Content-Type` `image/png`, mismo largo de bytes.
  - `subirLogo` con `data:image/svg+xml;base64,...` → 400; con base64 de 400 KB → 400; con texto sin prefijo `data:` → 400.
  - `actualizar` con `{ logo_url: null }` → `logo_url` null y sin fila en `equipo_logo`.
  - `actualizar` con `{ nombre_equipo: 'X' }` (sin `logo_url`) → conserva el `logo_url` anterior.
  - `obtenerLogo` de un equipo con `activo = FALSE` y logo → 200.
  - Validador: `logo_url` `http://...` y `javascript:...` rechazados; `https://...` y la ruta propia aceptados.
- [ ] **Step 2:** Correrlo; esperado: fallan los asserts de las funciones nuevas.
- [ ] **Step 3:** Implementar. El tipo sale del prefijo del data URL y se contrasta con los primeros bytes (PNG `89 50 4E 47`, JPEG `FF D8 FF`, WebP `RIFF....WEBP`). Upsert con `ON CONFLICT (id_equipo) DO UPDATE`. Subida y `UPDATE equipo` en la misma transacción.
- [ ] **Step 4:** Correr el script; esperado: todos OK, "todo deshecho con ROLLBACK".

### Task 3: Componente `EscudoEquipo` y utilidades

**Files:**
- Create: `frontend/src/components/ui/EscudoEquipo.jsx`
- Create: `frontend/src/utils/logos.js`

**Interfaces:**
- Produces:
  - `resolverUrlLogo(url: string|null): string|null` — `null`/vacío → `null`; empieza con `/api/` → origen de `import.meta.env.VITE_API_URL` (sin el `/api` final) + `url`; otro → `url`.
  - `reducirImagen(archivo: File): Promise<string>` — valida tipo (los tres de Global Constraints) y ≤ 5 MB (rechaza con `Error` de mensaje en español), dibuja en canvas con lado mayor 256 px y devuelve `canvas.toDataURL('image/webp', 0.85)`.
  - `<EscudoEquipo logoUrl esClub nombre nombreCorto className textoClassName />` — orden: logo propio (resuelto) → `ClubShield` si `esClub` → iniciales: 3 primeras letras de `nombreCorto || nombre`, en mayúsculas. Si `<img>` dispara `onError`, pasa al siguiente nivel (estado local, sin manipular el DOM).

- [ ] **Step 1:** Implementar ambos archivos.
- [ ] **Step 2:** `npm run lint` sin errores nuevos.

### Task 4: Usar `EscudoEquipo` en todas las vistas de equipos

**Files (solo los lugares que dibujan el escudo de un equipo; los distintivos del club como "Estadísticas del Club", encabezados y goleadores quedan con `ClubShield`):**
- `frontend/src/components/standings/StandingsTable.jsx:85-100`
- `frontend/src/components/matches/MatchCard.jsx:80-95, 129-144`
- `frontend/src/components/standings/PlayoffBracket.jsx:180-186, 216-222, 259` (pasa a usar `logo_local`/`logo_visitante` que ya trae la API)
- `frontend/src/components/admin/PlayoffsManager.jsx:1035-1040, 1071-1076`
- `frontend/src/components/admin/PosicionesManager.jsx:21-35` (borra su `EscudoEquipo` local)
- `frontend/src/components/admin/EquiposManager.jsx:1366-1370`
- `frontend/src/components/admin/HistorialManager.jsx:275-279, 436-440` (campeón y tabla del snapshot)

**Interfaces:**
- Consumes: `EscudoEquipo` (Task 3).

- [ ] **Step 1:** Reemplazar cada bloque por `<EscudoEquipo .../>` conservando el tamaño actual de cada vista.
- [ ] **Step 2:** `npm run lint` y `npm run build`; `grep -rn "onError" src/components/standings src/components/matches` sin resultados.

### Task 5: Selector de logo en Planteles y Equipos

**Files:**
- Create: `frontend/src/components/admin/SelectorLogo.jsx`
- Modify: `frontend/src/components/admin/EquiposManager.jsx` (estado de los formularios de crear/editar, `handleCrearEquipo`, `handleGuardarEdicionEquipo`, quitar el `'/gemini-svg.svg'` forzado)

**Interfaces:**
- Consumes: `EscudoEquipo`, `reducirImagen`, `resolverUrlLogo` (Task 3); `PUT /api/equipos/:id/logo` y `logo_url` explícito (Task 2).
- Produces: `<SelectorLogo valor onChange esClub nombre nombreCorto />` con `valor = { modo: 'defecto' | 'link' | 'archivo', url: string, imagen: string|null }`. Tres botones de modo, campo de link o input de archivo según el modo, vista previa con `EscudoEquipo`, mensaje de error si `reducirImagen` rechaza.

- [ ] **Step 1:** Implementar `SelectorLogo`. Al editar, el modo inicial sale del equipo: `logo_url` null → `defecto`; ruta propia → `archivo` (sin imagen nueva, vista previa con la actual); otro → `link`.
- [ ] **Step 2:** Guardado: crear/editar manda `logo_url` = `null` (defecto), el link (link) o, en modo archivo sin imagen nueva, el valor actual. Si hay imagen nueva, después de crear/editar llama `PUT /equipos/:id/logo`. Si falla la subida, aviso de error indicando que el equipo sí se guardó.
- [ ] **Step 3:** `npm run lint` sin errores nuevos y `npm run build`.

### Task 6: Verificación final
- [ ] **Step 1:** Re-correr `probar_logos.js` (todo OK) y confirmar que no quedó nada escrito en la base.
- [ ] **Step 2:** Si el usuario inicia sesión en el pane: crear un rival con link, otro con imagen subida, volver uno a "Por defecto", y revisar `/masculino` en escritorio y a 375 px.
- [ ] **Step 3:** Resumen al usuario; commit y push solo si lo pide.
