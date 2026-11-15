// Logos de equipos subidos desde el panel. El navegador ya los reduce a 256 px; acá solo se valida.
const TAMANO_MAXIMO = 300 * 1024; // bytes decodificados

// Primeros bytes de cada formato aceptado: el tipo declarado tiene que coincidir con el contenido.
const FIRMAS = {
  'image/png': (b) => b.length > 8 && b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])),
  'image/jpeg': (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/webp': (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
};

// Cada imagen subida es una fila propia de equipo_logo que nunca se modifica ni se borra: su ruta sirve
// siempre los mismos bytes. Así los historiales archivados y los equipos copiados a otro torneo, que
// guardan esta ruta, no pierden el logo aunque el equipo después lo cambie.
const RUTA_LOGO_PROPIA = /^\/api\/equipos\/logos\/\d+$/;

const rutaLogo = (idLogo) => `/api/equipos/logos/${idLogo}`;

// "data:image/png;base64,...." → { tipo, contenido } o { error }
function decodificarImagen(dataUrl) {
  const partes = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!partes) return { error: 'La imagen tiene que ser PNG, JPG o WebP.' };
  const [, tipo, base64] = partes;
  const contenido = Buffer.from(base64, 'base64');
  if (contenido.length > TAMANO_MAXIMO) return { error: 'La imagen es demasiado pesada (máximo 300 KB ya reducida).' };
  if (!FIRMAS[tipo](contenido)) return { error: 'El archivo no es una imagen PNG, JPG o WebP válida.' };
  return { tipo, contenido };
}

module.exports = { decodificarImagen, rutaLogo, RUTA_LOGO_PROPIA };
