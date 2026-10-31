import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const CLASE_BOTON =
  'w-9 h-9 flex items-center justify-center rounded-full bg-white border border-slate-200 text-[#151f89] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors';

export default function Paginacion({ paginacion, singular = 'registro', plural = 'registros', className = '' }) {
  const { pagina, totalPaginas, total, desde, visibles, irAPagina } = paginacion;
  if (total === 0) return null;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 ${className}`}>
      <p className="text-xs text-slate-500 font-body">
        Mostrando {desde + 1}–{desde + visibles.length} de {total} {total === 1 ? singular : plural}
      </p>

      {totalPaginas > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => irAPagina(pagina - 1)}
            disabled={pagina === 1}
            aria-label="Página anterior"
            className={CLASE_BOTON}
          >
            <FaChevronLeft className="text-xs" />
          </button>
          <span className="px-2 text-sm font-title font-bold text-slate-700">
            Página {pagina} de {totalPaginas}
          </span>
          <button
            type="button"
            onClick={() => irAPagina(pagina + 1)}
            disabled={pagina === totalPaginas}
            aria-label="Página siguiente"
            className={CLASE_BOTON}
          >
            <FaChevronRight className="text-xs" />
          </button>
        </div>
      )}
    </div>
  );
}
