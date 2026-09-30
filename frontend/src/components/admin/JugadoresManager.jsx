import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import ClubShield from '../ui/ClubShield';
import {
  FaUserPlus,
  FaUserEdit,
  FaTrash,
  FaSearch,
  FaTrophy,
  FaShieldAlt,
  FaFutbol,
  FaIdCard,
  FaSquare,
  FaCheck,
  FaExclamationTriangle,
  FaArrowRight,
} from 'react-icons/fa';

export default function JugadoresManager({
  divisiones = [],
  divisionInicialId = '',
  equipoInicialId = '',
}) {
  const [divisionSel, setDivisionSel] = useState(
    divisionInicialId || (divisiones[0]?.id_division || '')
  );
  const [equipoSel, setEquipoSel] = useState(equipoInicialId || '');
  const [equipos, setEquipos] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Modales
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [jugadorEditando, setJugadorEditando] = useState(null);

  // Formulario nuevo jugador (Siempre para Argentinos del Norte)
  const [nuevoJugador, setNuevoJugador] = useState({
    id_equipo: '',
    nombre: '',
    apellido: '',
    dni: '',
    fecha_nacimiento: '',
    telefono: '',
    email: '',
  });

  const mostrarAviso = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };

  // Cargar equipos de la división actual
  const cargarEquipos = useCallback(async () => {
    if (!divisionSel) return;
    try {
      const res = await api.get(`/equipos?id_division=${divisionSel}`);
      const list = res.data.data || [];
      setEquipos(list);

      // Filtrar solo equipos de Argentinos del Norte
      const equiposDelClub = list.filter((e) => e.es_argentinos_del_norte);

      // Si hay un solo equipo del club, auto-seleccionarlo por comodidad
      if (equiposDelClub.length === 1 && !equipoSel) {
        setEquipoSel(equiposDelClub[0].id_equipo);
      } else if (equipoSel && !equiposDelClub.some((eq) => String(eq.id_equipo) === String(equipoSel))) {
        setEquipoSel('');
      }
    } catch (err) {
      console.error(err);
    }
  }, [divisionSel, equipoSel]);

  useEffect(() => {
    cargarEquipos();
  }, [cargarEquipos]);

  // Cargar jugadores del club en la división
  const cargarJugadores = useCallback(async () => {
    if (!divisionSel) return;
    setCargando(true);
    try {
      // Forzar solo_club=true para que únicamente liste jugadores de Argentinos del Norte
      let url = `/jugadores?id_division=${divisionSel}&solo_club=true`;
      if (equipoSel) url += `&id_equipo=${equipoSel}`;
      const res = await api.get(url);
      setJugadores(res.data.data || []);
    } catch (err) {
      console.error(err);
      mostrarAviso('error', 'Error al cargar jugadores: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setCargando(false);
    }
  }, [divisionSel, equipoSel]);

  useEffect(() => {
    cargarJugadores();
  }, [cargarJugadores]);

  // Sincronizar props externos
  useEffect(() => {
    if (divisionInicialId) setDivisionSel(divisionInicialId);
    if (equipoInicialId) setEquipoSel(equipoInicialId);
  }, [divisionInicialId, equipoInicialId]);

  // Equipos del club en el torneo actual
  const equiposClub = equipos.filter((e) => e.es_argentinos_del_norte);

  // Crear Jugador
  const handleCrear = async (e) => {
    e.preventDefault();
    if (!nuevoJugador.id_equipo) {
      mostrarAviso('error', 'Debés seleccionar el plantel de Argentinos del Norte al que ingresa el jugador.');
      return;
    }
    setCargando(true);
    try {
      await api.post('/jugadores', {
        id_division: Number(divisionSel),
        id_equipo: Number(nuevoJugador.id_equipo),
        nombre: nuevoJugador.nombre.trim(),
        apellido: nuevoJugador.apellido.trim(),
        dni: nuevoJugador.dni.trim(),
        fecha_nacimiento: nuevoJugador.fecha_nacimiento || null,
        telefono: nuevoJugador.telefono?.trim() || null,
        email: nuevoJugador.email?.trim() || null,
      });

      mostrarAviso('exito', `¡Jugador ${nuevoJugador.nombre} ${nuevoJugador.apellido} ingresado a Argentinos del Norte!`);
      setMostrarCrear(false);
      setNuevoJugador({
        id_equipo: equipoSel || (equiposClub[0]?.id_equipo || ''),
        nombre: '',
        apellido: '',
        dni: '',
        fecha_nacimiento: '',
        telefono: '',
        email: '',
      });
      cargarJugadores();
    } catch (err) {
      mostrarAviso('error', 'Error al registrar jugador: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setCargando(false);
    }
  };

  // Guardar Edición
  const handleEditar = async (e) => {
    e.preventDefault();
    if (!jugadorEditando) return;
    setCargando(true);
    try {
      await api.put(`/jugadores/${jugadorEditando.id_jugador}`, {
        id_division: Number(divisionSel),
        id_equipo: Number(jugadorEditando.id_equipo),
        nombre: jugadorEditando.nombre.trim(),
        apellido: jugadorEditando.apellido.trim(),
        dni: jugadorEditando.dni.trim(),
        fecha_nacimiento: jugadorEditando.fecha_nacimiento ? jugadorEditando.fecha_nacimiento.substring(0, 10) : null,
        telefono: jugadorEditando.telefono?.trim() || null,
        email: jugadorEditando.email?.trim() || null,
      });

      mostrarAviso('exito', 'Datos del jugador actualizados correctamente.');
      setJugadorEditando(null);
      cargarJugadores();
    } catch (err) {
      mostrarAviso('error', 'Error al actualizar jugador: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setCargando(false);
    }
  };

  // Eliminar Jugador
  const handleEliminar = async (id, nombreCompleto) => {
    if (!window.confirm(`¿Estás seguro de que deseas dar de baja del club al jugador '${nombreCompleto}'?`)) return;
    setCargando(true);
    try {
      await api.delete(`/jugadores/${id}`);
      mostrarAviso('exito', `Jugador '${nombreCompleto}' dado de baja del plantel.`);
      cargarJugadores();
    } catch (err) {
      mostrarAviso('error', 'Error al eliminar jugador: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setCargando(false);
    }
  };

  const jugadoresFiltrados = jugadores.filter((j) => {
    const q = busqueda.toLowerCase();
    const nombreCompleto = `${j.apellido} ${j.nombre}`.toLowerCase();
    const dni = String(j.dni || '');
    return nombreCompleto.includes(q) || dni.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Encabezado y Filtros Principales */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-[#151f89] font-headline text-xs tracking-widest uppercase">
            <ClubShield className="w-5 h-6" />
            <span>Plantel Oficial • Club Argentinos del Norte</span>
          </div>
          <h2 className="font-headline text-2xl uppercase tracking-wide text-slate-900 mt-1 flex items-center gap-2">
            Gestión de Jugadores del Club
          </h2>
          <p className="text-xs text-slate-500 font-body">
            Registro e ingreso oficial con DNI exclusivo para los planteles de Argentinos del Norte (Primera, Reserva, Femenino).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Torneo */}
          <div className="flex items-center gap-2">
            <FaTrophy className="text-[#151f89] text-sm" />
            <select
              value={divisionSel}
              onChange={(e) => {
                setDivisionSel(e.target.value);
                setEquipoSel('');
                setJugadorEditando(null);
                setMostrarCrear(false);
              }}
              className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 font-title font-bold text-sm text-slate-800 focus:outline-none focus:border-[#151f89]"
            >
              {divisiones.map((d) => (
                <option key={d.id_division} value={d.id_division}>
                  {d.nombre_division} ({d.temporada})
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Plantel de Argentinos del Norte */}
          <div className="flex items-center gap-2">
            <FaShieldAlt className="text-[#151f89] text-sm" />
            <select
              value={equipoSel}
              onChange={(e) => setEquipoSel(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 font-title font-bold text-sm text-slate-800 focus:outline-none focus:border-[#151f89]"
            >
              <option value="">Todos los Planteles del Club</option>
              {equiposClub.map((eq) => (
                <option key={eq.id_equipo} value={eq.id_equipo}>
                  {eq.nombre_equipo}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setMostrarCrear(!mostrarCrear);
              setNuevoJugador({
                ...nuevoJugador,
                id_equipo: equipoSel || (equiposClub[0]?.id_equipo || ''),
              });
              setJugadorEditando(null);
            }}
            className="flex items-center gap-2 bg-[#151f89] hover:bg-[#303a9f] text-white px-5 py-2.5 rounded-xl font-headline uppercase text-sm tracking-wider shadow-sm transition-all"
          >
            <FaUserPlus className="text-xs" />
            <span>Ingresar Jugador</span>
          </button>
        </div>
      </div>

      {/* Avisos */}
      {mensaje.texto && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
            mensaje.tipo === 'exito'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* Alerta si el torneo no tiene ningún equipo de Argentinos del Norte configurado */}
      {equiposClub.length === 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 p-5 rounded-2xl flex items-start gap-3 shadow-xs">
          <FaExclamationTriangle className="text-amber-600 text-xl shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-headline text-sm uppercase text-amber-900">
              No hay equipos de Argentinos del Norte registrados en este torneo
            </h4>
            <p className="text-xs text-amber-800 font-body">
              Para poder ingresar jugadores, primero debés registrar el equipo oficial del club (ej. <em>"Argentinos del Norte A"</em>) con la casilla <strong>"Es Equipo Oficial del Club"</strong> marcada en la sección de <strong>Equipos</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Formulario Crear Jugador (Exclusivo Argentinos del Norte) */}
      {mostrarCrear && (
        <div className="bg-white border-2 border-[#151f89] p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <ClubShield className="w-6 h-7" />
              <div>
                <h3 className="font-headline text-lg uppercase text-[#151f89]">
                  Ingresar Jugador • Club Argentinos del Norte
                </h3>
                <span className="text-xs text-slate-500 font-body">
                  El jugador pertenecerá a la lista de buena fe oficial y se habilitará su cobro de cuota mensual.
                </span>
              </div>
            </div>
            <span className="bg-blue-50 text-[#151f89] text-[10px] font-headline uppercase px-3 py-1 rounded-full font-bold">
              Registro Oficial
            </span>
          </div>

          <form onSubmit={handleCrear} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                Plantel de Argentinos del Norte *
              </label>
              <select
                required
                value={nuevoJugador.id_equipo}
                onChange={(e) => setNuevoJugador({ ...nuevoJugador, id_equipo: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body font-bold text-slate-900"
              >
                <option value="">Seleccionar Plantel del Club</option>
                {equiposClub.map((eq) => (
                  <option key={eq.id_equipo} value={eq.id_equipo}>
                    {eq.nombre_equipo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                Apellido *
              </label>
              <input
                type="text"
                required
                placeholder="ej. González"
                value={nuevoJugador.apellido}
                onChange={(e) => setNuevoJugador({ ...nuevoJugador, apellido: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body"
              />
            </div>

            <div>
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                Nombre *
              </label>
              <input
                type="text"
                required
                placeholder="ej. Martín"
                value={nuevoJugador.nombre}
                onChange={(e) => setNuevoJugador({ ...nuevoJugador, nombre: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body"
              />
            </div>

            <div>
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                DNI / Documento AFA *
              </label>
              <input
                type="text"
                required
                placeholder="ej. 42123456"
                value={nuevoJugador.dni}
                onChange={(e) => setNuevoJugador({ ...nuevoJugador, dni: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                Fecha de Nacimiento
              </label>
              <input
                type="date"
                value={nuevoJugador.fecha_nacimiento}
                onChange={(e) => setNuevoJugador({ ...nuevoJugador, fecha_nacimiento: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body"
              />
            </div>

            <div>
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                Teléfono de Contacto
              </label>
              <input
                type="tel"
                placeholder="ej. 3815551234"
                value={nuevoJugador.telefono}
                onChange={(e) => setNuevoJugador({ ...nuevoJugador, telefono: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="ej. martin@gmail.com"
                value={nuevoJugador.email}
                onChange={(e) => setNuevoJugador({ ...nuevoJugador, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body"
              />
            </div>

            <div className="sm:col-span-3 flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-title flex items-center gap-1.5">
                <FaCheck className="text-emerald-600 text-xs" />
                <span>Jugador federado exclusivo de Argentinos del Norte</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={cargando || equiposClub.length === 0}
                  className="bg-[#151f89] hover:bg-[#303a9f] disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-headline uppercase text-sm tracking-wider shadow-sm transition-all"
                >
                  {cargando ? 'Guardando...' : 'Ingresar Jugador'}
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarCrear(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-title font-bold text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Formulario Editar Jugador */}
      {jugadorEditando && (
        <div className="bg-blue-50 border-2 border-[#151f89] p-6 rounded-2xl shadow-md space-y-4">
          <div className="flex items-center gap-2">
            <FaUserEdit className="text-[#151f89]" />
            <h3 className="font-headline text-lg uppercase text-[#151f89]">
              Editar Jugador: {jugadorEditando.apellido}, {jugadorEditando.nombre}
            </h3>
          </div>

          <form onSubmit={handleEditar} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                Plantel de Argentinos del Norte *
              </label>
              <select
                required
                value={jugadorEditando.id_equipo}
                onChange={(e) => setJugadorEditando({ ...jugadorEditando, id_equipo: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-body font-bold text-slate-900"
              >
                {equiposClub.map((eq) => (
                  <option key={eq.id_equipo} value={eq.id_equipo}>
                    {eq.nombre_equipo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                Apellido *
              </label>
              <input
                type="text"
                required
                value={jugadorEditando.apellido}
                onChange={(e) => setJugadorEditando({ ...jugadorEditando, apellido: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-body"
              />
            </div>

            <div>
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={jugadorEditando.nombre}
                onChange={(e) => setJugadorEditando({ ...jugadorEditando, nombre: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-body"
              />
            </div>

            <div>
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                DNI / Documento *
              </label>
              <input
                type="text"
                required
                value={jugadorEditando.dni}
                onChange={(e) => setJugadorEditando({ ...jugadorEditando, dni: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-body font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                Fecha de Nacimiento
              </label>
              <input
                type="date"
                value={
                  jugadorEditando.fecha_nacimiento
                    ? jugadorEditando.fecha_nacimiento.substring(0, 10)
                    : ''
                }
                onChange={(e) =>
                  setJugadorEditando({ ...jugadorEditando, fecha_nacimiento: e.target.value })
                }
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-body"
              />
            </div>

            <div>
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={jugadorEditando.telefono || ''}
                onChange={(e) => setJugadorEditando({ ...jugadorEditando, telefono: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-body"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                Email
              </label>
              <input
                type="email"
                value={jugadorEditando.email || ''}
                onChange={(e) => setJugadorEditando({ ...jugadorEditando, email: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-body"
              />
            </div>

            <div className="sm:col-span-3 flex items-center justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={cargando}
                className="bg-[#151f89] hover:bg-[#303a9f] text-white px-6 py-2.5 rounded-lg font-headline uppercase text-sm tracking-wider shadow-sm transition-all"
              >
                {cargando ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              <button
                type="button"
                onClick={() => setJugadorEditando(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-lg font-title font-bold text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Controles de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Buscar por apellido o DNI en el club..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-sm font-body focus:outline-none focus:border-[#151f89]"
            />
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          </div>

          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-[#151f89] border border-blue-200 text-xs font-title font-bold px-3 py-1.5 rounded-xl">
            <ClubShield className="w-3.5 h-4" />
            <span>Exclusivo Plantel de Argentinos del Norte</span>
          </span>
        </div>

        <span className="text-xs font-title font-semibold text-slate-500">
          {jugadoresFiltrados.length} jugadores en el plantel
        </span>
      </div>

      {/* Tabla de Jugadores */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm min-w-[750px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-headline text-xs text-slate-600 uppercase">
                <th className="p-3.5">Jugador</th>
                <th className="p-3.5">DNI</th>
                <th className="p-3.5">Plantel</th>
                <th className="p-3.5 text-center">Goles</th>
                <th className="p-3.5 text-center">Tarjetas</th>
                <th className="p-3.5 text-center">Condición</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-title">
              {jugadoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 font-body text-sm space-y-2">
                    <p className="font-headline text-base text-slate-600 uppercase">No hay jugadores registrados en este plantel</p>
                    <p className="text-xs text-slate-400">
                      Hacé clic en "Ingresar Jugador" para agregar un nuevo integrante al plantel de Argentinos del Norte.
                    </p>
                  </td>
                </tr>
              ) : (
                jugadoresFiltrados.map((j) => (
                  <tr key={j.id_jugador} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <span className="font-bold text-slate-900 block text-base">
                        {j.apellido}, {j.nombre}
                      </span>
                      {j.telefono && (
                        <span className="text-xs text-slate-400 font-normal">Tel: {j.telefono}</span>
                      )}
                    </td>

                    <td className="p-3.5 font-mono font-bold text-slate-700">{j.dni}</td>

                    <td className="p-3.5 font-bold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <ClubShield className="w-3.5 h-4 text-[#151f89] shrink-0" />
                        <span>{j.nombre_equipo}</span>
                      </span>
                    </td>

                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                        <FaFutbol className="text-slate-400 text-xs" />
                        <span>{j.goles_totales || 0}</span>
                      </span>
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="inline-flex items-center gap-2">
                        <span className="inline-flex items-center gap-0.5 text-amber-600 font-bold text-xs" title="Amarillas">
                          <FaSquare className="text-[10px]" />
                          <span>{j.amarillas_totales || 0}</span>
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-red-600 font-bold text-xs" title="Rojas">
                          <FaSquare className="text-[10px]" />
                          <span>{j.rojas_totales || 0}</span>
                        </span>
                      </div>
                    </td>

                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-[#151f89] text-[10px] px-2.5 py-0.5 rounded-full font-headline uppercase tracking-wider">
                        <FaCheck className="text-[8px]" />
                        Socio / Club
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setJugadorEditando(j);
                            setMostrarCrear(false);
                          }}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-colors"
                          title="Editar jugador"
                        >
                          <FaUserEdit />
                        </button>
                        <button
                          onClick={() => handleEliminar(j.id_jugador, `${j.apellido} ${j.nombre}`)}
                          className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs transition-colors"
                          title="Dar de baja jugador del club"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
