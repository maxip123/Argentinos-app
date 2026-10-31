import React, { useMemo, useState } from 'react';
import MatchCard from '../matches/MatchCard';
import Paginacion from '../ui/Paginacion';
import SwitchSoloClub from '../ui/SwitchSoloClub';
import usePaginacion from '../../hooks/usePaginacion';
import { FaChevronDown, FaSearch } from 'react-icons/fa';

const PARTIDOS_POR_PAGINA = 9;

const ESTADOS = {
  jugados: { etiqueta: 'Jugados', valores: [2] },
  por_jugar: { etiqueta: 'Por jugar', valores: [0, 1] },
  suspendidos: { etiqueta: 'Suspendidos o cancelados', valores: [3, 4] },
};

// Los snapshots de historial_torneo guardan los equipos con otros nombres de campo
const normalizarPartido = (p) => ({
  ...p,
  equipo_local: p.equipo_local ?? p.local_nombre,
  equipo_visitante: p.equipo_visitante ?? p.visitante_nombre,
  logo_local: p.logo_local ?? p.local_logo,
  logo_visitante: p.logo_visitante ?? p.visitante_logo,
  local_es_argentinos: p.local_es_argentinos ?? p.local_es_club,
  visitante_es_argentinos: p.visitante_es_argentinos ?? p.visitante_es_club,
  juega_argentinos: p.juega_argentinos ?? Boolean(p.local_es_club || p.visitante_es_club),
});

const normalizarTexto = (texto) =>
  (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const CLASE_SELECT =
  'w-full appearance-none bg-white border border-slate-200 rounded-full pl-4 pr-9 py-2 text-sm font-title font-bold text-slate-700 focus:outline-none focus:border-[#151f89] cursor-pointer';

function SelectFiltro({ etiqueta, value, onChange, children }) {
  return (
    <div className="relative w-full sm:w-auto">
      <select aria-label={etiqueta} value={value} onChange={(e) => onChange(e.target.value)} className={CLASE_SELECT}>
        {children}
      </select>
      <FaChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]" />
    </div>
  );
}

export default function FixtureList({ partidos = [], cargando = false }) {
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('jugados');
  const [jornada, setJornada] = useState('');
  const [soloClub, setSoloClub] = useState(false);

  const lista = useMemo(() => (partidos || []).map(normalizarPartido), [partidos]);

  const jornadas = useMemo(
    () => [...new Set(lista.map((p) => p.jornada_numero).filter(Boolean))].sort((a, b) => a - b),
    [lista]
  );

  const filtrados = useMemo(() => {
    const termino = normalizarTexto(busqueda.trim());
    return lista.filter((p) => {
      if (estado && !ESTADOS[estado].valores.includes(p.estado_partido)) return false;
      if (jornada && String(p.jornada_numero) !== jornada) return false;
      if (soloClub && !p.juega_argentinos) return false;
      if (!termino) return true;
      return normalizarTexto(`${p.equipo_local} ${p.equipo_visitante} ${p.nombre_sede} ${p.nombre_partido}`).includes(termino);
    });
  }, [lista, busqueda, estado, jornada, soloClub]);

  const paginacion = usePaginacion(filtrados, PARTIDOS_POR_PAGINA, `${busqueda}|${estado}|${jornada}|${soloClub}`);
  const { visibles } = paginacion;

  const limpiarFiltros = () => {
    setBusqueda('');
    setEstado('');
    setJornada('');
    setSoloClub(false);
  };

  if (cargando) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
        <div className="w-10 h-10 border-4 border-[#151f89] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="font-title text-slate-500 font-semibold uppercase tracking-wider text-sm">
          Cargando partidos de la división...
        </p>
      </div>
    );
  }

  if (lista.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
        <p className="font-headline text-slate-700 text-lg uppercase tracking-wide">
          No hay partidos programados
        </p>
        <p className="text-slate-500 text-sm mt-1 font-body">
          Próximamente se publicará el calendario de fechas para esta categoría.
        </p>
      </div>
    );
  }

  return (
    <div id={paginacion.idLista} className="space-y-6 scroll-mt-24">
      {/* Filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            placeholder="Buscar por equipo o sede..."
            aria-label="Buscar partidos por equipo o sede"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-full pl-10 pr-4 py-2 text-sm font-body focus:outline-none focus:border-[#151f89]"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <SelectFiltro etiqueta="Filtrar por estado" value={estado} onChange={setEstado}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([id, { etiqueta }]) => (
              <option key={id} value={id}>{etiqueta}</option>
            ))}
          </SelectFiltro>

          {jornadas.length > 0 && (
            <SelectFiltro etiqueta="Filtrar por fecha" value={jornada} onChange={setJornada}>
              <option value="">Todas las fechas</option>
              {jornadas.map((j) => (
                <option key={j} value={String(j)}>Fecha {j}</option>
              ))}
            </SelectFiltro>
          )}

          <SwitchSoloClub activo={soloClub} onChange={setSoloClub} />
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <p className="font-headline text-slate-700 text-lg uppercase tracking-wide">
            No hay partidos con esos filtros
          </p>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="mt-3 text-sm font-title font-bold text-[#151f89] hover:underline"
          >
            Ver todos los partidos
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibles.map((partido) => (
              <MatchCard key={partido.id_partido} partido={partido} />
            ))}
          </div>

          <Paginacion paginacion={paginacion} singular="partido" plural="partidos" />
        </>
      )}
    </div>
  );
}
