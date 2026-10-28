import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';
import { useDivisionStore } from '../stores/divisionStore';
import StandingsTable from '../components/standings/StandingsTable';
import ScorersTable from '../components/standings/ScorersTable';
import CardsTable from '../components/standings/CardsTable';
import PlayoffBracket from '../components/standings/PlayoffBracket';
import FixtureList from '../components/standings/FixtureList';
import { FaTrophy, FaFutbol, FaIdCard, FaProjectDiagram, FaCalendarAlt, FaChevronDown, FaArchive } from 'react-icons/fa';

export default function TournamentPage({ generoForzado = null }) {
  const location = useLocation();

  const genero =
    generoForzado ||
    (location.pathname.includes('femenino')
      ? 'Femenino'
      : location.pathname.includes('masculino')
      ? 'Masculino'
      : null);

  const { divisiones, divisionActivaId, setDivisionActivaId, cargarDivisiones } = useDivisionStore();

  const [tabActiva, setTabActiva] = useState('posiciones');
  const [soloClub, setSoloClub] = useState(false);

  // Historial archivado
  const [historialTorneos, setHistorialTorneos] = useState([]);
  const [snapshotActivo, setSnapshotActivo] = useState(null);
  // Valor del <select> — puede ser un id de división viva o "h_<id_historial>"
  const [seleccion, setSeleccion] = useState('');

  // Datos de la pestaña activa
  const [posiciones, setPosiciones] = useState([]);
  const [goleadores, setGoleadores] = useState([]);
  const [tarjetas, setTarjetas] = useState([]);
  const [playoffs, setPlayoffs] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Cargar divisiones vivas + historial al montar
  useEffect(() => {
    cargarDivisiones().then((list) => {
      if (genero && list.length > 0) {
        const divMatch = list.find((d) => d.genero?.toLowerCase() === genero.toLowerCase());
        if (divMatch) {
          setDivisionActivaId(divMatch.id_division);
          setSeleccion(String(divMatch.id_division));
        }
      }
    });

    api.get('/divisiones/historial')
      .then((res) => setHistorialTorneos(res.data.data || []))
      .catch(() => {});
  }, [genero, cargarDivisiones, setDivisionActivaId]);

  // Sincronizar seleccion con divisionActivaId cuando cambia desde el store (ej. cambio externo)
  useEffect(() => {
    if (!snapshotActivo && divisionActivaId) {
      setSeleccion(String(divisionActivaId));
    }
  }, [divisionActivaId, snapshotActivo]);

  const handleSeleccion = useCallback((valor) => {
    setSeleccion(valor);
    if (valor.startsWith('h_')) {
      const id = valor.replace('h_', '');
      const snap = historialTorneos.find((h) => String(h.id_historial) === id);
      setSnapshotActivo(snap || null);
    } else {
      setSnapshotActivo(null);
      setDivisionActivaId(valor);
    }
  }, [historialTorneos, setDivisionActivaId]);

  // Cuando se selecciona un snapshot: cargar datos directamente desde el JSONB
  useEffect(() => {
    if (!snapshotActivo) return;
    setCargando(false);
    setPosiciones(snapshotActivo.tabla_posiciones || []);
    setGoleadores(snapshotActivo.goleadores_club || []);
    setTarjetas(snapshotActivo.tarjetas_club || []);
    setPlayoffs(snapshotActivo.playoffs || []);
    setPartidos(snapshotActivo.partidos || []);
  }, [snapshotActivo]);

  // Cuando se selecciona una división viva: cargar según pestaña
  useEffect(() => {
    if (!divisionActivaId || snapshotActivo) return;

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
    return () => { cancelado = true; };
  }, [tabActiva, divisionActivaId, soloClub, snapshotActivo]);

  const tabs = [
    { id: 'posiciones', label: 'Posiciones', icon: FaTrophy },
    { id: 'goleadores', label: 'Goleadores', icon: FaFutbol },
    { id: 'tarjetas', label: 'Tarjetas', icon: FaIdCard },
    { id: 'playoff', label: 'Fase Eliminatoria', icon: FaProjectDiagram },
    { id: 'partidos', label: 'Partidos Disputados', icon: FaCalendarAlt },
  ];

  const divisionesVisibles = genero
    ? divisiones.filter((d) => d.genero?.toLowerCase() === genero.toLowerCase())
    : divisiones;

  const historialVisible = genero
    ? historialTorneos.filter((h) => h.genero?.toLowerCase() === genero.toLowerCase())
    : historialTorneos;

  const divisionesEnCurso  = divisionesVisibles.filter((d) => !d.terminado);
  const divisionesTerminadas = divisionesVisibles.filter((d) => d.terminado);
  const divisionActiva = divisionesVisibles.find((d) => Number(d.id_division) === Number(divisionActivaId));

  const esHistorial = Boolean(divisionActiva?.terminado) || Boolean(snapshotActivo);
  const nombreHistorial = snapshotActivo?.nombre_division || divisionActiva?.nombre_division;
  const temporadaHistorial = snapshotActivo?.temporada || divisionActiva?.temporada;

  // En modo snapshot los datos de goleadores/tarjetas ya son solo del club
  const mostrarToggleSoloClub = !snapshotActivo;

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f2fc] pb-16">
      {/* ─── Encabezado ───────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-200 py-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="font-headline tracking-[0.25em] text-[#151f89] uppercase text-xs font-bold">
            LIGA FUTSAL AFA TUCUMÁN
          </span>

          <h1 className="font-headline text-3xl sm:text-5xl uppercase tracking-wider text-[#151f89] drop-shadow-xs">
            {genero ? `Futsal ${genero}` : 'Torneo Oficial'}
          </h1>

          {/* Selector de edición */}
          <div className="relative inline-block mt-2">
            <select
              value={seleccion}
              onChange={(e) => handleSeleccion(e.target.value)}
              className="appearance-none bg-white border-2 border-slate-300 text-slate-800 font-headline font-bold text-sm sm:text-base py-2.5 pl-6 pr-12 rounded-full focus:outline-none focus:border-[#151f89] cursor-pointer shadow-sm hover:border-[#151f89] transition-all uppercase tracking-wider max-w-[85vw] sm:max-w-none"
            >
              {divisionesEnCurso.length > 0 && (
                <optgroup label="─── TORNEOS EN CURSO ───">
                  {divisionesEnCurso.map((div) => (
                    <option key={div.id_division} value={String(div.id_division)}>
                      {div.nombre_division.toUpperCase()} ({div.temporada})
                    </option>
                  ))}
                </optgroup>
              )}
              {divisionesTerminadas.length > 0 && (
                <optgroup label="─── TORNEOS FINALIZADOS ───">
                  {divisionesTerminadas.map((div) => (
                    <option key={div.id_division} value={String(div.id_division)}>
                      {div.nombre_division.toUpperCase()} ({div.temporada})
                    </option>
                  ))}
                </optgroup>
              )}
              {historialVisible.length > 0 && (
                <optgroup label="─── EDICIONES ANTERIORES ───">
                  {historialVisible.map((h) => (
                    <option key={h.id_historial} value={`h_${h.id_historial}`}>
                      {(h.nombre_division || '').toUpperCase()} ({h.temporada})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <FaChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-xs" />
          </div>
        </div>
      </section>

      {/* Banner historial */}
      {esHistorial && (
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-[#151f89]/8 border border-[#151f89]/25 text-[#151f89] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-title font-semibold flex items-center justify-center gap-2 shadow-xs">
            <FaArchive className="text-base text-[#151f89]/70 shrink-0" />
            <span>
              Estás consultando el{' '}
              <strong>Historial Oficial</strong> de la edición{' '}
              <strong>{nombreHistorial}</strong>{temporadaHistorial ? ` (${temporadaHistorial})` : ''}. Los datos corresponden al torneo finalizado.
            </span>
          </div>
        </div>
      )}

      {/* ─── Pestañas ─────────────────────────────────────────────────────── */}
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

      {/* ─── Contenido ────────────────────────────────────────────────────── */}
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex-1 w-full">
        {tabActiva === 'posiciones' && (
          <StandingsTable clasificacion={posiciones} cargando={cargando} />
        )}

        {tabActiva === 'goleadores' && (
          <ScorersTable
            goleadores={goleadores}
            cargando={cargando}
            soloClub={soloClub}
            onToggleSoloClub={mostrarToggleSoloClub ? setSoloClub : undefined}
          />
        )}

        {tabActiva === 'tarjetas' && (
          <CardsTable
            tarjetas={tarjetas}
            cargando={cargando}
            soloClub={soloClub}
            onToggleSoloClub={mostrarToggleSoloClub ? setSoloClub : undefined}
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
