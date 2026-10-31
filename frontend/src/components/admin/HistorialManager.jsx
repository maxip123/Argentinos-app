import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import ClubShield from '../ui/ClubShield';
import ConfirmModal from '../ui/ConfirmModal';
import Paginacion from '../ui/Paginacion';
import usePaginacion from '../../hooks/usePaginacion';
import { formatFecha } from '../../utils/fechas';
import { ETIQUETA_COPA, normalizarLlave } from '../../utils/playoffs';
import {
  FaTrophy,
  FaMedal,
  FaHistory,
  FaCalendarAlt,
  FaFutbol,
  FaShieldAlt,
  FaSearch,
  FaFilter,
  FaArrowLeft,
  FaSyncAlt,
  FaCheckCircle,
  FaUndo,
  FaChartBar,
  FaProjectDiagram,
  FaUsers,
  FaTrash,
  FaIdCard,
} from 'react-icons/fa';

export default function HistorialManager({ onActualizarTorneos }) {
  const [torneosHistorial, setTorneosHistorial] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [filtroTemporada, setFiltroTemporada] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Torneo seleccionado para ver detalle histórico
  const [torneoSeleccionado, setTorneoSeleccionado] = useState(null);
  const [subTab, setSubTab] = useState('tabla'); // 'tabla' | 'partidos' | 'playoff' | 'goleadores' | 'tarjetas'
  const [tablaPosiciones, setTablaPosiciones] = useState([]);
  const [partidosTorneo, setPartidosTorneo] = useState([]);
  const [llavesPlayoff, setLlavesPlayoff] = useState([]);
  const [goleadoresClub, setGoleadoresClub] = useState([]);
  const [tarjetasClub, setTarjetasClub] = useState([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // Modal de confirmación UI (reemplazo de window.confirm)
  const [modalConfirmacion, setModalConfirmacion] = useState({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Confirmar',
    variant: 'danger',
    badge: 'Archivo Histórico',
    onConfirm: null,
  });

  const mostrarAviso = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };

  // Cargar lista de torneos finalizados
  const cargarHistorial = useCallback(async () => {
    setCargando(true);
    try {
      const res = await api.get('/divisiones/historial');
      setTorneosHistorial(res.data.data || []);
    } catch (err) {
      console.error('[HistorialManager] Error al cargar historial:', err);
      mostrarAviso('error', 'Error al cargar torneos históricos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  // Cargar detalles cuando se selecciona un torneo
  const cargarDetalleTorneo = useCallback(async (idDivision) => {
    setCargandoDetalle(true);
    try {
      const [resClasif, resPartidos, resPlayoff, resGoleadores, resTarjetas] = await Promise.all([
        api.get(`/clasificacion/${idDivision}`),
        api.get(`/partidos?id_division=${idDivision}`),
        api.get(`/playoff/${idDivision}`),
        api.get(`/jugadores/goleadores/${idDivision}?solo_club=true`),
        api.get(`/jugadores/tarjetas/${idDivision}?solo_club=true`),
      ]);
      setTablaPosiciones(resClasif.data.data || []);
      setPartidosTorneo(resPartidos.data.data || []);
      setLlavesPlayoff(resPlayoff.data.data || []);
      setGoleadoresClub(resGoleadores.data.data || []);
      setTarjetasClub(resTarjetas.data.data || []);
    } catch (err) {
      console.error('[HistorialManager] Error al cargar detalles:', err);
      mostrarAviso('error', 'Error al cargar datos del torneo.');
    } finally {
      setCargandoDetalle(false);
    }
  }, []);

  useEffect(() => {
    if (!torneoSeleccionado) return;

    if (torneoSeleccionado.es_snapshot_rico) {
      // Usar directamente los datos archivados en el snapshot
      setTablaPosiciones(torneoSeleccionado.tabla_posiciones || []);
      // Los partidos del snapshot guardan los equipos con otros nombres de campo
      setPartidosTorneo((torneoSeleccionado.partidos || []).map((p) => ({
        ...p,
        equipo_local: p.equipo_local ?? p.local_nombre,
        equipo_visitante: p.equipo_visitante ?? p.visitante_nombre,
      })));
      setLlavesPlayoff((torneoSeleccionado.playoffs || []).map(normalizarLlave));
      setGoleadoresClub(torneoSeleccionado.goleadores_club || []);
      setTarjetasClub(torneoSeleccionado.tarjetas_club || []);
      setCargandoDetalle(false);
    } else {
      // Fallback para torneos finalizados legacy anteriores
      cargarDetalleTorneo(torneoSeleccionado.id_division);
    }
  }, [torneoSeleccionado, cargarDetalleTorneo]);

  // Reabrir torneo legacy (marcar terminado = false)
  const handleReabrirTorneo = (torneo) => {
    setModalConfirmacion({
      isOpen: true,
      title: '¿Reabrir torneo archivado?',
      description: `¿Estás seguro de que deseás reabrir '${torneo.nombre_division}'? El torneo volverá a listarse como torneo activo en curso y podrá recibir nuevas ediciones de partidos y planteles.`,
      confirmText: 'Sí, Reactivar Torneo',
      variant: 'club',
      badge: 'Reactivación de Torneo',
      onConfirm: async () => {
        try {
          await api.put(`/divisiones/${torneo.id_division}`, {
            nombre_division: torneo.nombre_division,
            categoria: torneo.categoria,
            genero: torneo.genero,
            temporada: Number(torneo.temporada),
            terminado: false,
          });
          mostrarAviso('exito', `Torneo '${torneo.nombre_division}' reabierto como activo.`);
          setTorneoSeleccionado(null);
          cargarHistorial();
          if (onActualizarTorneos) onActualizarTorneos();
          setModalConfirmacion(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          mostrarAviso('error', 'Error al reabrir el torneo.');
        }
      },
    });
  };

  // Eliminar registro del historial
  const handleEliminarHistorial = (torneo) => {
    setModalConfirmacion({
      isOpen: true,
      title: '¿Eliminar torneo del historial?',
      description: `¿Estás seguro de que deseas eliminar permanentemente '${torneo.nombre_division}' del archivo histórico? Se perderán las estadísticas guardadas y los registros archivados de esta edición.`,
      confirmText: 'Sí, Eliminar Historial',
      variant: 'danger',
      badge: 'Baja de Archivo',
      onConfirm: async () => {
        try {
          if (torneo.id_historial) {
            await api.delete(`/divisiones/historial/${torneo.id_historial}`);
          } else {
            await api.delete(`/divisiones/${torneo.id_division}`);
          }
          mostrarAviso('exito', `Torneo '${torneo.nombre_division}' eliminado del archivo histórico.`);
          setTorneoSeleccionado(null);
          cargarHistorial();
          if (onActualizarTorneos) onActualizarTorneos();
          setModalConfirmacion(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          mostrarAviso('error', 'Error al eliminar torneo del archivo: ' + (err.response?.data?.mensaje || err.message));
        }
      },
    });
  };

  // Filtrado de temporadas únicas disponibles
  const temporadasDisponibles = Array.from(
    new Set(torneosHistorial.map(t => t.temporada))
  ).sort((a, b) => b - a);

  // Filtrado de torneos
  const torneosFiltrados = torneosHistorial.filter(t => {
    if (filtroTemporada && String(t.temporada) !== String(filtroTemporada)) return false;
    if (filtroCategoria && t.categoria !== filtroCategoria) return false;
    if (busqueda && !t.nombre_division.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  const claveTorneo = torneoSeleccionado?.id_historial ?? torneoSeleccionado?.id_division ?? '';
  const pagTorneos = usePaginacion(torneosFiltrados, 9, `${filtroTemporada}|${filtroCategoria}`);
  const pagPartidos = usePaginacion(partidosTorneo, 15, claveTorneo);
  const pagGoleadores = usePaginacion(goleadoresClub, 15, claveTorneo);
  const pagTarjetas = usePaginacion(tarjetasClub, 15, claveTorneo);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ─── VISTA DETALLE DE TORNEO HISTÓRICO ─────────────────────────────── */}
      {torneoSeleccionado ? (
        <div className="space-y-6">
          {/* Barra superior con volver */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => setTorneoSeleccionado(null)}
                className="p-2.5 sm:p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors shrink-0"
                title="Volver al archivo histórico"
              >
                <FaArrowLeft className="text-sm" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                    <FaTrophy className="text-amber-600" />
                    Edición Finalizada ({torneoSeleccionado.temporada})
                  </span>
                  {torneoSeleccionado.es_snapshot_rico && (
                    <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                      <FaCheckCircle className="text-emerald-600" />
                      Snapshot Histórico Oficial
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 font-title font-bold uppercase">
                    {torneoSeleccionado.categoria} • {torneoSeleccionado.genero}
                  </span>
                </div>
                <h2 className="font-headline text-xl sm:text-2xl uppercase tracking-wide text-slate-900 mt-0.5 truncate">
                  {torneoSeleccionado.nombre_division}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!torneoSeleccionado.es_snapshot_rico && (
                <button
                  onClick={() => handleReabrirTorneo(torneoSeleccionado)}
                  className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider transition-colors"
                  title="Reactivar como torneo en curso"
                >
                  <FaUndo className="text-xs" />
                  <span>Reabrir Torneo</span>
                </button>
              )}
              <button
                onClick={() => handleEliminarHistorial(torneoSeleccionado)}
                className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider transition-colors"
                title="Eliminar este registro del archivo histórico"
              >
                <FaTrash className="text-xs" />
                <span>Eliminar del Archivo</span>
              </button>
            </div>
          </div>

          {/* Podio de Honor del Torneo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Campeón */}
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 to-white rounded-2xl border-2 border-amber-400 p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-headline uppercase tracking-widest text-amber-800 font-bold flex items-center gap-1.5">
                  <FaMedal className="text-amber-500 text-base" /> Campeón
                </span>
                <span className="text-xs font-mono font-bold text-amber-800">1° Puesto</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white border border-amber-200 flex items-center justify-center p-2 shadow-xs shrink-0">
                  {torneoSeleccionado.campeon_definitivo?.es_argentinos_del_norte ? (
                    <ClubShield className="w-8 h-9" />
                  ) : (
                    <FaFutbol className="text-slate-400 text-xl" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-headline text-lg uppercase text-slate-900 truncate">
                    {torneoSeleccionado.campeon_definitivo?.nombre_equipo || 'Por Definir'}
                  </h3>
                  <span className="text-[11px] text-amber-900 font-title font-bold block mt-0.5">
                    {torneoSeleccionado.campeon_playoff ? 'Campeón de Playoffs' : `${torneoSeleccionado.campeon_tabla?.puntos || 0} Puntos en Tabla`}
                  </span>
                </div>
              </div>
            </div>

            {/* Subcampeón */}
            <div className="bg-gradient-to-br from-slate-200/40 via-slate-50 to-white rounded-2xl border border-slate-300 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-headline uppercase tracking-widest text-slate-600 font-bold flex items-center gap-1.5">
                  <FaMedal className="text-slate-400 text-base" /> Subcampeón
                </span>
                <span className="text-xs font-mono font-bold text-slate-600">2° Puesto</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-2 shadow-xs shrink-0">
                  <FaFutbol className="text-slate-400 text-xl" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-headline text-lg uppercase text-slate-900 truncate">
                    {torneoSeleccionado.subcampeon_tabla?.nombre_equipo || '—'}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-title block mt-0.5">
                    {torneoSeleccionado.subcampeon_tabla?.puntos || 0} Puntos
                  </span>
                </div>
              </div>
            </div>

            {/* Estadísticas de la Edición */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-headline uppercase tracking-widest text-slate-400 font-bold block mb-2">
                Resumen de la Edición
              </span>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-500 font-title uppercase block">Partidos Jugados</span>
                  <strong className="font-headline text-xl text-slate-900">{torneoSeleccionado.partidos_jugados || 0}</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-500 font-title uppercase block">Goles Totales</span>
                  <strong className="font-headline text-xl text-[#991b1b]">{torneoSeleccionado.total_goles || 0}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-tabs: Tabla vs Fixture vs Playoffs vs Goleadores vs Tarjetas */}
          <div className="flex border-b border-slate-200 gap-4 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSubTab('tabla')}
              className={`pb-3 font-headline text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 border-b-2 shrink-0 transition-all ${
                subTab === 'tabla' ? 'border-[#991b1b] text-[#991b1b]' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FaChartBar /> Tabla Final ({tablaPosiciones.length})
            </button>
            <button
              onClick={() => setSubTab('partidos')}
              className={`pb-3 font-headline text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 border-b-2 shrink-0 transition-all ${
                subTab === 'partidos' ? 'border-[#991b1b] text-[#991b1b]' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FaCalendarAlt /> Fixture ({partidosTorneo.length})
            </button>
            {llavesPlayoff.length > 0 && (
              <button
                onClick={() => setSubTab('playoff')}
                className={`pb-3 font-headline text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 border-b-2 shrink-0 transition-all ${
                  subTab === 'playoff' ? 'border-[#991b1b] text-[#991b1b]' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FaProjectDiagram /> Playoffs ({llavesPlayoff.length})
              </button>
            )}
            <button
              onClick={() => setSubTab('goleadores')}
              className={`pb-3 font-headline text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 border-b-2 shrink-0 transition-all ${
                subTab === 'goleadores' ? 'border-[#991b1b] text-[#991b1b]' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FaFutbol /> Goleadores del Club ({goleadoresClub.length})
            </button>
            <button
              onClick={() => setSubTab('tarjetas')}
              className={`pb-3 font-headline text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 border-b-2 shrink-0 transition-all ${
                subTab === 'tarjetas' ? 'border-[#991b1b] text-[#991b1b]' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FaIdCard /> Tarjetas del Club ({tarjetasClub.length})
            </button>
          </div>

          {/* TAB 1: TABLA FINAL DE POSICIONES */}
          {subTab === 'tabla' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {cargandoDetalle ? (
                <div className="p-12 text-center text-slate-400 font-title text-sm">Cargando posiciones...</div>
              ) : tablaPosiciones.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-title text-sm">No hay tabla registrada para esta edición.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-headline text-[11px] text-slate-500 uppercase tracking-wider">
                        <th className="p-3.5 w-12 text-center">Pos</th>
                        <th className="p-3.5">Equipo</th>
                        <th className="p-3.5 text-center font-bold">PTS</th>
                        <th className="p-3.5 text-center">PJ</th>
                        <th className="p-3.5 text-center">PG</th>
                        <th className="p-3.5 text-center">PE</th>
                        <th className="p-3.5 text-center">PP</th>
                        <th className="p-3.5 text-center">GF</th>
                        <th className="p-3.5 text-center">GC</th>
                        <th className="p-3.5 text-center font-bold">DIF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-title text-xs">
                      {tablaPosiciones.map((c, index) => {
                        const esPrimero = index === 0;
                        const esSegundo = index === 1;
                        const esTercero = index === 2;
                        const esClub = c.es_argentinos_del_norte;

                        return (
                          <tr
                            key={c.id_clasificacion || index}
                            className={`transition-colors ${
                              esClub ? 'bg-red-50/50 font-bold' : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className="p-3.5 text-center font-headline text-xs">
                              {esPrimero ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-bold text-xs shadow-xs">
                                  1
                                </span>
                              ) : esSegundo ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-bold text-xs">
                                  2
                                </span>
                              ) : esTercero ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-bold text-xs">
                                  3
                                </span>
                              ) : (
                                <span className="text-slate-400">{index + 1}</span>
                              )}
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center gap-2.5">
                                {esClub ? (
                                  <ClubShield className="w-5 h-6 shrink-0" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-500 font-bold shrink-0">
                                    {c.nombre_equipo?.[0]}
                                  </div>
                                )}
                                <span className="font-bold text-slate-900 text-sm">{c.nombre_equipo}</span>
                                {esClub && (
                                  <span className="bg-[#991b1b] text-white text-[9px] px-1.5 py-0.2 rounded-full font-headline uppercase">
                                    Club
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 text-center font-headline text-sm font-bold text-slate-900 bg-slate-50/50">
                              {c.puntos}
                            </td>
                            <td className="p-3.5 text-center text-slate-600">{c.partidos_jugados}</td>
                            <td className="p-3.5 text-center text-emerald-700 font-bold">{c.partidos_ganados}</td>
                            <td className="p-3.5 text-center text-slate-600">{c.partidos_empatados}</td>
                            <td className="p-3.5 text-center text-red-600">{c.partidos_perdidos}</td>
                            <td className="p-3.5 text-center text-slate-600">{c.goles_a_favor}</td>
                            <td className="p-3.5 text-center text-slate-600">{c.goles_en_contra}</td>
                            <td className="p-3.5 text-center font-mono font-bold text-slate-800">
                              {c.diferencia_gol > 0 ? `+${c.diferencia_gol}` : c.diferencia_gol}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PARTIDOS HISTÓRICOS */}
          {subTab === 'partidos' && (
            <div id={pagPartidos.idLista} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm scroll-mt-24">
              <div className="divide-y divide-slate-100">
                {partidosTorneo.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-title text-sm">No hay partidos registrados en este torneo.</div>
                ) : (
                  pagPartidos.visibles.map(p => (
                    <div key={p.id_partido} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md shrink-0">
                          {p.nombre_partido || `Fecha ${p.jornada_numero}`}
                        </span>
                        <div className="text-xs text-slate-500 font-title">
                          {formatFecha(p.fecha_partido)}
                          {p.nombre_sede && ` • ${p.nombre_sede}`}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-center gap-4 flex-1 max-w-md">
                        <span className={`text-xs text-right flex-1 truncate ${p.goles_local > p.goles_visitante ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                          {p.equipo_local}
                        </span>
                        <div className="px-3 py-1 bg-slate-100 rounded-lg font-headline text-base text-slate-900 shrink-0">
                          {p.estado_partido === 2 ? `${p.goles_local} - ${p.goles_visitante}` : 'vs'}
                        </div>
                        <span className={`text-xs text-left flex-1 truncate ${p.goles_visitante > p.goles_local ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                          {p.equipo_visitante}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Paginacion paginacion={pagPartidos} singular="partido" plural="partidos" className="p-4 border-t border-slate-100" />
            </div>
          )}

          {/* TAB 3: PLAYOFFS */}
          {subTab === 'playoff' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="font-headline text-lg uppercase text-slate-900 flex items-center gap-2">
                <FaProjectDiagram className="text-[#151f89]" />
                Cuadro Eliminatorio de la Edición
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {llavesPlayoff.map(llave => (
                  <div key={llave.id_llave} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-headline uppercase text-slate-500 pb-1 border-b border-slate-200">
                      <span>
                        {llave.copa && llave.copa !== 'Unica' ? `${ETIQUETA_COPA[llave.copa]} · ` : ''}{llave.fase}
                      </span>
                      <span>Partido {llave.orden}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 truncate">{llave.equipo_local_nombre || 'Por Definir'}</span>
                      <strong className="font-headline text-sm">{llave.estado_partido === 2 ? llave.goles_local : '-'}</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 truncate">{llave.equipo_visitante_nombre || 'Por Definir'}</span>
                      <strong className="font-headline text-sm">{llave.estado_partido === 2 ? llave.goles_visitante : '-'}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: GOLEADORES DE ARGENTINOS DEL NORTE */}
          {subTab === 'goleadores' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-headline text-slate-900 text-lg uppercase tracking-wide flex items-center gap-2">
                    <FaFutbol className="text-[#151f89]" />
                    Goleadores de Argentinos del Norte en esta Edición
                  </h3>
                  <p className="text-xs text-slate-500 font-title">
                    Goles oficiales marcados por socios y jugadores del club durante el torneo
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-blue-50 text-[#151f89] border border-blue-200 px-3 py-1 rounded-full text-xs font-title font-bold shadow-2xs">
                  <ClubShield className="w-4 h-4 shrink-0" />
                  <span>Estadísticas del Club</span>
                </div>
              </div>

              {goleadoresClub.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-title text-sm">
                  No se registraron goles de jugadores del club en esta edición.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-[#efecf6] text-[#454652] uppercase tracking-wider border-b border-slate-200 font-headline text-xs">
                        <th className="py-3 px-3 w-16 text-center">POS</th>
                        <th className="py-3 px-4">JUGADOR</th>
                        <th className="py-3 px-4">EQUIPO</th>
                        <th className="py-3 px-6 text-center font-headline text-[#151f89]">GOLES</th>
                      </tr>
                    </thead>
                    <tbody className="font-body text-sm divide-y divide-slate-100">
                      {pagGoleadores.visibles.map((jugador, index) => {
                        const pos = pagGoleadores.desde + index + 1;
                        return (
                          <tr key={jugador.id_jugador || index} className="hover:bg-blue-50/50 transition-colors">
                            <td className="py-3.5 px-3 text-center">
                              {pos === 1 ? (
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FFDF00] to-[#D4AF37] text-white flex items-center justify-center font-headline text-xs mx-auto shadow-sm border border-[#DAA520]/50 font-bold">
                                  1
                                </div>
                              ) : pos === 2 ? (
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E0E0E0] to-[#BDBDBD] text-white flex items-center justify-center font-headline text-xs mx-auto shadow-sm border border-[#9E9E9E]/50 font-bold">
                                  2
                                </div>
                              ) : pos === 3 ? (
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#CD7F32] to-[#A0522D] text-white flex items-center justify-center font-headline text-xs mx-auto shadow-sm border border-[#8B4513]/50 font-bold">
                                  3
                                </div>
                              ) : (
                                <span className="font-title font-bold text-slate-500 text-sm">{pos}</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                                  {jugador.foto_url ? (
                                    <img src={jugador.foto_url} alt={jugador.nombre} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="font-headline text-xs text-slate-600 font-bold">
                                      {jugador.nombre ? jugador.nombre[0] : ''}{jugador.apellido ? jugador.apellido[0] : ''}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-title text-base font-bold text-slate-900 leading-tight">
                                    {jugador.apellido}, {jugador.nombre}
                                  </span>
                                  <span className="bg-[#151f89] text-white text-[10px] px-1.5 py-0.5 rounded font-headline uppercase tracking-wider">
                                    Club
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-title text-sm text-slate-700 font-semibold">
                              <div className="flex items-center gap-2">
                                <ClubShield className="w-4 h-5" />
                                <span>{jugador.nombre_equipo || 'Argentinos del Norte'}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-6 text-center font-headline text-2xl text-[#151f89] font-black">
                              {jugador.goles}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <Paginacion paginacion={pagGoleadores} singular="goleador" plural="goleadores" className="p-4 border-t border-slate-100" />
            </div>
          )}

          {/* TAB 5: CONTROL DISCIPLINARIO (TARJETAS) */}
          {subTab === 'tarjetas' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-headline text-slate-900 text-lg uppercase tracking-wide flex items-center gap-2">
                    <FaIdCard className="text-amber-600" />
                    Sanciones y Tarjetas de Argentinos del Norte
                  </h3>
                  <p className="text-xs text-slate-500 font-title">
                    Historial disciplinario acumulado en este torneo por jugadores del club
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-blue-50 text-[#151f89] border border-blue-200 px-3 py-1 rounded-full text-xs font-title font-bold shadow-2xs">
                  <ClubShield className="w-4 h-4 shrink-0" />
                  <span>Control Disciplinario</span>
                </div>
              </div>

              {tarjetasClub.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-title text-sm">
                  No se registraron amonestaciones o expulsiones de jugadores del club en esta edición.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-[#efecf6] text-[#454652] uppercase tracking-wider border-b border-slate-200 font-headline text-xs">
                        <th className="py-3 px-3 w-16 text-center">#</th>
                        <th className="py-3 px-4">JUGADOR</th>
                        <th className="py-3 px-4">EQUIPO</th>
                        <th className="py-3 px-4 text-center">
                          <span className="inline-block w-4 h-5 bg-amber-400 rounded-xs shadow-xs border border-amber-500" title="Amarillas"></span>
                        </th>
                        <th className="py-3 px-4 text-center">
                          <span className="inline-block w-4 h-5 bg-red-600 rounded-xs shadow-xs border border-red-700" title="Rojas"></span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="font-body text-sm divide-y divide-slate-100">
                      {pagTarjetas.visibles.map((jugador, index) => (
                        <tr key={jugador.id_jugador || index} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-3 text-center font-title font-bold text-slate-500">
                            {pagTarjetas.desde + index + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-title text-base font-bold text-slate-900">
                                {jugador.apellido}, {jugador.nombre}
                              </span>
                              <span className="bg-[#151f89] text-white text-[10px] px-1.5 py-0.5 rounded font-headline uppercase tracking-wider">
                                Club
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-title text-sm text-slate-700 font-semibold">
                            <div className="flex items-center gap-2">
                              <ClubShield className="w-4 h-5" />
                              <span>{jugador.nombre_equipo || 'Argentinos del Norte'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-headline text-lg text-amber-600 font-bold">
                            {jugador.amarillas || 0}
                          </td>
                          <td className="py-3.5 px-4 text-center font-headline text-lg text-red-600 font-bold">
                            {jugador.rojas || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Paginacion paginacion={pagTarjetas} singular="jugador" plural="jugadores" className="p-4 border-t border-slate-100" />
            </div>
          )}
        </div>
      ) : (
        /* ─── VISTA PRINCIPAL: ARCHIVO DE TORNEOS HISTÓRICOS ─────────────────── */
        <>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest text-amber-700 uppercase font-bold">Archivo Oficial</span>
                <span className="bg-amber-100 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-headline uppercase">
                  {torneosHistorial.length} Torneos Finalizados
                </span>
              </div>
              <h1 className="font-headline text-2xl uppercase tracking-wide text-slate-900 mt-0.5 flex items-center gap-2">
                <FaHistory className="text-[#991b1b]" />
                Historial de Torneos y Palmarés
              </h1>
              <p className="text-xs text-slate-500 font-body">
                Consultá las ediciones finalizadas de Futsal AFA Tucumán, campeones consagrados, tablas finales y resultados.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {temporadasDisponibles.length > 0 && (
                <select
                  value={filtroTemporada}
                  onChange={e => setFiltroTemporada(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 font-title font-bold text-xs text-slate-800 focus:outline-none"
                >
                  <option value="">Todas las temporadas</option>
                  {temporadasDisponibles.map(t => (
                    <option key={t} value={t}>Año {t}</option>
                  ))}
                </select>
              )}

              <select
                value={filtroCategoria}
                onChange={e => setFiltroCategoria(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 font-title font-bold text-xs text-slate-800 focus:outline-none"
              >
                <option value="">Todas las categorías</option>
                <option value="Primera">Primera</option>
                <option value="Reserva">Reserva</option>
                <option value="Sub-17">Sub-17</option>
                <option value="Sub-15">Sub-15</option>
                <option value="Infantiles">Infantiles</option>
              </select>
            </div>
          </div>

          {/* Notificaciones */}
          {mensaje.texto && (
            <div className={`p-4 rounded-xl text-xs font-bold ${
              mensaje.tipo === 'exito' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {mensaje.texto}
            </div>
          )}

          {/* Grid de Torneos Finalizados */}
          {cargando ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-400 font-title text-sm border border-slate-200">
              Cargando archivo histórico de torneos...
            </div>
          ) : torneosFiltrados.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center space-y-3 border border-slate-200">
              <FaHistory className="mx-auto text-4xl text-slate-300" />
              <h3 className="font-headline text-lg uppercase text-slate-700">Sin torneos finalizados en el archivo</h3>
              <p className="text-xs text-slate-400 font-body max-w-md mx-auto">
                Los torneos marcados como "Finalizados" desde el gestor de Torneos aparecerán aquí con su cuadro de honor, estadísticas y tablas definitivas.
              </p>
            </div>
          ) : (
            <div id={pagTorneos.idLista} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 scroll-mt-24">
              {pagTorneos.visibles.map(torneo => {
                const campeon = torneo.campeon_definitivo;
                const subcampeon = torneo.subcampeon_tabla;

                return (
                  <div
                    key={torneo.id_historial ?? `division-${torneo.id_division}`}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-400/80 transition-all p-5 flex flex-col justify-between"
                  >
                    <div>
                      {/* Cabecera de la tarjeta */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono uppercase font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full inline-block mb-1">
                            Temporada {torneo.temporada}
                          </span>
                          <h3 className="font-headline text-lg uppercase text-slate-900 leading-tight">
                            {torneo.nombre_division}
                          </h3>
                          <span className="text-[11px] text-slate-400 font-title">
                            {torneo.categoria} • {torneo.genero}
                          </span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                          <FaTrophy className="text-lg" />
                        </div>
                      </div>

                      {/* Palmarés: Campeón y Subcampeón */}
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                        <div className="p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-center gap-2.5">
                          <FaMedal className="text-amber-500 text-base shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-headline tracking-wider text-amber-800 block">Campeón</span>
                            <strong className="text-xs font-title text-slate-900 block truncate">
                              {campeon?.nombre_equipo || 'Por Definir'}
                            </strong>
                          </div>
                        </div>

                        {subcampeon && (
                          <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5">
                            <FaMedal className="text-slate-400 text-base shrink-0" />
                            <div className="min-w-0">
                              <span className="text-[10px] uppercase font-headline tracking-wider text-slate-500 block">Subcampeón</span>
                              <strong className="text-xs font-title text-slate-700 block truncate">
                                {subcampeon.nombre_equipo}
                              </strong>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Métricas breves */}
                      <div className="mt-4 flex items-center justify-between text-xs text-slate-500 font-title">
                        <span>Equipos: <strong>{torneo.cantidad_equipos || 0}</strong></span>
                        <span>Partidos: <strong>{torneo.partidos_jugados || 0}</strong></span>
                        <span>Goles: <strong>{torneo.total_goles || 0}</strong></span>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setTorneoSeleccionado(torneo)}
                        className="w-full bg-[#991b1b] hover:bg-[#7f1d1d] text-white py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider transition-all shadow-sm text-center flex items-center justify-center gap-2"
                      >
                        <FaChartBar className="text-xs" />
                        <span>Ver Tabla y Estadísticas</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!cargando && <Paginacion paginacion={pagTorneos} singular="torneo" plural="torneos" />}
        </>
      )}

      {/* Modal de confirmación UI (reemplazo de window.confirm) */}
      <ConfirmModal
        isOpen={modalConfirmacion.isOpen}
        onClose={() => setModalConfirmacion(prev => ({ ...prev, isOpen: false }))}
        onConfirm={modalConfirmacion.onConfirm}
        title={modalConfirmacion.title}
        description={modalConfirmacion.description}
        confirmText={modalConfirmacion.confirmText}
        variant={modalConfirmacion.variant}
        badge={modalConfirmacion.badge}
        cargando={cargando}
      />
    </div>
  );
}
