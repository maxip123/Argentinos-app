import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';
import { useDivisionStore } from '../stores/divisionStore';
import StandingsTable from '../components/standings/StandingsTable';
import ScorersTable from '../components/standings/ScorersTable';
import CardsTable from '../components/standings/CardsTable';
import PlayoffBracket from '../components/standings/PlayoffBracket';
import FixtureList from '../components/standings/FixtureList';
import { FaTrophy, FaFutbol, FaIdCard, FaProjectDiagram, FaCalendarAlt, FaChevronDown } from 'react-icons/fa';

export default function TournamentPage({ generoForzado = null }) {
  const location = useLocation();

  // Detectar género si viene en la ruta
  const genero =
    generoForzado ||
    (location.pathname.includes('femenino')
      ? 'Femenino'
      : location.pathname.includes('masculino')
      ? 'Masculino'
      : null);

  const { divisiones, divisionActivaId, setDivisionActivaId, cargarDivisiones } = useDivisionStore();

  const [tabActiva, setTabActiva] = useState('posiciones'); // 'posiciones' | 'goleadores' | 'tarjetas' | 'playoff' | 'partidos'
  const [soloClub, setSoloClub] = useState(false);

  // Estados de datos
  const [posiciones, setPosiciones] = useState([]);
  const [goleadores, setGoleadores] = useState([]);
  const [tarjetas, setTarjetas] = useState([]);
  const [playoffs, setPlayoffs] = useState([]);
  const [partidos, setPartidos] = useState([]);

  const [cargando, setCargando] = useState(false);

  // Cargar divisiones al montar
  useEffect(() => {
    cargarDivisiones().then((list) => {
      // Si hay filtro de género, seleccionar la primera división de ese género si la actual no coincide
      if (genero && list.length > 0) {
        const divMatch = list.find((d) => d.genero?.toLowerCase() === genero.toLowerCase());
        if (divMatch) {
          setDivisionActivaId(divMatch.id_division);
        }
      }
    });
  }, [genero, cargarDivisiones, setDivisionActivaId]);

  // Filtrar divisiones por género si aplica
  const divisionesVisibles = genero
    ? divisiones.filter((d) => d.genero?.toLowerCase() === genero.toLowerCase())
    : divisiones;

  // Cargar datos según la pestaña y la división activa
  useEffect(() => {
    if (!divisionActivaId) return;

    let cancelado = false;
    setCargando(true);

    const cargarDatos = async () => {
      try {
        if (tabActiva === 'posiciones') {
          const res = await api.get(`/clasificacion/${divisionActivaId}`);
          if (!cancelado) setPosiciones(res.data.data || []);
        } else if (tabActiva === 'goleadores') {
          const res = await api.get(`/jugadores/goleadores/${divisionActivaId}?solo_club=${soloClub}`);
          if (!cancelado) setGoleadores(res.data.data || []);
        } else if (tabActiva === 'tarjetas') {
          const res = await api.get(`/jugadores/tarjetas/${divisionActivaId}?solo_club=${soloClub}`);
          if (!cancelado) setTarjetas(res.data.data || []);
        } else if (tabActiva === 'playoff') {
          const res = await api.get(`/playoff/${divisionActivaId}`);
          if (!cancelado) setPlayoffs(res.data.data || []);
        } else if (tabActiva === 'partidos') {
          const res = await api.get(`/partidos?id_division=${divisionActivaId}`);
          if (!cancelado) setPartidos(res.data.data || []);
        }
      } catch (err) {
        console.error('Error cargando datos de la pestaña:', err);
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    cargarDatos();

    return () => {
      cancelado = true;
    };
  }, [tabActiva, divisionActivaId, soloClub]);

  const tabs = [
    { id: 'posiciones', label: 'Posiciones', icon: FaTrophy },
    { id: 'goleadores', label: 'Goleadores', icon: FaFutbol },
    { id: 'tarjetas', label: 'Tarjetas', icon: FaIdCard },
    { id: 'playoff', label: 'Fase Eliminatoria', icon: FaProjectDiagram },
    { id: 'partidos', label: 'Partidos Disputados', icon: FaCalendarAlt },
  ];

  // Separar torneos en curso vs historial
  const divisionesEnCurso = divisionesVisibles.filter((d) => !d.terminado);
  const divisionesHistorial = divisionesVisibles.filter((d) => d.terminado);
  const divisionActiva = divisionesVisibles.find((d) => Number(d.id_division) === Number(divisionActivaId));
  const esHistorial = Boolean(divisionActiva?.terminado);

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f2fc] pb-16">
      {/* ─── Encabezado del Torneo ─────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-200 py-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="font-headline tracking-[0.25em] text-[#151f89] uppercase text-xs font-bold">
            LIGA FUTSAL AFA TUCUMÁN
          </span>

          <h1 className="font-headline text-3xl sm:text-5xl uppercase tracking-wider text-[#151f89] drop-shadow-xs">
            {genero ? `Futsal ${genero}` : 'Torneo Oficial'}
          </h1>

          {/* Selector de División con estilo pill */}
          <div className="relative inline-block mt-2">
            <select
              value={divisionActivaId || ''}
              onChange={(e) => setDivisionActivaId(e.target.value)}
              className="appearance-none bg-white border-2 border-slate-300 text-slate-800 font-headline font-bold text-sm sm:text-base py-2.5 pl-6 pr-12 rounded-full focus:outline-none focus:border-[#151f89] cursor-pointer shadow-sm hover:border-[#151f89] transition-all uppercase tracking-wider"
            >
              {divisionesEnCurso.length > 0 && (
                <optgroup label="─── TORNEOS EN CURSO ───">
                  {divisionesEnCurso.map((div) => (
                    <option key={div.id_division} value={div.id_division}>
                      🟢 {div.nombre_division.toUpperCase()} ({div.temporada})
                    </option>
                  ))}
                </optgroup>
              )}
              {divisionesHistorial.length > 0 && (
                <optgroup label="─── HISTORIAL DE TORNEOS ───">
                  {divisionesHistorial.map((div) => (
                    <option key={div.id_division} value={div.id_division}>
                      📜 {div.nombre_division.toUpperCase()} ({div.temporada}) — HISTORIAL
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <FaChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-xs" />
          </div>
        </div>
      </section>

      {/* Banner de torneo archivado/historial */}
      {esHistorial && (
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-title font-semibold flex items-center justify-center gap-2 shadow-xs">
            <span className="text-base">📜</span>
            <span>
              Estás consultando el <strong>Historial Oficial</strong> de la edición <strong>{divisionActiva?.nombre_division}</strong> ({divisionActiva?.temporada}). Los datos corresponden al torneo finalizado.
            </span>
          </div>
        </div>
      )}

      {/* ─── Navigation Pill Tabs ─────────────────────────────────────────── */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 my-8 flex justify-center w-full">
        <nav className="flex items-center gap-1.5 sm:gap-2 bg-white rounded-full p-1.5 border border-slate-200 shadow-sm overflow-x-auto no-scrollbar max-w-full">
          {tabs.map((tab) => {
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

      {/* ─── Contenido Dinámico de la Pestaña ──────────────────────────────── */}
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex-1 w-full">
        {tabActiva === 'posiciones' && (
          <StandingsTable clasificacion={posiciones} cargando={cargando} />
        )}

        {tabActiva === 'goleadores' && (
          <ScorersTable
            goleadores={goleadores}
            cargando={cargando}
            soloClub={soloClub}
            onToggleSoloClub={setSoloClub}
          />
        )}

        {tabActiva === 'tarjetas' && (
          <CardsTable
            tarjetas={tarjetas}
            cargando={cargando}
            soloClub={soloClub}
            onToggleSoloClub={setSoloClub}
          />
        )}

        {tabActiva === 'playoff' && (
          <PlayoffBracket llaves={playoffs} cargando={cargando} />
        )}

        {tabActiva === 'partidos' && (
          <FixtureList partidos={partidos} cargando={cargando} />
        )}
      </main>
    </div>
  );
}
