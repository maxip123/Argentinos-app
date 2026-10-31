import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';
import StandingsTable from '../components/standings/StandingsTable';
import ScorersTable from '../components/standings/ScorersTable';
import CardsTable from '../components/standings/CardsTable';
import PlayoffBracket from '../components/standings/PlayoffBracket';
import FixtureList from '../components/standings/FixtureList';
import Paginacion from '../components/ui/Paginacion';
import usePaginacion from '../hooks/usePaginacion';
import {
  FaTrophy,
  FaFutbol,
  FaIdCard,
  FaProjectDiagram,
  FaCalendarAlt,
  FaArchive,
  FaArrowLeft,
  FaMedal,
  FaUsers,
} from 'react-icons/fa';

const TABS = [
  { id: 'posiciones', label: 'Posiciones', icon: FaTrophy },
  { id: 'goleadores', label: 'Goleadores', icon: FaFutbol },
  { id: 'tarjetas', label: 'Tarjetas', icon: FaIdCard },
  { id: 'playoff', label: 'Fase Eliminatoria', icon: FaProjectDiagram },
  { id: 'partidos', label: 'Partidos Disputados', icon: FaCalendarAlt },
];

const nombreEquipo = (e) => e?.nombre_equipo || e?.nombre || null;

function useHistorial() {
  const [ediciones, setEdiciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;
    api.get('/divisiones/historial')
      .then((res) => {
        if (cancelado) return;
        const lista = (res.data.data || []).filter((h) => h.es_snapshot_rico);
        setEdiciones(lista);
      })
      .catch(() => { if (!cancelado) setError(true); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, []);

  return { ediciones, cargando, error };
}

function Encabezado({ titulo }) {
  return (
    <section className="bg-white border-b border-slate-200 py-10">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
        <span className="font-headline tracking-[0.25em] text-[#151f89] uppercase text-xs font-bold">
          LIGA FUTSAL AFA TUCUMÁN
        </span>
        <h1 className="font-headline text-3xl sm:text-5xl uppercase tracking-wider text-[#151f89] drop-shadow-xs">
          {titulo}
        </h1>
      </div>
    </section>
  );
}

function Podio({ etiqueta, equipo, destacado = false }) {
  const nombre = nombreEquipo(equipo);
  if (!nombre) return null;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <FaMedal className={destacado ? 'text-amber-500 shrink-0' : 'text-slate-400 shrink-0'} />
      <span className="text-[11px] font-title uppercase tracking-wider text-slate-500 shrink-0">{etiqueta}</span>
      <span className={`truncate text-sm ${destacado ? 'font-bold text-[#151f89]' : 'font-semibold text-slate-700'}`}>
        {nombre}
      </span>
    </div>
  );
}

function TarjetaEdicion({ h }) {
  const campeon = h.campeon_definitivo || h.campeon_tabla;
  return (
    <Link
      to={`/historial/${h.id_historial}`}
      className="group flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#151f89]/40 transition-all overflow-hidden"
    >
      <div className="bg-[#151f89] text-white px-5 py-4">
        <span className="text-[11px] font-mono uppercase tracking-widest text-white/70">
          {h.genero} · Temporada {h.temporada}
        </span>
        <h2 className="font-headline text-lg uppercase tracking-wide leading-tight mt-0.5">
          {h.nombre_division}
        </h2>
      </div>

      <div className="flex-1 p-5 space-y-2.5">
        <Podio etiqueta="Campeón" equipo={campeon} destacado />
        <Podio etiqueta="Subcampeón" equipo={h.subcampeon_tabla} />
        <Podio etiqueta="Copa Plata" equipo={h.campeon_plata} />
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/70 text-center">
        <div className="py-3">
          <strong className="block font-headline text-lg text-slate-900">{h.cantidad_equipos}</strong>
          <span className="text-[10px] font-title uppercase text-slate-500">Equipos</span>
        </div>
        <div className="py-3">
          <strong className="block font-headline text-lg text-slate-900">{h.partidos_jugados}</strong>
          <span className="text-[10px] font-title uppercase text-slate-500">Partidos</span>
        </div>
        <div className="py-3">
          <strong className="block font-headline text-lg text-slate-900">{h.total_goles}</strong>
          <span className="text-[10px] font-title uppercase text-slate-500">Goles</span>
        </div>
      </div>

      <div className="px-5 py-3 text-xs font-headline uppercase tracking-wider text-[#151f89] group-hover:bg-[#151f89]/5 transition-colors text-center">
        Ver torneo
      </div>
    </Link>
  );
}

function ListaHistorial() {
  const { ediciones, cargando, error } = useHistorial();
  const [genero, setGenero] = useState('Todos');

  const visibles = useMemo(
    () => ediciones.filter((h) => genero === 'Todos' || h.genero?.toLowerCase() === genero.toLowerCase()),
    [ediciones, genero]
  );
  const paginacion = usePaginacion(visibles, 9, genero);

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f2fc] pb-16">
      <Encabezado titulo="Historial de Torneos" />

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 w-full my-8 flex justify-center">
        <nav className="flex items-center gap-1.5 bg-white rounded-full p-1.5 border border-slate-200 shadow-sm">
          {['Todos', 'Masculino', 'Femenino'].map((g) => (
            <button
              key={g}
              onClick={() => setGenero(g)}
              className={`px-5 py-2 rounded-full font-headline uppercase text-xs sm:text-sm tracking-wider transition-all ${
                genero === g
                  ? 'bg-[#151f89] text-white shadow-md'
                  : 'text-slate-600 hover:text-[#151f89] hover:bg-slate-100/60'
              }`}
            >
              {g}
            </button>
          ))}
        </nav>
      </div>

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        {cargando ? (
          <p className="text-center text-slate-500 font-title py-16">Cargando historial...</p>
        ) : error ? (
          <p className="text-center text-red-600 font-title py-16">No se pudo cargar el historial.</p>
        ) : visibles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center">
            <FaArchive className="mx-auto text-3xl text-slate-300 mb-3" />
            <h3 className="font-headline uppercase text-[#151f89] tracking-wider">
              Todavía no hay torneos finalizados
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Las ediciones terminadas aparecerán acá con sus estadísticas.
            </p>
          </div>
        ) : (
          <div id={paginacion.idLista} className="space-y-6 scroll-mt-24">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {paginacion.visibles.map((h) => (
                <TarjetaEdicion key={h.id_historial} h={h} />
              ))}
            </div>
            <Paginacion paginacion={paginacion} singular="torneo" plural="torneos" />
          </div>
        )}
      </main>
    </div>
  );
}

function DetalleHistorial({ id }) {
  const { ediciones, cargando, error } = useHistorial();
  const [tabActiva, setTabActiva] = useState('posiciones');

  const h = ediciones.find((e) => String(e.id_historial) === String(id));
  const campeon = h && (h.campeon_definitivo || h.campeon_tabla);

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f2fc] pb-16">
      <Encabezado titulo={h ? h.nombre_division : 'Historial de Torneos'} />

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 w-full mt-6">
        <Link
          to="/historial"
          className="inline-flex items-center gap-2 text-xs font-headline uppercase tracking-wider text-[#151f89] hover:underline"
        >
          <FaArrowLeft /> Volver al historial
        </Link>
      </div>

      {cargando ? (
        <p className="text-center text-slate-500 font-title py-16">Cargando torneo...</p>
      ) : error || !h ? (
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 w-full py-16 text-center">
          <p className="font-title text-slate-600">No se encontró esta edición.</p>
        </div>
      ) : (
        <>
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 w-full mt-4">
            <div className="bg-[#151f89]/8 border border-[#151f89]/25 text-[#151f89] px-4 py-3 rounded-xl text-xs sm:text-sm font-title font-semibold flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-1 text-center">
              <span className="flex items-center gap-2">
                <FaArchive className="shrink-0" />
                {h.genero} · Temporada {h.temporada}
              </span>
              {nombreEquipo(campeon) && (
                <span className="flex items-center gap-2">
                  <FaTrophy className="text-amber-500 shrink-0" />
                  Campeón: <strong>{nombreEquipo(campeon)}</strong>
                </span>
              )}
              {nombreEquipo(h.campeon_plata) && (
                <span className="flex items-center gap-2">
                  <FaTrophy className="text-slate-400 shrink-0" />
                  Campeón Copa Plata: <strong>{nombreEquipo(h.campeon_plata)}</strong>
                </span>
              )}
              <span className="flex items-center gap-2">
                <FaUsers className="shrink-0" />
                {h.cantidad_equipos} equipos · {h.partidos_jugados} partidos · {h.total_goles} goles
              </span>
            </div>
          </div>

          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 my-8 flex justify-center w-full">
            <nav className="flex items-center gap-1.5 sm:gap-2 bg-white rounded-full p-1.5 border border-slate-200 shadow-sm overflow-x-auto no-scrollbar max-w-full">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const activa = tabActiva === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setTabActiva(tab.id)}
                    className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-full font-headline uppercase text-xs sm:text-sm tracking-wider transition-all whitespace-nowrap ${
                      activa
                        ? 'bg-[#151f89] text-white shadow-md'
                        : 'text-slate-600 hover:text-[#151f89] hover:bg-slate-100/60'
                    }`}
                  >
                    <Icon className={activa ? 'text-white' : 'text-slate-400'} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex-1 w-full">
            {tabActiva === 'posiciones' && <StandingsTable clasificacion={h.tabla_posiciones} cargando={false} />}
            {tabActiva === 'goleadores' && <ScorersTable goleadores={h.goleadores_club} cargando={false} soloClub />}
            {tabActiva === 'tarjetas' && <CardsTable tarjetas={h.tarjetas_club} cargando={false} soloClub />}
            {tabActiva === 'playoff' && <PlayoffBracket llaves={h.playoffs} cargando={false} />}
            {tabActiva === 'partidos' && <FixtureList partidos={h.partidos} cargando={false} />}
          </main>
        </>
      )}
    </div>
  );
}

export default function HistorialPage() {
  const { id } = useParams();
  return id ? <DetalleHistorial id={id} /> : <ListaHistorial />;
}
