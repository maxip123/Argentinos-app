import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import ConfirmModal from '../ui/ConfirmModal';
import Paginacion from '../ui/Paginacion';
import usePaginacion from '../../hooks/usePaginacion';
import {
  FaUserPlus,
  FaUserEdit,
  FaTrash,
  FaSearch,
  FaShieldAlt,
  FaIdCard,
  FaCheck,
  FaTimes,
  FaExclamationCircle,
  FaPhone,
  FaEnvelope,
  FaCalendarAlt,
  FaSyncAlt,
  FaUsers,
  FaTshirt,
  FaUserSlash,
} from 'react-icons/fa';

export default function JugadoresManager({ divisiones = [] }) {
  const [jugadores, setJugadores] = useState([]);
  const [equiposClub, setEquiposClub] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEquipo, setFiltroEquipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('activos'); // 'activos' | 'inactivos' | 'todos'
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Modales
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [jugadorEditando, setJugadorEditando] = useState(null);

  // Modal de confirmación UI (reemplazo de window.confirm)
  const [modalConfirmacion, setModalConfirmacion] = useState({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Confirmar',
    variant: 'danger',
    badge: 'Padrón Central',
    onConfirm: null,
  });

  // Formulario nuevo jugador
  const [nuevoJugador, setNuevoJugador] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    fecha_nacimiento: '',
    telefono: '',
    email: '',
    id_equipo_inicial: '',
  });

  const mostrarAviso = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };

  // Cargar equipos de Argentinos del Norte para filtros y asignación rápida
  const cargarEquiposClub = useCallback(async () => {
    try {
      const res = await api.get('/equipos?solo_argentinos=true');
      setEquiposClub(res.data.data || []);
    } catch (err) {
      console.error('[JugadoresManager] Error al cargar equipos:', err);
    }
  }, []);

  // Cargar todos los jugadores del Padrón Central
  const cargarJugadores = useCallback(async () => {
    setCargando(true);
    try {
      let url = '/jugadores?solo_club=true';
      if (filtroEquipo) url += `&id_equipo=${filtroEquipo}`;
      if (busqueda) url += `&q=${encodeURIComponent(busqueda)}`;
      const res = await api.get(url);
      setJugadores(res.data.data || []);
    } catch (err) {
      console.error('[JugadoresManager] Error al cargar padrón:', err);
      mostrarAviso('error', 'Error al cargar padrón de jugadores.');
    } finally {
      setCargando(false);
    }
  }, [filtroEquipo, busqueda]);

  useEffect(() => {
    cargarEquiposClub();
  }, [cargarEquiposClub]);

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarJugadores();
    }, 250);
    return () => clearTimeout(timer);
  }, [cargarJugadores]);

  // Manejar creación en el padrón
  const handleCrear = async (e) => {
    e.preventDefault();
    if (!nuevoJugador.nombre.trim() || !nuevoJugador.apellido.trim() || !nuevoJugador.dni.trim()) {
      mostrarAviso('error', 'Nombre, apellido y DNI son campos obligatorios.');
      return;
    }
    if (!/^\d{6,8}$/.test(nuevoJugador.dni.trim())) {
      mostrarAviso('error', 'El DNI debe contener solo números (6 a 8 dígitos).');
      return;
    }
    if (nuevoJugador.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevoJugador.email.trim())) {
      mostrarAviso('error', 'El formato del correo electrónico no es válido.');
      return;
    }
    setCargando(true);
    try {
      await api.post('/jugadores', {
        nombre: nuevoJugador.nombre.trim(),
        apellido: nuevoJugador.apellido.trim(),
        dni: nuevoJugador.dni.trim(),
        fecha_nacimiento: nuevoJugador.fecha_nacimiento || null,
        telefono: nuevoJugador.telefono?.trim() || null,
        email: nuevoJugador.email?.trim() || null,
        id_equipo: nuevoJugador.id_equipo_inicial ? Number(nuevoJugador.id_equipo_inicial) : null,
      });

      mostrarAviso('exito', `¡Jugador ${nuevoJugador.nombre} ${nuevoJugador.apellido} incorporado al Padrón del Club!`);
      setMostrarCrear(false);
      setNuevoJugador({
        nombre: '',
        apellido: '',
        dni: '',
        fecha_nacimiento: '',
        telefono: '',
        email: '',
        id_equipo_inicial: '',
      });
      cargarJugadores();
    } catch (err) {
      mostrarAviso('error', err.response?.data?.mensaje || 'Error al registrar jugador en el padrón.');
    } finally {
      setCargando(false);
    }
  };

  // Manejar edición de ficha
  const handleEditar = async (e) => {
    e.preventDefault();
    if (!jugadorEditando) return;
    if (!jugadorEditando.nombre.trim() || !jugadorEditando.apellido.trim() || !jugadorEditando.dni.trim()) {
      mostrarAviso('error', 'Nombre, apellido y DNI son campos obligatorios.');
      return;
    }
    if (!/^\d{6,8}$/.test(jugadorEditando.dni.trim())) {
      mostrarAviso('error', 'El DNI debe contener solo números (6 a 8 dígitos).');
      return;
    }
    if (jugadorEditando.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(jugadorEditando.email.trim())) {
      mostrarAviso('error', 'El formato del correo electrónico no es válido.');
      return;
    }
    setCargando(true);
    try {
      await api.put(`/jugadores/${jugadorEditando.id_jugador}`, {
        nombre: jugadorEditando.nombre.trim(),
        apellido: jugadorEditando.apellido.trim(),
        dni: jugadorEditando.dni.trim(),
        fecha_nacimiento: jugadorEditando.fecha_nacimiento || null,
        telefono: jugadorEditando.telefono?.trim() || null,
        email: jugadorEditando.email?.trim() || null,
        es_inactivo: jugadorEditando.es_inactivo,
      });

      mostrarAviso('exito', 'Ficha del socio actualizada correctamente.');
      setJugadorEditando(null);
      cargarJugadores();
    } catch (err) {
      mostrarAviso('error', err.response?.data?.mensaje || 'Error al actualizar jugador.');
    } finally {
      setCargando(false);
    }
  };

  // Baja o reactivación (estado activo/inactivo)
  const handleToggleBaja = (jugador) => {
    const reactivando = jugador.es_inactivo;
    setModalConfirmacion({
      isOpen: true,
      title: reactivando ? '¿Reactivar socio en el padrón?' : '¿Marcar socio como inactivo?',
      description: reactivando
        ? `¿Confirmás reactivar la ficha del socio ${jugador.nombre} ${jugador.apellido}? Podrá volver a ser convocado a planteles y registrar cuotas activas.`
        : `¿Confirmás pasar a inactivo al socio ${jugador.nombre} ${jugador.apellido}? No aparecerá en las convocatorias activas de los equipos hasta ser reactivado.`,
      confirmText: reactivando ? 'Sí, Reactivar Socio' : 'Marcar Inactivo',
      variant: reactivando ? 'club' : 'warning',
      badge: 'Estado del Socio',
      onConfirm: async () => {
        try {
          await api.put(`/jugadores/${jugador.id_jugador}`, {
            es_inactivo: !jugador.es_inactivo,
          });
          mostrarAviso('exito', `Jugador ${jugador.es_inactivo ? 'reactivado' : 'marcado como inactivo'} correctamente.`);
          cargarJugadores();
          setModalConfirmacion(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          mostrarAviso('error', 'Error al modificar estado del jugador.');
        }
      },
    });
  };

  // Eliminación lógica definitiva del padrón (DELETE /api/jugadores/:id -> activo = false)
  const handleEliminarJugador = (jugador) => {
    setModalConfirmacion({
      isOpen: true,
      title: '¿Eliminar socio del padrón?',
      description: `¿Estás seguro de que deseás eliminar a ${jugador.nombre} ${jugador.apellido} del padrón central? Se realizará una baja lógica preventiva y el jugador será desconvocado automáticamente de todos los planteles.`,
      confirmText: 'Sí, Eliminar Socio',
      variant: 'danger',
      badge: 'Baja Definitiva',
      onConfirm: async () => {
        try {
          await api.delete(`/jugadores/${jugador.id_jugador}`);
          mostrarAviso('exito', `Socio ${jugador.nombre} ${jugador.apellido} eliminado del padrón correctamente.`);
          if (jugadorEditando?.id_jugador === jugador.id_jugador) {
            setJugadorEditando(null);
          }
          cargarJugadores();
          setModalConfirmacion(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          mostrarAviso('error', 'Error al eliminar jugador: ' + (err.response?.data?.mensaje || err.message));
        }
      },
    });
  };

  // Helpers de estado de cuota y vencimiento
  // El backend calcula el estado por fecha: el día del vencimiento todavía cuenta como al día
  const esAlDia = (j) => j.estado_cuota === 'Al dia';
  const esPendiente = (j) => j.estado_cuota === 'Pendiente';

  const formatearVencimiento = (fechaStr, esInactivo) => {
    if (esInactivo) {
      return { texto: 'Socio Inactivo', estado: 'inactivo', color: 'text-slate-400', badgeColor: 'bg-slate-100 text-slate-500' };
    }
    if (!fechaStr) {
      return { texto: 'Sin cuota registrada', estado: 'sin_cuota', color: 'text-slate-400', badgeColor: 'bg-amber-50 text-amber-700 border border-amber-200' };
    }

    const partes = String(fechaStr).split('T')[0].split('-');
    let fecha;
    if (partes.length === 3) {
      fecha = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    } else {
      fecha = new Date(fechaStr);
    }

    if (isNaN(fecha.getTime())) {
      return { texto: 'Sin registro', estado: 'sin_cuota', color: 'text-slate-400', badgeColor: 'bg-amber-50 text-amber-700' };
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaComp = new Date(fecha);
    fechaComp.setHours(0, 0, 0, 0);

    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    const fechaFormateada = `${dia}/${mes}/${anio}`;

    if (fechaComp < hoy) {
      return {
        texto: `Venció: ${fechaFormateada}`,
        fechaFormateada,
        esVencido: true,
        color: 'text-red-600',
        badgeColor: 'bg-red-50 text-red-700 border border-red-200',
        estadoBadge: 'Vencido',
      };
    } else {
      return {
        texto: `Vence: ${fechaFormateada}`,
        fechaFormateada,
        esVencido: false,
        color: 'text-emerald-700',
        badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        estadoBadge: 'Al día',
      };
    }
  };

  // Métricas para filtros rápidos
  const totalPendientes = jugadores.filter(esPendiente).length;
  const totalAlDia = jugadores.filter(esAlDia).length;
  const totalInactivos = jugadores.filter(j => j.es_inactivo).length;
  const totalActivos = jugadores.filter(j => !j.es_inactivo).length;

  // Filtrado en memoria por estado activo / cuota pendiente / al día / inactivo
  const jugadoresFiltrados = jugadores.filter(j => {
    if (filtroEstado === 'pendientes') return esPendiente(j);
    if (filtroEstado === 'al_dia') return esAlDia(j);
    if (filtroEstado === 'activos') return !j.es_inactivo;
    if (filtroEstado === 'inactivos') return j.es_inactivo;
    return true;
  });
  const paginacion = usePaginacion(jugadoresFiltrados, 15, `${busqueda}|${filtroEquipo}|${filtroEstado}`);

  return (
    <div className="space-y-6">
      {/* ─── Encabezado Padrón ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-[#1e1b4b] text-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              <span className="text-[11px] font-mono tracking-widest text-slate-300 uppercase">Directorio Institucional</span>
            </div>
            <h1 className="font-headline text-2xl uppercase tracking-wide mt-0.5">Padrón Central de Jugadores y Socios</h1>
            <p className="text-xs text-slate-300 font-title mt-0.5">
              Registro único de jugadores del club por DNI. Asignables a múltiples planteles y categorías.
            </p>
          </div>

          <button
            onClick={() => setMostrarCrear(true)}
            className="flex items-center gap-2 bg-[#991b1b] hover:bg-[#7f1d1d] text-white px-5 py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider transition-all shadow-sm hover:scale-102"
          >
            <FaUserPlus /> Registrar Jugador en Padrón
          </button>
        </div>

        {/* Notificaciones */}
        {mensaje.texto && (
          <div className={`p-4 text-xs font-bold border-b ${
            mensaje.tipo === 'exito' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {mensaje.texto}
          </div>
        )}

        {/* Barra de Filtros y Búsqueda */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3.5 top-3 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Buscar por Nombre, Apellido o DNI..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30"
            />
          </div>

          <select
            value={filtroEquipo}
            onChange={e => setFiltroEquipo(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="">Todos los planteles del club</option>
            {equiposClub.map(eq => (
              <option key={eq.id_equipo} value={eq.id_equipo}>
                {eq.nombre_equipo} ({eq.nombre_division})
              </option>
            ))}
          </select>

          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="todos">Todos los socios ({jugadores.length})</option>
            <option value="pendientes">Cuota Pendiente ({totalPendientes})</option>
            <option value="al_dia">Cuota al Día ({totalAlDia})</option>
            <option value="activos">Solo Activos ({totalActivos})</option>
            <option value="inactivos">Solo Bajas / Inactivos ({totalInactivos})</option>
          </select>

          <button
            onClick={cargarJugadores}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-700 text-xs font-title font-bold transition-colors shrink-0"
          >
            <FaSyncAlt className={cargando ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>
        </div>

        {/* Chips de filtro rápido por estado y cuotas */}
        <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-500 mr-1">Filtro rápido:</span>
          
          <button
            type="button"
            onClick={() => setFiltroEstado('todos')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              filtroEstado === 'todos'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Todos ({jugadores.length})
          </button>

          <button
            type="button"
            onClick={() => setFiltroEstado('pendientes')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              filtroEstado === 'pendientes'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300'
            }`}
          >
            <FaExclamationCircle className="text-xs" />
            <span>Cuota Pendiente ({totalPendientes})</span>
          </button>

          <button
            type="button"
            onClick={() => setFiltroEstado('al_dia')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              filtroEstado === 'al_dia'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
            }`}
          >
            <FaCheck className="text-xs" />
            <span>Al Día ({totalAlDia})</span>
          </button>

          <button
            type="button"
            onClick={() => setFiltroEstado('inactivos')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              filtroEstado === 'inactivos'
                ? 'bg-slate-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Bajas ({totalInactivos})
          </button>
        </div>
      </div>

      {/* ─── Padrón Central: Vista Móvil y Desktop ─────────────────── */}
      <div id={paginacion.idLista} className="space-y-3 scroll-mt-24">
        {/* Vista Móvil: Cards */}
        <div className="block md:hidden space-y-3">
          {cargando ? (
            <div className="p-8 text-center text-slate-400 font-title text-xs">Consultando padrón de jugadores...</div>
          ) : jugadoresFiltrados.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-title text-xs">No se encontraron socios con estos filtros.</div>
          ) : (
            paginacion.visibles.map(j => {
              const equipos = Array.isArray(j.equipos_asignados) ? j.equipos_asignados : [];
              return (
                <div key={j.id_jugador} className={`bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3 ${j.es_inactivo ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 uppercase shrink-0">
                        {j.nombre[0]}{j.apellido[0]}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-sm block leading-tight">{j.apellido}, {j.nombre}</span>
                        <span className="text-[11px] text-slate-400 font-mono">DNI: {j.dni || '—'}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {(() => {
                        const v = formatearVencimiento(j.fecha_vencimiento, j.es_inactivo);
                        return (
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${v.badgeColor}`}>
                              {j.es_inactivo ? 'Inactivo' : (v.estadoBadge || 'Pendiente')}
                            </span>
                            <div className={`flex items-center justify-end gap-1 text-[10px] font-mono font-medium ${v.color}`}>
                              <FaCalendarAlt className="text-[9px] opacity-70" />
                              <span>{v.texto}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Planteles asignados */}
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Planteles asignados:</span>
                    {equipos.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">Sin plantel asignado</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {equipos.map((eq, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 bg-blue-50 text-blue-900 border border-blue-200/80 px-2 py-0.5 rounded-lg text-[10px] font-bold"
                          >
                            <FaShieldAlt className="text-[9px] text-[#991b1b]" />
                            {eq.nombre_equipo}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Contacto y Acciones */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <div>
                      {j.telefono && (
                        <span className="flex items-center gap-1.5 font-mono text-[11px]">
                          <FaPhone className="text-[10px] text-slate-400" />
                          <span>{j.telefono}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setJugadorEditando(j)}
                        className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        title="Editar ficha"
                      >
                        <FaUserEdit className="text-xs" />
                      </button>
                      <button
                        onClick={() => handleToggleBaja(j)}
                        className={`p-2 rounded-lg transition-colors ${
                          j.es_inactivo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title={j.es_inactivo ? 'Reactivar socio' : 'Marcar inactivo temporalmente'}
                      >
                        <FaUserSlash className="text-xs" />
                      </button>
                      <button
                        onClick={() => handleEliminarJugador(j)}
                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        title="Eliminar socio (borrado lógico)"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Vista Desktop: Tabla del Padrón Central */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {cargando ? (
          <div className="p-12 text-center text-slate-400 font-title text-sm">Consultando padrón de jugadores...</div>
        ) : jugadoresFiltrados.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FaUsers className="mx-auto text-4xl text-slate-300" />
            <p className="text-slate-500 font-title text-sm">No se encontraron jugadores en el padrón con estos filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-headline text-[11px] text-slate-500 uppercase tracking-wider">
                  <th className="p-3.5">Socio / Jugador</th>
                  <th className="p-3.5">DNI</th>
                  <th className="p-3.5">Planteles Asignados (Multi-equipo)</th>
                  <th className="p-3.5">Contacto</th>
                  <th className="p-3.5">Cuota / Próximo Vencimiento</th>
                  <th className="p-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-title text-xs">
                {paginacion.visibles.map(j => {
                  const equipos = Array.isArray(j.equipos_asignados) ? j.equipos_asignados : [];
                  return (
                    <tr key={j.id_jugador} className={`hover:bg-slate-50/80 transition-colors ${j.es_inactivo ? 'opacity-60' : ''}`}>
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 uppercase">
                            {j.nombre[0]}{j.apellido[0]}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block text-sm">{j.apellido}, {j.nombre}</span>
                            {j.es_inactivo && (
                              <span className="text-[10px] font-bold text-red-600 uppercase font-mono">Dado de Baja</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-xs font-bold text-slate-700">{j.dni || '—'}</td>
                      <td className="p-3.5">
                        {equipos.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">Sin plantel asignado</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {equipos.map((eq, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-900 border border-blue-200/80 px-2 py-0.5 rounded-lg text-[11px] font-bold"
                              >
                                <FaShieldAlt className="text-[9px] text-[#991b1b]" />
                                {eq.nombre_equipo}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {j.telefono && <div className="text-[11px] flex items-center gap-1"><FaPhone className="text-[9px] text-slate-400" /> {j.telefono}</div>}
                        {j.email && <div className="text-[11px] flex items-center gap-1 text-slate-400"><FaEnvelope className="text-[9px]" /> {j.email}</div>}
                        {!j.telefono && !j.email && <span className="text-slate-400">—</span>}
                      </td>
                      <td className="p-3.5">
                        {(() => {
                          const v = formatearVencimiento(j.fecha_vencimiento, j.es_inactivo);
                          return (
                            <div className="space-y-1">
                              <div>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${v.badgeColor}`}>
                                  {j.es_inactivo ? 'Inactivo' : (v.estadoBadge || 'Pendiente')}
                                </span>
                              </div>
                              <div className={`flex items-center gap-1.5 text-[11px] font-mono font-medium ${v.color}`}>
                                <FaCalendarAlt className="text-[10px] opacity-70 shrink-0" />
                                <span>{v.texto}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setJugadorEditando(j)}
                            className="text-slate-400 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Editar ficha personal"
                          >
                            <FaUserEdit className="text-sm" />
                          </button>
                          <button
                            onClick={() => handleToggleBaja(j)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              j.es_inactivo
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                            title={j.es_inactivo ? 'Reactivar socio' : 'Marcar inactivo temporalmente'}
                          >
                            <FaUserSlash className="text-xs" />
                          </button>
                          <button
                            onClick={() => handleEliminarJugador(j)}
                            className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Eliminar socio (borrado lógico)"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!cargando && <Paginacion paginacion={paginacion} singular="jugador" plural="jugadores" />}
    </div>

      {/* ── Modal: Registrar Jugador en Padrón ── */}
      {mostrarCrear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-gradient-to-r from-[#991b1b] to-[#7f1d1d] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-red-200 font-bold">Padrón Único</span>
                <h3 className="font-headline text-lg sm:text-xl uppercase tracking-wide">Alta de Jugador / Socio</h3>
              </div>
              <button onClick={() => setMostrarCrear(false)} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleCrear} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                <FaExclamationCircle className="text-amber-700 mt-0.5 shrink-0" />
                <p>
                  Antes de cargar los datos, el club debe contar con el consentimiento firmado de la persona o, si es menor de edad,
                  de sus responsables. Ver la <a href="/privacidad" target="_blank" rel="noreferrer" className="font-bold underline">Política de Privacidad</a>.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Nombre *</label>
                  <input
                    type="text" required
                    value={nuevoJugador.nombre}
                    onChange={e => setNuevoJugador({ ...nuevoJugador, nombre: e.target.value })}
                    placeholder="Ej: Lucas"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Apellido *</label>
                  <input
                    type="text" required
                    value={nuevoJugador.apellido}
                    onChange={e => setNuevoJugador({ ...nuevoJugador, apellido: e.target.value })}
                    placeholder="Ej: González"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">DNI (Único en el Club) *</label>
                  <input
                    type="text" required
                    value={nuevoJugador.dni}
                    onChange={e => setNuevoJugador({ ...nuevoJugador, dni: e.target.value })}
                    placeholder="Ej: 42123456"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={nuevoJugador.fecha_nacimiento}
                    onChange={e => setNuevoJugador({ ...nuevoJugador, fecha_nacimiento: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={nuevoJugador.telefono}
                    onChange={e => setNuevoJugador({ ...nuevoJugador, telefono: e.target.value })}
                    placeholder="381-..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={nuevoJugador.email}
                    onChange={e => setNuevoJugador({ ...nuevoJugador, email: e.target.value })}
                    placeholder="socio@argentinos.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30"
                  />
                </div>
              </div>

              {/* Asignación inicial opcional */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <span className="text-[11px] font-headline uppercase text-slate-700 tracking-wider block">
                  Asignación a Plantel Inicial (Opcional)
                </span>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Equipo del Club</label>
                  <select
                    value={nuevoJugador.id_equipo_inicial}
                    onChange={e => setNuevoJugador({ ...nuevoJugador, id_equipo_inicial: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none"
                  >
                    <option value="">Sin asignar aún (solo padrón central)</option>
                    {equiposClub.map(eq => (
                      <option key={eq.id_equipo} value={eq.id_equipo}>{eq.nombre_equipo}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit" disabled={cargando}
                  className="flex-1 bg-[#991b1b] hover:bg-[#7f1d1d] disabled:opacity-60 text-white py-3 rounded-xl font-headline uppercase text-xs tracking-wider transition-colors shadow-sm"
                >
                  {cargando ? 'Guardando...' : 'Incorporar al Padrón'}
                </button>
                <button
                  type="button" onClick={() => setMostrarCrear(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-title font-bold text-xs text-slate-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Editar Ficha de Jugador ── */}
      {jugadorEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300 font-bold">Ficha de Socio</span>
                <h3 className="font-headline text-lg sm:text-xl uppercase tracking-wide truncate max-w-[260px] sm:max-w-none">
                  Editar: {jugadorEditando.nombre} {jugadorEditando.apellido}
                </h3>
              </div>
              <button onClick={() => setJugadorEditando(null)} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleEditar} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Nombre</label>
                  <input
                    type="text" required
                    value={jugadorEditando.nombre}
                    onChange={e => setJugadorEditando({ ...jugadorEditando, nombre: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Apellido</label>
                  <input
                    type="text" required
                    value={jugadorEditando.apellido}
                    onChange={e => setJugadorEditando({ ...jugadorEditando, apellido: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">DNI</label>
                  <input
                    type="text" required
                    value={jugadorEditando.dni}
                    onChange={e => setJugadorEditando({ ...jugadorEditando, dni: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={jugadorEditando.fecha_nacimiento ? jugadorEditando.fecha_nacimiento.split('T')[0] : ''}
                    onChange={e => setJugadorEditando({ ...jugadorEditando, fecha_nacimiento: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={jugadorEditando.telefono || ''}
                    onChange={e => setJugadorEditando({ ...jugadorEditando, telefono: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={jugadorEditando.email || ''}
                    onChange={e => setJugadorEditando({ ...jugadorEditando, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                {(() => {
                  const v = formatearVencimiento(jugadorEditando.fecha_vencimiento, jugadorEditando.es_inactivo);
                  return (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">Estado Cuota Social</div>
                        <div className="mt-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${v.badgeColor}`}>
                            {jugadorEditando.es_inactivo ? 'Inactivo' : (v.estadoBadge || 'Pendiente')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">Próximo Vencimiento</div>
                        <div className={`flex items-center justify-end gap-1.5 mt-1 text-xs font-mono font-bold ${v.color}`}>
                          <FaCalendarAlt className="text-[11px] opacity-80" />
                          <span>{v.texto}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={jugadorEditando.es_inactivo}
                    onChange={e => setJugadorEditando({ ...jugadorEditando, es_inactivo: e.target.checked })}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="text-xs font-bold text-slate-700">Marcar socio como INACTIVO / BAJA</span>
                </label>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit" disabled={cargando}
                  className="flex-1 bg-slate-900 hover:bg-black disabled:opacity-60 text-white py-3 rounded-xl font-headline uppercase text-xs tracking-wider transition-colors shadow-sm"
                >
                  {cargando ? 'Actualizando...' : 'Guardar Cambios'}
                </button>
                <button
                  type="button"
                  onClick={() => handleEliminarJugador(jugadorEditando)}
                  className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-title font-bold text-xs transition-colors flex items-center gap-1.5"
                  title="Eliminar socio del padrón (borrado lógico)"
                >
                  <FaTrash className="text-xs" />
                  <span>Eliminar</span>
                </button>
                <button
                  type="button" onClick={() => setJugadorEditando(null)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-title font-bold text-xs text-slate-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
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
