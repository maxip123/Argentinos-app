// Logos de equipos: resolución de la URL guardada y reducción de imágenes antes de subirlas.

const TIPOS_ACEPTADOS = ['image/png', 'image/jpeg', 'image/webp'];
const TAMANO_MAXIMO_ARCHIVO = 5 * 1024 * 1024;
const LADO_MAXIMO = 256;

// Origen del backend (sin el /api final): las imágenes subidas se guardan como /api/equipos/:id/logo
// y el front puede estar en otro dominio.
const ORIGEN_API = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '');

export function resolverUrlLogo(url) {
  if (!url) return null;
  return url.startsWith('/api/') ? `${ORIGEN_API}${url}` : url;
}

// Ruta de una imagen subida desde el panel (ver backend/utils/logos.js)
export const esLogoSubido = (url) => typeof url === 'string' && /^\/api\/equipos\/logos\/\d+$/.test(url);

// Estado del selector de logo. Cada modo guarda su propio dato, así cambiar de modo no arrastra el del otro:
//   { modo: 'defecto' | 'link' | 'archivo', link: string, subida: ruta ya subida | null, imagen: data URL nueva | null }
export const valorLogoInicial = (logoUrl) => {
  const valor = { modo: 'defecto', link: '', subida: null, imagen: null };
  if (!logoUrl) return valor;
  if (esLogoSubido(logoUrl)) return { ...valor, modo: 'archivo', subida: logoUrl };
  return { ...valor, modo: 'link', link: logoUrl };
};

// Lo que muestra la vista previa en el modo elegido (null = escudo o iniciales por defecto)
export const vistaPreviaLogo = (valor) => {
  if (valor.modo === 'link') return valor.link.trim() || null;
  if (valor.modo === 'archivo') return valor.imagen || valor.subida;
  return null;
};

// Error a mostrar antes de guardar, o null si está bien
export const errorLogo = (valor) => {
  if (valor.modo === 'link' && !/^https:\/\/\S+\.\S+/.test(valor.link.trim())) {
    return 'El link del logo tiene que empezar con https://';
  }
  if (valor.modo === 'archivo' && !valor.imagen && !valor.subida) return 'Elegí una imagen para el logo.';
  return null;
};

// Campos para POST/PUT /equipos. Con imagen nueva no se toca logo_url: la subida lo actualiza después.
export const camposLogo = (valor) => {
  if (valor.modo === 'defecto') return { logo_url: null };
  if (valor.modo === 'link') return { logo_url: valor.link.trim() };
  return valor.imagen ? {} : { logo_url: valor.subida };
};

// Achica la imagen a 256 px de lado mayor y la devuelve como data URL WebP.
export function reducirImagen(archivo) {
  return new Promise((resolve, reject) => {
    if (!archivo) return reject(new Error('Elegí una imagen.'));
    if (!TIPOS_ACEPTADOS.includes(archivo.type)) {
      return reject(new Error('La imagen tiene que ser PNG, JPG o WebP.'));
    }
    if (archivo.size > TAMANO_MAXIMO_ARCHIVO) {
      return reject(new Error('La imagen pesa más de 5 MB. Probá con una más chica.'));
    }
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, LADO_MAXIMO / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * escala));
      canvas.height = Math.max(1, Math.round(img.height * escala));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/webp', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}
