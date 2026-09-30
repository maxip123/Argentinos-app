import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../api/axios';
import ClubShield from '../components/ui/ClubShield';
import TorneosManager from '../components/admin/TorneosManager';
import EquiposManager from '../components/admin/EquiposManager';
import JugadoresManager from '../components/admin/JugadoresManager';
import PlayoffsManager from '../components/admin/PlayoffsManager';
import FinanzasManager from '../components/admin/FinanzasManager';
import {
  FaTrophy,
  FaCalendarAlt,
  FaWallet,
  FaMapMarkerAlt,
  FaChartBar,
  FaSync,
  FaPlus,
  FaCheck,
  FaExclamationCircle,
  FaArrowLeft,
  FaFutbol,
  FaShieldAlt,
  FaUsers,
  FaProjectDiagram,
} from 'react-icons/fa';

export default function AdminPage() {
  const navigate = useNavigate();
  const { usuario, estaAutenticado } = useAuthStore();
  const autenticado = estaAutenticado();

  // Módulo activo: 'menu' | 'torneos' | 'equipos' | 'jugadores' | 'partidos' | 'clasificacion' | 'cuotas' | 'sedes'
  const [moduloActivo, setModuloActivo] = useState('menu');

  // Estados comunes
  const [divisiones, setDivisiones] = useState([]);
  const [divisionSel, setDivisionSel] = useState('');
  const [equipoSelParaJugadores, setEquipoSelParaJugadores] = useState('');
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [cargandoAccion, setCargandoAccion] = useState(false);

  // Estados específicos de módulos
  const [partidos, setPartidos] = useState([]);
  const [cuotas, setCuotas] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [sedes, setSedes] = useState([]);

  // Formulario nuevo partido modal
  const [mostrarCrearPartido, setMostrarCrearPartido] = useState(false);
  const [nuevoPartido, setNuevoPartido] = useState({
    id_sede: '',
    id_equipo_local: '',
    id_equipo_visitante: '',
    fecha_partido: '',
    jornada_numero: 1,
    nombre_partido: '',
  });

  // Formulario de resultado de partido
  const [partidoEditando, setPartidoEditando] = useState(null);
  const [formResultado, setFormResultado] = useState({
    goles_local: 0,
    goles_visitante: 0,
    estado_partido: 2, // Finalizado por defecto al cargar resultado
  });

  // Formulario de pago de cuota
  const [cuotaEditando, setCuotaEditando] = useState(null);
  const [formCuota, setFormCuota] = useState({
    monto_abonado: '',
    estado_pago: 'Pagado',
    metodo_pago: 'Transferencia',
  });

  // Redirigir si no está autenticado
  useEffect(() => {
    if (!autenticado) {
      navigate('/login');
    }
  }, [autenticado, navigate]);

  // Cargar divisiones iniciales
  const cargarDivisiones = useCallback(async () => {
    try {
      const res = await api.get('/divisiones');
      const list = res.data.data || [];
      setDivisiones(list);
      if (list.length > 0 && !divisionSel) setDivisionSel(list[0].id_division);
      return list;
    } catch (err) {
      console.error(err);
      return [];
    }
  }, [divisionSel]);

  useEffect(() => {
    cargarDivisiones();
  }, [cargarDivisiones]);

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };

  const cargarPartidos = useCallback(async () => {
    if (!divisionSel) return;
    try {
      const res = await api.get(`/partidos?id_division=${divisionSel}`);
      setPartidos(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [divisionSel]);

  const cargarCuotas = useCallback(async () => {
    try {
      const res = await api.get('/cuotas');
      setCuotas(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const cargarEquipos = useCallback(async () => {
    if (!divisionSel) return;
    try {
      const res = await api.get(`/equipos?id_division=${divisionSel}`);
      setEquipos(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [divisionSel]);

  const cargarSedes = useCallback(async () => {
    try {
      const res = await api.get('/sedes');
      setSedes(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Cargar datos según módulo
  useEffect(() => {
    if (moduloActivo === 'partidos') {
      cargarPartidos();
      cargarEquipos();
      cargarSedes();
    } else if (moduloActivo === 'cuotas') {
      cargarCuotas();
    } else if (moduloActivo === 'equipos') {
      cargarEquipos();
    } else if (moduloActivo === 'sedes') {
      cargarSedes();
    }
  }, [moduloActivo, cargarPartidos, cargarCuotas, cargarEquipos, cargarSedes]);

  // Recalcular posiciones manualmente
  const handleRecalcularPosiciones = async () => {
    if (!divisionSel) return;
    setCargandoAccion(true);
    try {
      await api.post(`/clasificacion/recalcular/${divisionSel}`);
      mostrarMensaje('exito', '¡Tabla de posiciones recalculada con éxito mediante Stored Procedure!');
    } catch (err) {
      mostrarMensaje('error', 'Error al recalcular: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setCargandoAccion(false);
    }
  };

  // Guardar resultado de partido
  const handleGuardarResultado = async (e) => {
    e.preventDefault();
    if (!partidoEditando) return;
    setCargandoAccion(true);
    try {
      await api.put(`/partidos/${partidoEditando.id_partido}`, {
        goles_local: Number(formResultado.goles_local),
        goles_visitante: Number(formResultado.goles_visitante),
        estado_partido: Number(formResultado.estado_partido),
      });
      mostrarMensaje('exito', 'Resultado guardado. La tabla de posiciones se recalculó automáticamente.');
      setPartidoEditando(null);
      cargarPartidos();
    } catch (err) {
      mostrarMensaje('error', 'Error al actualizar resultado: ' + err.message);
    } finally {
      setCargandoAccion(false);
    }
  };

  // Crear nuevo partido
  const handleCrearPartido = async (e) => {
    e.preventDefault();
    if (!nuevoPartido.id_equipo_local || !nuevoPartido.id_equipo_visitante || !nuevoPartido.id_sede) {
      mostrarMensaje('error', 'Complete los equipos y la sede.');
      return;
    }
    setCargandoAccion(true);
    try {
      await api.post('/partidos', {
        ...nuevoPartido,
        id_division: Number(divisionSel),
        id_sede: Number(nuevoPartido.id_sede),
        id_equipo_local: Number(nuevoPartido.id_equipo_local),
        id_equipo_visitante: Number(nuevoPartido.id_equipo_visitante),
        fecha_partido: nuevoPartido.fecha_partido || new Date().toISOString(),
      });
      mostrarMensaje('exito', 'Partido programado exitosamente.');
      setMostrarCrearPartido(false);
      cargarPartidos();
      setNuevoPartido({
        id_sede: '',
        id_equipo_local: '',
        id_equipo_visitante: '',
        fecha_partido: '',
        jornada_numero: 1,
        nombre_partido: '',
      });
    } catch (err) {
      mostrarMensaje('error', 'Error al crear partido: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setCargandoAccion(false);
    }
  };

  // Actualizar estado de cuota
  const handleActualizarCuota = async (e) => {
    e.preventDefault();
    if (!cuotaEditando) return;
    setCargandoAccion(true);
    try {
      await api.put(`/cuotas/${cuotaEditando.id_cuota}`, {
        monto_abonado: Number(formCuota.monto_abonado),
        estado_pago: formCuota.estado_pago,
        metodo_pago: formCuota.metodo_pago,
        fecha_pago: new Date().toISOString(),
      });
      mostrarMensaje('exito', 'Pago registrado exitosamente.');
      setCuotaEditando(null);
      cargarCuotas();
    } catch (err) {
      mostrarMensaje('error', 'Error al registrar cuota: ' + err.message);
    } finally {
      setCargandoAccion(false);
    }
  };

  if (!autenticado) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f2fc] pb-16">
      {/* ─── Encabezado del Panel de Administración ────────────────────────── */}
      <header className="bg-white border-b border-slate-200 py-8 px-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#151f89] font-headline text-xs tracking-widest uppercase">
              <ClubShield className="w-6 h-7" />
              <span>Sistema Oficial de Gestión</span>
            </div>
            <h1 className="font-headline text-3xl sm:text-4xl uppercase tracking-wider text-slate-900 mt-1">
              Panel de Administración
            </h1>
            <p className="font-title text-slate-500 text-sm font-semibold mt-0.5">
              Bienvenido, {usuario?.nombre || usuario?.email} • Rol: <span className="text-[#151f89]">{usuario?.rol}</span>
            </p>
          </div>

          {moduloActivo !== 'menu' && (
            <button
              onClick={() => setModuloActivo('menu')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-title font-bold text-sm uppercase transition-colors"
            >
              <FaArrowLeft />
              <span>Volver a Módulos</span>
            </button>
          )}
        </div>
      </header>

      {/* ─── Mensajes de Feedback ─────────────────────────────────────────── */}
      {mensaje.texto && (
        <div className="max-w-6xl mx-auto px-4 mt-6 w-full">
          <div
            className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 shadow-xs ${
              mensaje.tipo === 'exito'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {mensaje.tipo === 'exito' ? <FaCheck className="text-emerald-600" /> : <FaExclamationCircle className="text-red-600" />}
            <span>{mensaje.texto}</span>
          </div>
        </div>
      )}

      {/* ─── Contenedor de Vistas ─────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* VISTA 1: GRID DE MÓDULOS (MENU PRINCIPAL) */}
        {moduloActivo === 'menu' && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Tarjeta 1: Torneos y Ediciones */}
            <article
              onClick={() => setModuloActivo('torneos')}
              className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md hover:border-[#151f89] transition-all duration-200 cursor-pointer group flex flex-col items-center text-center gap-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#151f89] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#151f89] group-hover:text-white transition-all shadow-sm">
                <FaTrophy className="text-2xl" />
              </div>
              <h2 className="font-headline text-xl text-slate-900 group-hover:text-[#151f89] transition-colors uppercase">
                Torneos y Ediciones
              </h2>
              <p className="text-xs text-slate-500 font-body">
                Crear torneos, clonar planteles para Apertura/Clausura y consultar historial
              </p>
            </article>

            {/* Tarjeta 2: Equipos */}
            <article
              onClick={() => setModuloActivo('equipos')}
              className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md hover:border-[#151f89] transition-all duration-200 cursor-pointer group flex flex-col items-center text-center gap-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#151f89] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#151f89] group-hover:text-white transition-all shadow-sm">
                <FaShieldAlt className="text-2xl" />
              </div>
              <h2 className="font-headline text-xl text-slate-900 group-hover:text-[#151f89] transition-colors uppercase">
                Equipos y Club
              </h2>
              <p className="text-xs text-slate-500 font-body">
                Registrar clubes, configurar equipos de Argentinos del Norte y rivales
              </p>
            </article>

            {/* Tarjeta 3: Jugadores y Planteles */}
            <article
              onClick={() => setModuloActivo('jugadores')}
              className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md hover:border-[#151f89] transition-all duration-200 cursor-pointer group flex flex-col items-center text-center gap-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#151f89] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#151f89] group-hover:text-white transition-all shadow-sm">
                <FaUsers className="text-2xl" />
              </div>
              <h2 className="font-headline text-xl text-slate-900 group-hover:text-[#151f89] transition-colors uppercase">
                Jugadores y Planteles
              </h2>
              <p className="text-xs text-slate-500 font-body">
                Ingresar jugadores con DNI, planteles y cuotas
              </p>
            </article>

            {/* Tarjeta 4: Partidos */}
            <article
              onClick={() => setModuloActivo('partidos')}
              className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md hover:border-[#151f89] transition-all duration-200 cursor-pointer group flex flex-col items-center text-center gap-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#151f89] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#151f89] group-hover:text-white transition-all shadow-sm">
                <FaCalendarAlt className="text-2xl" />
              </div>
              <h2 className="font-headline text-xl text-slate-900 group-hover:text-[#151f89] transition-colors uppercase">
                Partidos y Resultados
              </h2>
              <p className="text-xs text-slate-500 font-body">
                Cargar marcadores, fixture y actualizar partidos en vivo o finalizados
              </p>
            </article>

            {/* Tarjeta 5: Clasificaciones */}
            <article
              onClick={() => setModuloActivo('clasificacion')}
              className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md hover:border-[#151f89] transition-all duration-200 cursor-pointer group flex flex-col items-center text-center gap-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#151f89] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#151f89] group-hover:text-white transition-all shadow-sm">
                <FaChartBar className="text-2xl" />
              </div>
              <h2 className="font-headline text-xl text-slate-900 group-hover:text-[#151f89] transition-colors uppercase">
                Posiciones y Tabla
              </h2>
              <p className="text-xs text-slate-500 font-body">
                Revisar posiciones y disparar recálculo automático de la DB
              </p>
            </article>

            {/* Tarjeta 6: Finanzas y Cuotas */}
            <article
              onClick={() => setModuloActivo('cuotas')}
              className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md hover:border-[#151f89] transition-all duration-200 cursor-pointer group flex flex-col items-center text-center gap-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#151f89] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#151f89] group-hover:text-white transition-all shadow-sm">
                <FaWallet className="text-2xl" />
              </div>
              <h2 className="font-headline text-xl text-slate-900 group-hover:text-[#151f89] transition-colors uppercase">
                Finanzas y Cuotas
              </h2>
              <p className="text-xs text-slate-500 font-body">
                Estado de cuotas por jugador, gastos del club y balance mensual
              </p>
            </article>

            {/* Tarjeta 7: Sedes */}
            <article
              onClick={() => setModuloActivo('sedes')}
              className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md hover:border-[#151f89] transition-all duration-200 cursor-pointer group flex flex-col items-center text-center gap-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#151f89] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#151f89] group-hover:text-white transition-all shadow-sm">
                <FaMapMarkerAlt className="text-2xl" />
              </div>
              <h2 className="font-headline text-xl text-slate-900 group-hover:text-[#151f89] transition-colors uppercase">
                Sedes y Canchas
              </h2>
              <p className="text-xs text-slate-500 font-body">
                Predio central de Argentinos del Norte y estadios habilitados
              </p>
            </article>

            {/* Tarjeta 8: Playoffs y Brackets */}
            <article
              onClick={() => setModuloActivo('playoffs')}
              className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md hover:border-[#151f89] transition-all duration-200 cursor-pointer group flex flex-col items-center text-center gap-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#151f89] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#151f89] group-hover:text-white transition-all shadow-sm">
                <FaProjectDiagram className="text-2xl" />
              </div>
              <h2 className="font-headline text-xl text-slate-900 group-hover:text-[#151f89] transition-colors uppercase">
                Playoffs y Brackets
              </h2>
              <p className="text-xs text-slate-500 font-body">
                Armar llaves eliminatorias por torneo, cargar resultados y visualizar el cuadro
              </p>
            </article>
          </section>
        )}

        {/* Barra rápida de navegación entre módulos */}
        {moduloActivo !== 'menu' && (
          <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-6 border-b border-slate-200">
            <button
              onClick={() => setModuloActivo('menu')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-title font-bold text-xs uppercase flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <FaArrowLeft className="text-[10px]" />
              <span>Menú</span>
            </button>
            <button
              onClick={() => setModuloActivo('torneos')}
              className={`px-3.5 py-1.5 rounded-xl font-title font-bold text-xs uppercase shrink-0 transition-colors ${
                moduloActivo === 'torneos'
                  ? 'bg-[#151f89] text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              Torneos
            </button>
            <button
              onClick={() => setModuloActivo('equipos')}
              className={`px-3.5 py-1.5 rounded-xl font-title font-bold text-xs uppercase shrink-0 transition-colors ${
                moduloActivo === 'equipos'
                  ? 'bg-[#151f89] text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              Equipos
            </button>
            <button
              onClick={() => setModuloActivo('jugadores')}
              className={`px-3.5 py-1.5 rounded-xl font-title font-bold text-xs uppercase shrink-0 transition-colors ${
                moduloActivo === 'jugadores'
                  ? 'bg-[#151f89] text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              Jugadores
            </button>
            <button
              onClick={() => setModuloActivo('partidos')}
              className={`px-3.5 py-1.5 rounded-xl font-title font-bold text-xs uppercase shrink-0 transition-colors ${
                moduloActivo === 'partidos'
                  ? 'bg-[#151f89] text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              Partidos
            </button>
            <button
              onClick={() => setModuloActivo('playoffs')}
              className={`px-3.5 py-1.5 rounded-xl font-title font-bold text-xs uppercase shrink-0 transition-colors ${
                moduloActivo === 'playoffs'
                  ? 'bg-[#151f89] text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              Playoffs
            </button>
            <button
              onClick={() => setModuloActivo('clasificacion')}
              className={`px-3.5 py-1.5 rounded-xl font-title font-bold text-xs uppercase shrink-0 transition-colors ${
                moduloActivo === 'clasificacion'
                  ? 'bg-[#151f89] text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              Posiciones
            </button>
            <button
              onClick={() => setModuloActivo('cuotas')}
              className={`px-3.5 py-1.5 rounded-xl font-title font-bold text-xs uppercase shrink-0 transition-colors ${
                moduloActivo === 'cuotas'
                  ? 'bg-[#151f89] text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              Cuotas
            </button>
            <button
              onClick={() => setModuloActivo('sedes')}
              className={`px-3.5 py-1.5 rounded-xl font-title font-bold text-xs uppercase shrink-0 transition-colors ${
                moduloActivo === 'sedes'
                  ? 'bg-[#151f89] text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              Sedes
            </button>
          </nav>
        )}

        {/* VISTA: TORNEOS Y EDICIONES */}
        {moduloActivo === 'torneos' && (
          <TorneosManager
            divisiones={divisiones}
            onActualizar={cargarDivisiones}
            onSeleccionarTorneo={(id) => {
              setDivisionSel(id);
              setModuloActivo('equipos');
            }}
          />
        )}

        {/* VISTA: EQUIPOS */}
        {moduloActivo === 'equipos' && (
          <EquiposManager
            divisiones={divisiones}
            divisionInicialId={divisionSel}
            onVerJugadoresEquipo={(eqId, divId) => {
              setDivisionSel(divId);
              setEquipoSelParaJugadores(eqId);
              setModuloActivo('jugadores');
            }}
          />
        )}

        {/* VISTA: JUGADORES */}
        {moduloActivo === 'jugadores' && (
          <JugadoresManager
            divisiones={divisiones}
            divisionInicialId={divisionSel}
            equipoInicialId={equipoSelParaJugadores}
          />
        )}

        {/* VISTA: PLAYOFFS Y BRACKETS */}
        {moduloActivo === 'playoffs' && (
          <PlayoffsManager
            divisiones={divisiones}
            divisionInicialId={divisionSel}
          />
        )}

        {/* VISTA 2: GESTIÓN DE PARTIDOS Y RESULTADOS */}
        {moduloActivo === 'partidos' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
              <div>
                <h2 className="font-headline text-2xl uppercase tracking-wide text-slate-900">
                  Carga de Partidos y Resultados
                </h2>
                <p className="text-xs text-slate-500 font-body">
                  Modificá los goles para que se recalculen automáticamente las posiciones.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Selector de División */}
                <select
                  value={divisionSel}
                  onChange={(e) => setDivisionSel(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 font-title font-bold text-sm text-slate-800"
                >
                  {divisiones.map((d) => (
                    <option key={d.id_division} value={d.id_division}>
                      {d.nombre_division}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setMostrarCrearPartido(!mostrarCrearPartido)}
                  className="flex items-center gap-2 bg-[#151f89] hover:bg-[#303a9f] text-white px-4 py-2 rounded-xl text-sm font-headline uppercase tracking-wider"
                >
                  <FaPlus className="text-xs" />
                  <span>Programar</span>
                </button>
              </div>
            </div>

            {/* Formulario Crear Partido */}
            {mostrarCrearPartido && (
              <div className="bg-white border-2 border-[#151f89]/30 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="font-headline text-lg uppercase text-[#151f89]">Programar Nuevo Partido</h3>
                <form onSubmit={handleCrearPartido} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                      Equipo Local
                    </label>
                    <select
                      value={nuevoPartido.id_equipo_local}
                      onChange={(e) => setNuevoPartido({ ...nuevoPartido, id_equipo_local: e.target.value })}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body"
                    >
                      <option value="">Seleccione Equipo Local</option>
                      {equipos.map((eq) => (
                        <option key={eq.id_equipo} value={eq.id_equipo}>
                          {eq.nombre_equipo}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                      Equipo Visitante
                    </label>
                    <select
                      value={nuevoPartido.id_equipo_visitante}
                      onChange={(e) => setNuevoPartido({ ...nuevoPartido, id_equipo_visitante: e.target.value })}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body"
                    >
                      <option value="">Seleccione Equipo Visitante</option>
                      {equipos.map((eq) => (
                        <option key={eq.id_equipo} value={eq.id_equipo}>
                          {eq.nombre_equipo}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">Sede</label>
                    <select
                      value={nuevoPartido.id_sede}
                      onChange={(e) => setNuevoPartido({ ...nuevoPartido, id_sede: e.target.value })}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body"
                    >
                      <option value="">Seleccione Sede</option>
                      {sedes.map((s) => (
                        <option key={s.id_sede} value={s.id_sede}>
                          {s.nombre_sede}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">Fecha y Hora</label>
                    <input
                      type="datetime-local"
                      value={nuevoPartido.fecha_partido}
                      onChange={(e) => setNuevoPartido({ ...nuevoPartido, fecha_partido: e.target.value })}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">Jornada / Fecha Nº</label>
                    <input
                      type="number"
                      min="1"
                      value={nuevoPartido.jornada_numero}
                      onChange={(e) => setNuevoPartido({ ...nuevoPartido, jornada_numero: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      type="submit"
                      disabled={cargandoAccion}
                      className="flex-1 bg-[#151f89] hover:bg-[#303a9f] text-white py-2.5 rounded-lg font-headline uppercase text-sm"
                    >
                      {cargandoAccion ? 'Guardando...' : 'Guardar Partido'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMostrarCrearPartido(false)}
                      className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-600 font-bold"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Modal / Formulario de Edición de Resultado */}
            {partidoEditando && (
              <div className="bg-blue-50 border-2 border-[#151f89] p-6 rounded-2xl shadow-md space-y-4">
                <h3 className="font-headline text-xl uppercase text-[#151f89]">
                  Cargar Resultado: {partidoEditando.equipo_local} vs {partidoEditando.equipo_visitante}
                </h3>
                <form onSubmit={handleGuardarResultado} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                      Goles {partidoEditando.equipo_local}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formResultado.goles_local}
                      onChange={(e) => setFormResultado({ ...formResultado, goles_local: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 font-headline text-xl text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                      Goles {partidoEditando.equipo_visitante}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formResultado.goles_visitante}
                      onChange={(e) => setFormResultado({ ...formResultado, goles_visitante: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 font-headline text-xl text-center"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={cargandoAccion}
                      className="flex-1 bg-[#151f89] hover:bg-[#303a9f] text-white py-3 rounded-lg font-headline uppercase text-sm shadow-sm transition-colors"
                    >
                      {cargandoAccion ? 'Guardando...' : 'Confirmar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPartidoEditando(null)}
                      className="px-4 py-3 bg-slate-200 hover:bg-slate-300 rounded-lg font-title font-bold text-sm text-slate-700"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tabla de partidos */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-headline text-xs text-slate-600 uppercase">
                    <th className="p-3.5">Jornada</th>
                    <th className="p-3.5">Local</th>
                    <th className="p-3.5 text-center">Goles</th>
                    <th className="p-3.5">Visitante</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-title">
                  {partidos.map((p) => (
                    <tr key={p.id_partido} className="hover:bg-slate-50/80">
                      <td className="p-3.5 font-bold text-slate-500">
                        {p.nombre_partido || `Fecha ${p.jornada_numero}`}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">{p.equipo_local}</td>
                      <td className="p-3.5 text-center font-headline text-base text-slate-900">
                        {p.estado_partido === 2 ? `${p.goles_local} - ${p.goles_visitante}` : 'vs'}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">{p.equipo_visitante}</td>
                      <td className="p-3.5">
                        {p.estado_partido === 2 ? (
                          <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded font-bold">
                            Finalizado
                          </span>
                        ) : p.estado_partido === 1 ? (
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded font-bold animate-pulse">
                            En Vivo
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-bold">
                            Programado
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            setPartidoEditando(p);
                            setFormResultado({
                              goles_local: p.goles_local || 0,
                              goles_visitante: p.goles_visitante || 0,
                              estado_partido: 2,
                            });
                          }}
                          className="bg-[#151f89] hover:bg-[#303a9f] text-white px-3 py-1.5 rounded-lg text-xs font-headline uppercase tracking-wider"
                        >
                          Cargar Resultado
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VISTA 3: CLASIFICACIONES Y RECALCULO */}
        {moduloActivo === 'clasificacion' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="font-headline text-2xl uppercase tracking-wide text-slate-900">
                  Gestión de Tabla de Posiciones
                </h2>
                <p className="text-xs text-slate-500 font-body">
                  Podés forzar una sincronización total ejecutando el Stored Procedure de la base de datos.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={divisionSel}
                  onChange={(e) => setDivisionSel(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 font-title font-bold text-sm text-slate-800"
                >
                  {divisiones.map((d) => (
                    <option key={d.id_division} value={d.id_division}>
                      {d.nombre_division}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleRecalcularPosiciones}
                  disabled={cargandoAccion}
                  className="flex items-center gap-2 bg-[#151f89] hover:bg-[#303a9f] text-white px-5 py-2.5 rounded-xl font-headline uppercase text-sm tracking-wider shadow-sm transition-all"
                >
                  <FaSync className={cargandoAccion ? 'animate-spin' : ''} />
                  <span>{cargandoAccion ? 'Calculando...' : 'Recalcular Ahora'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VISTA 4: FINANZAS Y CUOTAS — nuevo módulo */}
        {moduloActivo === 'cuotas' && (
          <FinanzasManager
            divisiones={divisiones}
            mostrarMensaje={mostrarMensaje}
          />
        )}


        {/* VISTA 6: SEDES */}
        {moduloActivo === 'sedes' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <h2 className="font-headline text-2xl uppercase tracking-wide text-slate-900">
                Sedes y Complejos Habilitados
              </h2>
              <p className="text-xs text-slate-500 font-body">
                Canchas reglamentarias donde se juegan los partidos de Futsal AFA.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sedes.map((s) => (
                <div key={s.id_sede} className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-headline text-lg text-slate-900 uppercase">{s.nombre_sede}</h4>
                    {s.es_sede_propia && (
                      <span className="bg-[#151f89] text-white text-xs px-2.5 py-0.5 rounded-full font-headline uppercase">
                        Sede Propia
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-title text-slate-600 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-[#151f89]" />
                    <span>{s.direccion}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
