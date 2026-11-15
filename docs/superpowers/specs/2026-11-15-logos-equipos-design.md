# Logos de equipos editables — diseño corto

## Intención
Desde Planteles y Equipos, poder ponerle logo a cualquier equipo (del club o rival) pegando un link o subiendo una imagen. Sin logo propio: escudo del club para los equipos de Argentinos del Norte, iniciales para los rivales, como hoy. Ambos casos se pueden cambiar y volver al valor por defecto.

## Objetivos / no objetivos
- Objetivo: el mismo escudo en todo el sitio (tabla, fixture, tarjetas de partido, playoffs, historial, panel).
- Objetivo: volver al logo por defecto desde la edición (hoy no se puede: `COALESCE` en el UPDATE).
- No objetivo: un logo global del club que cambie todos los equipos de Argentinos a la vez (se edita por equipo).
- Anti-objetivo: que los listados de partidos se vuelvan pesados por llevar imágenes adentro.

## Enfoques considerados
1. **Imagen en la base, servida por la API (elegido).** El navegador la reduce a 256 px WebP (10–30 KB); cada subida se guarda como una fila nueva de `equipo_logo` (nunca se modifica ni se borra) y se sirve en `GET /api/equipos/logos/:id_logo` con caché permanente en el navegador y en la CDN (`s-maxage`). `equipo.logo_url` apunta a esa ruta. Sin proveedores ni claves nuevas.
   - Revisión (15/11): la primera versión guardaba una fila por equipo y la borraba al volver a "Por defecto"; eso dejaba sin logo a los historiales archivados y a los equipos copiados, que guardan la ruta. Por eso las imágenes pasaron a ser inmutables.
2. **Data URL dentro de `logo_url`.** Lo más simple, pero cada partido trae dos logos: el fixture pesaría megas. Descartado.
3. **Supabase Storage.** Lo correcto a escala, pero exige crear el bucket y sumar una clave de servicio al backend. Descartado por ahora.

## Decisiones
- Formatos de subida: PNG, JPG, WebP. SVG no (puede llevar scripts). Máximo 5 MB de entrada; se reduce en el navegador.
- Link: debe ser `https://` (o la ruta propia de la API).
- Componente único `EscudoEquipo` (`components/ui/EscudoEquipo.jsx`): logo propio → escudo del club si es de Argentinos → iniciales (nombre corto o nombre, 3 letras; 1 en los círculos chicos del cuadro de playoffs). Si la imagen falla al cargar, cae al valor por defecto. Las imágenes se piden sin Referer (`no-referrer`).
- `/gemini-svg.svg` guardado en equipos del club pasa a `NULL` (= por defecto). Se ve igual.
- Los snapshots del historial guardan la URL vigente al archivar; la ruta de logo sirve también para equipos dados de baja.
- Los logos por link se descargan del sitio de un tercero, que recibe la IP del visitante: figura en la Política de Privacidad (punto 7) y en los Términos.
- Escritura del logo: mismos roles que editar un equipo (Superadmin, Administrador, Delegado). Lectura pública (es un escudo, no un dato personal).

## Queda a criterio de quien lo construya
Tamaños exactos por vista, textos del formulario y el manejo de la vista previa.
