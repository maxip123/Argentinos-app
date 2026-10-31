import { useId, useState } from 'react';

// Paginación en memoria. La página vuelve a 1 cuando cambia `claveFiltros`
// y se ajusta sola si la lista se achica (por ejemplo, tras una baja).
// `idLista` va en el elemento al que se vuelve al cambiar de página.
export default function usePaginacion(items, porPagina, claveFiltros = '') {
  const [pagina, setPagina] = useState(1);
  const [claveAnterior, setClaveAnterior] = useState(claveFiltros);
  const idLista = useId();

  if (claveAnterior !== claveFiltros) {
    setClaveAnterior(claveFiltros);
    setPagina(1);
  }

  const lista = items || [];
  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * porPagina;

  const irAPagina = (nueva) => {
    setPagina(nueva);
    document.getElementById(idLista)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return {
    pagina: paginaActual,
    totalPaginas,
    total: lista.length,
    desde,
    visibles: lista.slice(desde, desde + porPagina),
    irAPagina,
    idLista,
  };
}
