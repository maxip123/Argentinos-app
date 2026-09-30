import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import ClubShield from '../ui/ClubShield';
import {
  FaShieldAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaUsers,
  FaCheck,
  FaFutbol,
  FaSearch,
  FaTrophy,
  FaArrowLeft,
  FaExchangeAlt,
  FaUserTie,
  FaTshirt,
  FaTimes,
  FaExclamationCircle,
  FaCheckCircle,
} from 'react-icons/fa';

/* ─── Modal para Asignar Jugador Existente del Padrón ───────────────────────── */
function ModalAsignarJugador({ idEquipo, nombreEquipo, onClose, onSuccess }) {
  const [busqueda, setBusqueda] = useState('');
  const [candidatos, setCandidatos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Buscar jugadores en el Padrón Central
  useEffect(() => {
    let activo = true;
    const buscar = async () => {
      setCargando(true);
      try {
        const res = await api.get(`/jugadores?solo_club=true&q=${encodeURIComponent(busqueda)}`);
        if (activo) setCandidatos(res.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (activo) setCargando(false);
      }
    };

    const timer = setTimeout(buscar, 250);
    return () => {
      activo = false;
      clearTimeout(timer);
    };
  }, [busqueda]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jugadorSeleccionado) {
      setError('Debés seleccionar un jugador del padrón.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await api.post(`/equipos/${idEquipo}/plantel`, {
        id_jugador: jugadorSeleccionado.id_jugador,
      });
      onSuccess(`¡${jugadorSeleccionado.nombre} ${jugadorSeleccionado.apellido} incorporado al plantel!`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al asignar jugador al equipo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#991b1b] to-[#7f1d1d] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-red-200 font-bold">Convocatoria al Plantel</span>
            <h3 className="font-headline text-lg sm:text-xl uppercase tracking-wide">Agregar Jugador Existente</h3>
            <p className="text-xs text-red-100 font-medium truncate max-w-[260px] sm:max-w-none">{nombreEquipo}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200 flex items-center gap-2">
              <FaExclamationCircle className="shrink-0" /> {error}
            </div>
          )}

          {/* Buscador en el Padrón */}
          <div>
            <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">
              Buscar en Padrón (Nombre, Apellido o DNI)
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3.5 top-3 text-slate-400 text-xs" />
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Escribí para buscar..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30"
              />
            </div>
          </div>

          {/* Lista de Resultados del Padrón */}
          <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
            {cargando ? (
              <div className="p-4 text-center text-xs text-slate-400">Buscando jugadores...</div>
            ) : candidatos.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">No se encontraron socios con ese término.</div>
            ) : (
              candidatos.map(j => {
                const seleccionado = jugadorSeleccionado?.id_jugador === j.id_jugador;
                return (
                  <div
                    key={j.id_jugador}
                    onClick={() => setJugadorSeleccionado(j)}
                    className={`p-3 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      seleccionado ? 'bg-red-50/80 border-l-4 border-[#991b1b]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{j.apellido}, {j.nombre}</span>
                      <span className="text-[10px] text-slate-400 font-mono">DNI: {j.dni || '—'}</span>
                    </div>
                    {seleccionado && <FaCheckCircle className="text-[#991b1b] text-base" />}
                  </div>
                );
              })
            )}
          </div>

          {/* Confirmación del jugador seleccionado */}
          {jugadorSeleccionado && (
            <div className="p-4 bg-red-50/70 border border-red-200/80 rounded-xl flex items-center justify-between animate-fadeIn">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#991b1b] font-bold block">
                  Jugador Seleccionado
                </span>
                <span className="text-sm font-bold text-slate-900 block">
                  {jugadorSeleccionado.apellido}, {jugadorSeleccionado.nombre}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  DNI: {jugadorSeleccionado.dni || '—'}
                </span>
              </div>
              <span className="text-xs font-bold text-[#991b1b] bg-white px-2.5 py-1 rounded-lg border border-red-200">
                Listo para convocar
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-2 shrink-0 border-t border-slate-100">
            <button
              type="submit" disabled={!jugadorSeleccionado || guardando}
              className="flex-1 bg-[#991b1b] hover:bg-[#7f1d1d] disabled:opacity-50 text-white py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider transition-colors shadow-sm"
            >
              {guardando ? 'Asignando...' : 'Incorporar al Plantel'}
            </button>
            <button
              type="button" onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-title font-bold text-xs text-slate-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Modal para Transferir / Pasar Jugador de Equipo ───────────────────────── */
function ModalTransferir({ jugador, equipoActual, otrosEquiposClub = [], onClose, onSuccess }) {
  const [equipoDestino, setEquipoDestino] = useState(otrosEquiposClub[0]?.id_equipo || '');
  const [accion, setAccion] = useState('mover'); // 'mover' | 'copiar'
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (otrosEquiposClub.length > 0 && !equipoDestino) {
      setEquipoDestino(otrosEquiposClub[0].id_equipo);
    }
  }, [otrosEquiposClub, equipoDestino]);

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!equipoDestino) {
      setError('Debés seleccionar el equipo destino.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await api.post('/equipos/transferir-jugador', {
        id_jugador: jugador.id_jugador,
        id_equipo_origen: equipoActual.id_equipo,
        id_equipo_destino: Number(equipoDestino),
        accion,
      });
      onSuccess(accion === 'mover'
        ? `Jugador ${jugador.nombre} transferido exitosamente.`
        : `Jugador ${jugador.nombre} habilitado en ambos planteles.`
      );
      onClose();
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al transferir jugador.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300 font-bold">Transferencia Interna</span>
            <h3 className="font-headline text-lg sm:text-xl uppercase tracking-wide">Mover / Asignar Jugador</h3>
            <p className="text-xs text-slate-300 font-medium truncate max-w-[260px] sm:max-w-none">{jugador?.nombre} {jugador?.apellido}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleTransfer} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200">{error}</div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <span className="text-slate-500 block">Equipo actual de origen:</span>
            <strong className="text-slate-900 text-sm block">{equipoActual.nombre_equipo}</strong>
          </div>

          <div>
            <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Equipo Destino de Argentinos *</label>
            {otrosEquiposClub.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-xl">
                No hay otros planteles de Argentinos del Norte registrados para transferir este jugador. Podés registrar más equipos oficiales en el gestor.
              </div>
            ) : (
              <select
                value={equipoDestino}
                onChange={e => setEquipoDestino(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
              >
                {otrosEquiposClub.map(eq => (
                  <option key={eq.id_equipo} value={eq.id_equipo}>
                    {eq.nombre_equipo} ({eq.nombre_division || 'Club'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1.5">Modalidad de Pase</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setAccion('mover')}
                className={`py-2 rounded-lg text-xs font-headline uppercase tracking-wider transition-all ${
                  accion === 'mover' ? 'bg-[#991b1b] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mover de Equipo
              </button>
              <button
                type="button"
                onClick={() => setAccion('copiar')}
                className={`py-2 rounded-lg text-xs font-headline uppercase tracking-wider transition-all ${
                  accion === 'copiar' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Habilitar en Ambos
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 italic">
              {accion === 'mover'
                ? 'El jugador saldrá del equipo actual y pasará únicamente al nuevo equipo.'
                : 'El jugador jugará en ambos planteles en simultáneo sin duplicar su ficha ni cuotas.'}
            </p>
          </div>



          <div className="flex gap-2 pt-2 shrink-0 border-t border-slate-100">
            <button
              type="submit" disabled={guardando || !equipoDestino || otrosEquiposClub.length === 0}
              className="flex-1 bg-slate-900 hover:bg-black disabled:opacity-50 text-white py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider transition-colors shadow-sm"
            >
              {guardando ? 'Procesando...' : (accion === 'mover' ? 'Completar Transferencia' : 'Confirmar Doble Asignación')}
            </button>
            <button
              type="button" onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-title font-bold text-xs text-slate-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Modal para Asignar Cuerpo Técnico al Equipo ───────────────────────────── */
function ModalAsignarStaff({ idEquipo, nombreEquipo, onClose, onSuccess }) {
  const [staffPadrón, setStaffPadrón] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [idSeleccionado, setIdSeleccionado] = useState('');
  const [rolEnEquipo, setRolEnEquipo] = useState('Director Técnico');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Modo nuevo integrante si no existe en padrón
  const [modoCrear, setModoCrear] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoApellido, setNuevoApellido] = useState('');
  const [nuevoDni, setNuevoDni] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const res = await api.get('/cuerpo-tecnico');
        const list = res.data.data || [];
        setStaffPadrón(list);
        if (list.length > 0) setIdSeleccionado(list[0].id_cuerpo_tecnico);
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      if (modoCrear) {
        if (!nuevoNombre || !nuevoApellido) { setError('Nombre y apellido son obligatorios.'); setGuardando(false); return; }
        await api.post('/cuerpo-tecnico', {
          nombre: nuevoNombre.trim(),
          apellido: nuevoApellido.trim(),
          dni: nuevoDni.trim() || null,
          telefono: nuevoTelefono.trim() || null,
          rol_principal: rolEnEquipo,
          id_equipo: idEquipo,
          rol_en_equipo: rolEnEquipo,
        });
      } else {
        if (!idSeleccionado) { setError('Seleccioná un integrante.'); setGuardando(false); return; }
        await api.post(`/cuerpo-tecnico/equipo/${idEquipo}`, {
          id_cuerpo_tecnico: Number(idSeleccionado),
          rol_en_equipo: rolEnEquipo,
        });
      }
      onSuccess('Integrante de cuerpo técnico asignado correctamente.');
      onClose();
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al asignar staff.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-gradient-to-r from-slate-900 to-[#1e1b4b] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300 font-bold">Staff Oficial (Exento de Cuota)</span>
            <h3 className="font-headline text-lg sm:text-xl uppercase tracking-wide">Asignar Cuerpo Técnico</h3>
            <p className="text-xs text-slate-300 font-medium truncate max-w-[260px] sm:max-w-none">{nombreEquipo}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200">{error}</div>
          )}

          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-700 uppercase">Origen del Integrante:</span>
            <button
              type="button"
              onClick={() => setModoCrear(!modoCrear)}
              className="text-xs text-[#991b1b] font-bold hover:underline"
            >
              {modoCrear ? '← Elegir de Staff Existente' : '+ Registrar Nuevo en Padrón'}
            </button>
          </div>

          {!modoCrear ? (
            <div>
              <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Elegir Integrante</label>
              {cargando ? (
                <div className="text-xs text-slate-400 p-2">Cargando staff...</div>
              ) : staffPadrón.length === 0 ? (
                <div className="text-xs text-slate-500 p-2 bg-slate-50 rounded-xl">
                  No hay cuerpo técnico registrado. Hacé clic en '+ Registrar Nuevo en Padrón'.
                </div>
              ) : (
                <select
                  value={idSeleccionado}
                  onChange={e => setIdSeleccionado(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                >
                  {staffPadrón.map(s => (
                    <option key={s.id_cuerpo_tecnico} value={s.id_cuerpo_tecnico}>
                      {s.apellido}, {s.nombre} ({s.rol_principal || 'DT'})
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Nombre *</label>
                  <input
                    type="text" required
                    value={nuevoNombre}
                    onChange={e => setNuevoNombre(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Apellido *</label>
                  <input
                    type="text" required
                    value={nuevoApellido}
                    onChange={e => setNuevoApellido(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">DNI</label>
                  <input
                    type="text"
                    value={nuevoDni}
                    onChange={e => setNuevoDni(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Teléfono</label>
                  <input
                    type="tel"
                    value={nuevoTelefono}
                    onChange={e => setNuevoTelefono(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Rol en este Plantel *</label>
            <select
              value={rolEnEquipo}
              onChange={e => setRolEnEquipo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option>Director Técnico</option>
              <option>Ayudante de Campo</option>
              <option>Preparador Físico</option>
              <option>Entrenador de Arqueros</option>
              <option>Kinesiólogo</option>
              <option>Médico</option>
              <option>Delegado</option>
              <option>Utilero</option>
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-900 font-medium">
            ℹ️ Los integrantes de cuerpo técnico son personal operativo del club: <strong>no se les genera ni cobra cuota</strong>.
          </div>

          <div className="flex gap-2 pt-2 shrink-0 border-t border-slate-100">
            <button
              type="submit" disabled={guardando}
              className="flex-1 bg-slate-900 hover:bg-black disabled:opacity-50 text-white py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider transition-colors shadow-sm"
            >
              {guardando ? 'Guardando...' : 'Asignar al Plantel'}
            </button>
            <button
              type="button" onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-title font-bold text-xs text-slate-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL EQUIPOSMANAGER
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function EquiposManager({ divisiones = [], divisionInicialId = '' }) {
  const [divisionSel, setDivisionSel] = useState(divisionInicialId || (divisiones[0]?.id_division || ''));
  const [equipos, setEquipos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Modales de Equipo
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [equipoEditando, setEquipoEditando] = useState(null);

  // Formulario nuevo equipo
  const [nuevoEquipo, setNuevoEquipo] = useState({
    nombre_equipo: '',
    nombre_corto: '',
    logo_url: '',
    es_argentinos_del_norte: false,
  });

  // Vista activa de un Equipo de Argentinos del Norte (Plantel y Cuerpo Técnico)
  const [equipoGestionPlantel, setEquipoGestionPlantel] = useState(null);
  const [subTabPlantel, setSubTabPlantel] = useState('jugadores'); // 'jugadores' | 'staff'
  const [jugadoresPlantel, setJugadoresPlantel] = useState([]);
  const [staffPlantel, setStaffPlantel] = useState([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // Modales de Plantel
  const [mostrarModalAsignarJugador, setMostrarModalAsignarJugador] = useState(false);
  const [jugadorTransferir, setJugadorTransferir] = useState(null);
  const [mostrarModalAsignarStaff, setMostrarModalAsignarStaff] = useState(false);

  const mostrarAviso = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };

  const cargarEquipos = useCallback(async () => {
    if (!divisionSel) return;
    setCargando(true);
    try {
      const res = await api.get(`/equipos?id_division=${divisionSel}`);
      setEquipos(res.data.data || []);
    } catch (err) {
      console.error(err);
      mostrarAviso('error', 'Error al cargar equipos: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setCargando(false);
    }
  }, [divisionSel]);

  useEffect(() => {
    cargarEquipos();
  }, [cargarEquipos]);

  // Cargar detalles de plantel y staff del equipo seleccionado
  const cargarDetallesPlantel = useCallback(async (idEquipo) => {
    setCargandoDetalle(true);
    try {
      const [resJug, resStaff] = await Promise.all([
        api.get(`/equipos/${idEquipo}/plantel`),
        api.get(`/cuerpo-tecnico/equipo/${idEquipo}`),
      ]);
      setJugadoresPlantel(resJug.data.data || []);
      setStaffPlantel(resStaff.data.data || []);
    } catch (err) {
      console.error(err);
      mostrarAviso('error', 'Error al cargar plantel o staff.');
    } finally {
      setCargandoDetalle(false);
    }
  }, []);

  useEffect(() => {
    if (equipoGestionPlantel) {
      cargarDetallesPlantel(equipoGestionPlantel.id_equipo);
    }
  }, [equipoGestionPlantel, cargarDetallesPlantel]);

  // Crear Equipo
  const handleCrear = async (e) => {
    e.preventDefault();
    if (!nuevoEquipo.nombre_equipo.trim()) {
      mostrarAviso('error', 'El nombre del equipo es obligatorio.');
      return;
    }
    setCargando(true);
    try {
      await api.post('/equipos', {
        id_division: Number(divisionSel),
        nombre_equipo: nuevoEquipo.nombre_equipo.trim(),
        nombre_corto: nuevoEquipo.nombre_corto?.trim() || null,
        logo_url: nuevoEquipo.es_argentinos_del_norte
          ? '/gemini-svg.svg'
          : (nuevoEquipo.logo_url?.trim() || null),
        es_argentinos_del_norte: Boolean(nuevoEquipo.es_argentinos_del_norte),
      });

      mostrarAviso('exito', '¡Equipo creado exitosamente!');
      setMostrarCrear(false);
      setNuevoEquipo({
        nombre_equipo: '',
        nombre_corto: '',
        logo_url: '',
        es_argentinos_del_norte: false,
      });
      cargarEquipos();
    } catch (err) {
      mostrarAviso('error', 'Error al crear equipo: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setCargando(false);
    }
  };

  // Quitar jugador del plantel
  const handleQuitarJugador = async (idJugador, nombre) => {
    if (!window.confirm(`¿Quitar a ${nombre} del plantel de ${equipoGestionPlantel.nombre_equipo}? (El jugador permanecerá en el padrón central).`)) return;
    try {
      await api.delete(`/equipos/${equipoGestionPlantel.id_equipo}/plantel/${idJugador}`);
      mostrarAviso('exito', `Jugador ${nombre} quitado del plantel.`);
      cargarDetallesPlantel(equipoGestionPlantel.id_equipo);
      cargarEquipos();
    } catch (err) {
      mostrarAviso('error', 'Error al quitar jugador.');
    }
  };

  // Quitar staff del equipo
  const handleQuitarStaff = async (idCuerpoTecnico, nombre) => {
    if (!window.confirm(`¿Quitar a ${nombre} del cuerpo técnico de ${equipoGestionPlantel.nombre_equipo}?`)) return;
    try {
      await api.delete(`/cuerpo-tecnico/equipo/${equipoGestionPlantel.id_equipo}/${idCuerpoTecnico}`);
      mostrarAviso('exito', `Integrante ${nombre} removido del cuerpo técnico.`);
      cargarDetallesPlantel(equipoGestionPlantel.id_equipo);
      cargarEquipos();
    } catch (err) {
      mostrarAviso('error', 'Error al desasignar integrante.');
    }
  };

  // Equipos del club en todas las divisiones para transferencias cruzadas
  const [todosEquiposClub, setTodosEquiposClub] = useState([]);

  const cargarTodosEquiposClub = useCallback(async () => {
    try {
      const res = await api.get('/equipos?solo_argentinos=true');
      setTodosEquiposClub(res.data.data || []);
    } catch (err) {
      console.error('[EquiposManager] Error al cargar equipos del club:', err);
    }
  }, []);

  useEffect(() => {
    cargarTodosEquiposClub();
  }, [cargarTodosEquiposClub]);

  // Equipos del club en este u otros torneos para transferencias
  const otrosEquiposClub = todosEquiposClub.filter(
    eq => eq.id_equipo !== equipoGestionPlantel?.id_equipo
  );

  return (
    <div className="space-y-6">
      {/* ─── VISTA SECUNDARIA: GESTIÓN DE PLANTEL Y CUERPO TÉCNICO ─── */}
      {equipoGestionPlantel ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Barra superior con volver */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => setEquipoGestionPlantel(null)}
                className="p-2.5 sm:p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors shrink-0"
                title="Volver a lista de equipos"
              >
                <FaArrowLeft className="text-sm" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono tracking-widest text-[#991b1b] uppercase font-bold">Plantel Oficial</span>
                  <span className="bg-[#991b1b] text-white text-[10px] px-2 py-0.5 rounded-full font-headline uppercase truncate">
                    {equipoGestionPlantel.nombre_division}
                  </span>
                </div>
                <h2 className="font-headline text-xl sm:text-2xl uppercase tracking-wide text-slate-900 mt-0.5 truncate">
                  {equipoGestionPlantel.nombre_equipo}
                </h2>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setMostrarModalAsignarJugador(true)}
                className="flex items-center justify-center gap-2 bg-[#991b1b] hover:bg-[#7f1d1d] text-white px-4 py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider transition-all shadow-sm"
              >
                <FaPlus /> <span>Asignar Jugador Existente</span>
              </button>
              <button
                onClick={() => setMostrarModalAsignarStaff(true)}
                className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white px-4 py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider transition-all shadow-sm"
              >
                <FaUserTie /> <span>Asignar Cuerpo Técnico</span>
              </button>
            </div>
          </div>

          {/* Sub-tabs: Jugadores convocados vs Cuerpo Técnico */}
          <div className="flex border-b border-slate-200 gap-4 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSubTabPlantel('jugadores')}
              className={`pb-3 font-headline text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 border-b-2 shrink-0 transition-all ${
                subTabPlantel === 'jugadores' ? 'border-[#991b1b] text-[#991b1b]' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FaUsers /> Jugadores Convocados ({jugadoresPlantel.length})
            </button>
            <button
              onClick={() => setSubTabPlantel('staff')}
              className={`pb-3 font-headline text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 border-b-2 shrink-0 transition-all ${
                subTabPlantel === 'staff' ? 'border-[#991b1b] text-[#991b1b]' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FaUserTie /> Cuerpo Técnico ({staffPlantel.length})
            </button>
          </div>

          {/* Notificaciones */}
          {mensaje.texto && (
            <div className={`p-4 rounded-xl text-xs font-bold ${
              mensaje.tipo === 'exito' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {mensaje.texto}
            </div>
          )}

          {/* TAB JUGADORES */}
          {subTabPlantel === 'jugadores' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {cargandoDetalle ? (
                <div className="p-12 text-center text-slate-400 font-title text-sm">Cargando jugadores del plantel...</div>
              ) : jugadoresPlantel.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <FaTshirt className="mx-auto text-4xl text-slate-300" />
                  <p className="font-headline text-lg uppercase text-slate-600">Plantel sin jugadores convocados</p>
                  <p className="text-xs text-slate-400 font-body max-w-md mx-auto">
                    Hacé clic en "Asignar Jugador Existente" para incorporar jugadores del padrón a este equipo de Argentinos del Norte.
                  </p>
                </div>
              ) : (
                <>
                  {/* Vista Móvil: Cards */}
                  <div className="block md:hidden divide-y divide-slate-100">
                    {jugadoresPlantel.map(j => (
                      <div key={j.id_jugador} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 uppercase shrink-0">
                              {j.nombre[0]}{j.apellido[0]}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm leading-tight">
                                {j.apellido}, {j.nombre}
                              </h4>
                              <span className="text-[11px] text-slate-400 font-mono">DNI: {j.dni || '—'}</span>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                            j.estado_cuota === 'Al dia'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {j.estado_cuota === 'Al dia' ? 'Al día' : 'Pendiente'}
                          </span>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          {otrosEquiposClub.length > 0 && (
                            <button
                              onClick={() => setJugadorTransferir(j)}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                            >
                              <FaExchangeAlt className="text-xs" /> Transferir
                            </button>
                          )}
                          <button
                            onClick={() => handleQuitarJugador(j.id_jugador, `${j.nombre} ${j.apellido}`)}
                            className="px-3 py-2 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 text-xs font-bold transition-colors flex items-center gap-1"
                          >
                            <FaTrash className="text-xs" /> Quitar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Vista Desktop: Tabla */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 font-headline text-[11px] text-slate-500 uppercase tracking-wider">
                          <th className="p-3.5">Jugador</th>
                          <th className="p-3.5">DNI</th>
                          <th className="p-3.5">Cuota Club</th>
                          <th className="p-3.5 text-right">Acciones de Plantel</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-title text-xs">
                        {jugadoresPlantel.map(j => (
                          <tr key={j.id_jugador} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3.5 font-bold text-slate-900 text-sm">
                              {j.apellido}, {j.nombre}
                            </td>
                            <td className="p-3.5 font-mono text-slate-600">{j.dni || '—'}</td>
                            <td className="p-3.5">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                j.estado_cuota === 'Al dia'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {j.estado_cuota === 'Al dia' ? 'Al día' : 'Pendiente'}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {otrosEquiposClub.length > 0 && (
                                  <button
                                    onClick={() => setJugadorTransferir(j)}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-colors"
                                    title="Transferir o habilitar en otro equipo"
                                  >
                                    <FaExchangeAlt className="text-[10px]" /> Transferir
                                  </button>
                                )}
                                <button
                                  onClick={() => handleQuitarJugador(j.id_jugador, `${j.nombre} ${j.apellido}`)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                  title="Quitar de este plantel"
                                >
                                  <FaTrash className="text-xs" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB STAFF */}
          {subTabPlantel === 'staff' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900">
                <span className="flex items-center gap-2">
                  <FaUserTie className="text-[#991b1b]" />
                  Cuerpo técnico oficial asignado a este equipo. <strong>No abonan cuota de jugador</strong>.
                </span>
              </div>
              {cargandoDetalle ? (
                <div className="p-12 text-center text-slate-400 font-title text-sm">Cargando staff...</div>
              ) : staffPlantel.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <FaUserTie className="mx-auto text-4xl text-slate-300" />
                  <p className="font-headline text-lg uppercase text-slate-600">Sin cuerpo técnico asignado</p>
                  <p className="text-xs text-slate-400 font-body">Asigná el DT, ayudante o preparador físico de este plantel.</p>
                </div>
              ) : (
                <>
                  {/* Vista Móvil Staff: Cards */}
                  <div className="block md:hidden divide-y divide-slate-100">
                    {staffPlantel.map(s => (
                      <div key={s.id_cuerpo_tecnico} className="p-4 flex items-center justify-between gap-3">
                        <div>
                          <span className="bg-slate-900 text-white text-[10px] font-headline uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-1">
                            {s.rol_en_equipo || 'DT'}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm">{s.apellido}, {s.nombre}</h4>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            DNI: {s.dni || '—'} {s.telefono && ` • 📞 ${s.telefono}`}
                          </div>
                        </div>
                        <button
                          onClick={() => handleQuitarStaff(s.id_cuerpo_tecnico, `${s.nombre} ${s.apellido}`)}
                          className="p-2 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 transition-colors shrink-0"
                          title="Remover de este plantel"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Vista Desktop Staff: Tabla */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 font-headline text-[11px] text-slate-500 uppercase tracking-wider">
                          <th className="p-3.5">Rol en Equipo</th>
                          <th className="p-3.5">Nombre y Apellido</th>
                          <th className="p-3.5">DNI</th>
                          <th className="p-3.5">Teléfono</th>
                          <th className="p-3.5 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-title text-xs">
                        {staffPlantel.map(s => (
                          <tr key={s.id_cuerpo_tecnico} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3.5">
                              <span className="bg-slate-900 text-white text-[10px] font-headline uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                                {s.rol_en_equipo || 'DT'}
                              </span>
                            </td>
                            <td className="p-3.5 font-bold text-slate-900 text-sm">
                              {s.apellido}, {s.nombre}
                            </td>
                            <td className="p-3.5 font-mono text-slate-600">{s.dni || '—'}</td>
                            <td className="p-3.5 text-slate-600">{s.telefono || '—'}</td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => handleQuitarStaff(s.id_cuerpo_tecnico, `${s.nombre} ${s.apellido}`)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Remover de este plantel"
                              >
                                <FaTrash className="text-xs" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Modales de Plantel */}
          {mostrarModalAsignarJugador && (
            <ModalAsignarJugador
              idEquipo={equipoGestionPlantel.id_equipo}
              nombreEquipo={equipoGestionPlantel.nombre_equipo}
              onClose={() => setMostrarModalAsignarJugador(false)}
              onSuccess={(msg) => {
                mostrarAviso('exito', msg);
                cargarDetallesPlantel(equipoGestionPlantel.id_equipo);
                cargarEquipos();
              }}
            />
          )}

          {jugadorTransferir && (
            <ModalTransferir
              jugador={jugadorTransferir}
              equipoActual={equipoGestionPlantel}
              otrosEquiposClub={otrosEquiposClub}
              onClose={() => setJugadorTransferir(null)}
              onSuccess={(msg) => {
                mostrarAviso('exito', msg);
                cargarDetallesPlantel(equipoGestionPlantel.id_equipo);
                cargarEquipos();
              }}
            />
          )}

          {mostrarModalAsignarStaff && (
            <ModalAsignarStaff
              idEquipo={equipoGestionPlantel.id_equipo}
              nombreEquipo={equipoGestionPlantel.nombre_equipo}
              onClose={() => setMostrarModalAsignarStaff(false)}
              onSuccess={(msg) => {
                mostrarAviso('exito', msg);
                cargarDetallesPlantel(equipoGestionPlantel.id_equipo);
                cargarEquipos();
              }}
            />
          )}
        </div>
      ) : (
        /* ─── VISTA PRINCIPAL: LISTADO DE EQUIPOS ─── */
        <>
          {/* Encabezado y Filtro de Torneo */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div>
              <h2 className="font-headline text-2xl uppercase tracking-wide text-slate-900 flex items-center gap-2">
                <FaShieldAlt className="text-[#991b1b]" />
                Equipos y Planteles
              </h2>
              <p className="text-xs text-slate-500 font-body">
                Configurá planteles de Argentinos del Norte, asigná jugadores existentes del padrón y gestioná el cuerpo técnico.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <FaTrophy className="text-[#991b1b] text-sm" />
                <select
                  value={divisionSel}
                  onChange={(e) => {
                    setDivisionSel(e.target.value);
                    setEquipoEditando(null);
                    setMostrarCrear(false);
                  }}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 font-title font-bold text-xs text-slate-800 focus:outline-none"
                >
                  {divisiones.map((d) => (
                    <option key={d.id_division} value={d.id_division}>
                      {d.nombre_division} ({d.temporada})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setMostrarCrear(!mostrarCrear);
                  setEquipoEditando(null);
                }}
                className="flex items-center gap-2 bg-[#991b1b] hover:bg-[#7f1d1d] text-white px-5 py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider shadow-sm transition-all"
              >
                <FaPlus />
                <span>Nuevo Equipo</span>
              </button>
            </div>
          </div>

          {/* Avisos */}
          {mensaje.texto && (
            <div className={`p-4 rounded-xl text-xs font-bold ${
              mensaje.tipo === 'exito' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {mensaje.texto}
            </div>
          )}

          {/* Formulario Crear Equipo */}
          {mostrarCrear && (
            <div className="bg-white border-2 border-[#991b1b]/30 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-headline text-lg uppercase text-[#991b1b] flex items-center gap-2">
                <FaPlus className="text-sm" /> Registrar Nuevo Equipo
              </h3>
              <form onSubmit={handleCrear} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">Nombre del Equipo *</label>
                  <input
                    type="text" required
                    placeholder="ej. Argentinos del Norte A, San Martín, Atlético..."
                    value={nuevoEquipo.nombre_equipo}
                    onChange={(e) => setNuevoEquipo({ ...nuevoEquipo, nombre_equipo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-body"
                  />
                </div>
                <div>
                  <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">Sigla / Corto</label>
                  <input
                    type="text" maxLength={10}
                    placeholder="ARG, CAS, etc."
                    value={nuevoEquipo.nombre_corto}
                    onChange={(e) => setNuevoEquipo({ ...nuevoEquipo, nombre_corto: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-body uppercase"
                  />
                </div>
                <div className="flex items-center pt-2 sm:col-span-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none bg-red-50/50 border border-red-200 px-4 py-2.5 rounded-xl w-full">
                    <input
                      type="checkbox"
                      checked={nuevoEquipo.es_argentinos_del_norte}
                      onChange={(e) => setNuevoEquipo({ ...nuevoEquipo, es_argentinos_del_norte: e.target.checked })}
                      className="rounded text-[#991b1b] focus:ring-[#991b1b] h-4 w-4"
                    />
                    <span className="text-xs font-title font-bold text-slate-800 uppercase">
                      Es Equipo Oficial de Club Atlético Argentinos del Norte
                    </span>
                  </label>
                </div>
                <div className="sm:col-span-3 flex items-center gap-2 pt-2">
                  <button
                    type="submit" disabled={cargando}
                    className="bg-[#991b1b] hover:bg-[#7f1d1d] text-white px-6 py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider shadow-sm"
                  >
                    Crear Equipo
                  </button>
                  <button
                    type="button" onClick={() => setMostrarCrear(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-title font-bold text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Grid de Equipos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipos.map((eq) => {
              const esClub = eq.es_argentinos_del_norte;
              return (
                <div
                  key={eq.id_equipo}
                  className={`bg-white rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-md ${
                    esClub ? 'border-[#991b1b] ring-2 ring-[#991b1b]/10' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2 shrink-0">
                        {esClub ? (
                          <ClubShield className="w-8 h-9" />
                        ) : (
                          <FaFutbol className="text-slate-400 text-xl" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-headline text-lg text-slate-900 uppercase leading-tight">
                          {eq.nombre_equipo}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          {eq.nombre_corto && (
                            <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                              {eq.nombre_corto}
                            </span>
                          )}
                          {esClub ? (
                            <span className="bg-[#991b1b] text-white text-[10px] px-2 py-0.5 rounded-full font-headline uppercase tracking-wider">
                              Plantel Oficial
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">Equipo Rival</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {esClub && (
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                        <span>Plantel: <strong>{eq.cantidad_jugadores || 0}</strong> jugadores</span>
                        <span>Staff: <strong>{eq.cantidad_staff || 0}</strong> integrantes</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    {esClub ? (
                      <button
                        onClick={() => setEquipoGestionPlantel(eq)}
                        className="bg-[#991b1b] hover:bg-[#7f1d1d] text-white px-3 py-1.5 rounded-xl font-headline uppercase text-xs tracking-wider transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <FaUsers className="text-[11px]" />
                        <span>Gestionar Plantel</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-title italic">Rival (solo partidos)</span>
                    )}

                    <button
                      onClick={async () => {
                        if (window.confirm(`¿Eliminar equipo '${eq.nombre_equipo}'?`)) {
                          await api.delete(`/equipos/${eq.id_equipo}`);
                          cargarEquipos();
                        }
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Eliminar equipo"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
