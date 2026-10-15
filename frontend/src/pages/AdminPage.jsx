import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../api/axios';
import ClubShield from '../components/ui/ClubShield';
import TorneosManager from '../components/admin/TorneosManager';
import EquiposManager from '../components/admin/EquiposManager';
import JugadoresManager from '../components/admin/JugadoresManager';
import FinanzasManager from '../components/admin/FinanzasManager';
import HistorialManager from '../components/admin/HistorialManager';
import UsuariosManager from '../components/admin/UsuariosManager';
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
  FaHistory,
  FaUserShield,
  FaEdit,
  FaTrash,
  FaTimes,
} from 'react-icons/fa';

export default function AdminPage() {
  const navigate = useNavigate();
  const { usuario, estaAutenticado } = useAuthStore();
  const autenticado = estaAutenticado();

  // Módulo activo: 'menu' | 'torneos' | 'equipos' | 'jugadores' | 'partidos' | 'clasificacion' | 'cuotas' | 'sedes' | 'historial' | 'usuarios'
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

  // Edición de datos y programación de partido
  const [partidoEditandoDatos, setPartidoEditandoDatos] = useState(null);
  const [formEditarPartido, setFormEditarPartido] = useState({
    id_equipo_local: '',
    id_equipo_visitante: '',
    id_sede: '',
    fecha_partido: '',
    jornada_numero: 1,
    nombre_partido: '',
    estado_partido: 0,
    afecta_clasificacion: true,
    observaciones: '',
  });

  // Gestión y edición de sedes
  const [mostrarCrearSede, setMostrarCrearSede] = useState(false);
  const [sedeEditando, setSedeEditando] = useState(null);
  const [formSede, setFormSede] = useState({
    nombre_sede: '',
    direccion: '',
    google_maps_url: '',
    es_sede_propia: false,
  });

  // Formulario de resultado de partido
  const [partidoEditando, setPartidoEditando] = useState(null);
  const [formResultado, setFormResultado] = useState({
    goles_local: 0,
    goles_visitante: 0,
    estado_partido: 2, // Finalizado por defecto al cargar resultado
  });
  const [plantelPartido, setPlantelPartido] = useState([]);
  const [statsPartido, setStatsPartido] = useState({});
  const [cargandoStatsPartido, setCargandoStatsPartido] = useState(false);

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

  // Iniciar edición de resultado y cargar estadísticas si juega Argentinos del Norte
  const iniciarEdicionPartido = async (p) => {
    setPartidoEditando(p);
    setFormResultado({
      goles_local: p.goles_local || 0,
      goles_visitante: p.goles_visitante || 0,
      estado_partido: 2,
    });

    const idEquipoClub = p.local_es_argentinos
      ? p.id_equipo_local
      : (p.visitante_es_argentinos ? p.id_equipo_visitante : null);

    if (idEquipoClub) {
      setCargandoStatsPartido(true);
      try {
        const [resPlantel, resStats] = await Promise.all([
          api.get(`/equipos/${idEquipoClub}/plantel`),
          api.get(`/partidos/${p.id_partido}/estadisticas`),
        ]);

        const jugadores = resPlantel.data.data || [];
        const statsExistentes = resStats.data.data || [];

        setPlantelPartido(jugadores);

        const mapStats = {};
        jugadores.forEach((jug) => {
          const found = statsExistentes.find((s) => Number(s.id_jugador) === Number(jug.id_jugador));
          mapStats[jug.id_jugador] = {
            id_jugador: jug.id_jugador,
            id_equipo: idEquipoClub,
            goles: found ? found.goles : 0,
            tarjetas_amarillas: found ? found.tarjetas_amarillas : 0,
            tarjetas_rojas: found ? found.tarjetas_rojas : 0,
          };
        });
        setStatsPartido(mapStats);
      } catch (err) {
        console.error('Error cargando estadísticas del partido:', err);
      } finally {
        setCargandoStatsPartido(false);
      }
    } else {
      setPlantelPartido([]);
      setStatsPartido({});
    }
  };

  // Guardar resultado de partido y estadísticas individuales
  const handleGuardarResultado = async (e) => {
    e.preventDefault();
    if (!partidoEditando) return;
    setCargandoAccion(true);
    try {
      // 1. Guardar resultado global
      await api.put(`/partidos/${partidoEditando.id_partido}`, {
        goles_local: Number(formResultado.goles_local),
        goles_visitante: Number(formResultado.goles_visitante),
        estado_partido: Number(formResultado.estado_partido),
      });

      // 2. Si juega Argentinos del Norte, guardar estadísticas individuales
      const idEquipoClub = partidoEditando.local_es_argentinos
        ? partidoEditando.id_equipo_local
        : (partidoEditando.visitante_es_argentinos ? partidoEditando.id_equipo_visitante : null);

      if (idEquipoClub && Object.keys(statsPartido).length > 0) {
        const statsPayload = Object.values(statsPartido).map((s) => ({
          id_jugador: s.id_jugador,
          id_equipo: idEquipoClub,
          goles: Number(s.goles || 0),
          tarjetas_amarillas: Number(s.tarjetas_amarillas || 0),
          tarjetas_rojas: Number(s.tarjetas_rojas || 0),
        }));

        await api.post(`/partidos/${partidoEditando.id_partido}/estadisticas`, {
          estadisticas: statsPayload,
        });
      }

      mostrarMensaje('exito', 'Resultado y estadísticas guardadas. La tabla de posiciones se recalculó automáticamente.');
      setPartidoEditando(null);
      setPlantelPartido([]);
      setStatsPartido({});
      cargarPartidos();
    } catch (err) {
      mostrarMensaje('error', 'Error al actualizar resultado: ' + (err.response?.data?.mensaje || err.message));
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
    if (nuevoPartido.id_equipo_local === nuevoPartido.id_equipo_visitante) {
      mostrarMensaje('error', 'El equipo local y el visitante no pueden ser el mismo.');
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

  // Iniciar edición de datos y programación de un partido
  const iniciarEdicionDatosPartido = (p) => {
    setPartidoEditandoDatos(p);
    let fechaVal = '';
    if (p.fecha_partido) {
      const d = new Date(p.fecha_partido);
      if (!isNaN(d.getTime())) {
        const pad = (n) => String(n).padStart(2, '0');
        fechaVal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    }
    setFormEditarPartido({
      id_equipo_local: p.id_equipo_local || '',
      id_equipo_visitante: p.id_equipo_visitante || '',
      id_sede: p.id_sede || '',
      fecha_partido: fechaVal,
      jornada_numero: p.jornada_numero || 1,
      nombre_partido: p.nombre_partido || '',
      estado_partido: p.estado_partido !== undefined ? p.estado_partido : 0,
      afecta_clasificacion: p.afecta_clasificacion !== undefined ? p.afecta_clasificacion : true,
      observaciones: p.observaciones || '',
    });
  };

  // Guardar edición de datos de partido
  const handleGuardarEdicionPartido = async (e) => {
    e.preventDefault();
    if (!partidoEditandoDatos) return;
    if (Number(formEditarPartido.id_equipo_local) === Number(formEditarPartido.id_equipo_visitante)) {
      mostrarMensaje('error', 'El equipo local y el visitante no pueden ser el mismo.');
      return;
    }
    setCargandoAccion(true);
    try {
      await api.put(`/partidos/${partidoEditandoDatos.id_partido}`, {
        ...formEditarPartido,
        id_equipo_local: Number(formEditarPartido.id_equipo_local),
        id_equipo_visitante: Number(formEditarPartido.id_equipo_visitante),
        id_sede: Number(formEditarPartido.id_sede),
        jornada_numero: Number(formEditarPartido.jornada_numero),
        estado_partido: Number(formEditarPartido.estado_partido),
        afecta_clasificacion: Boolean(formEditarPartido.afecta_clasificacion),
      });
      mostrarMensaje('exito', 'Partido actualizado correctamente.');
      setPartidoEditandoDatos(null);
      cargarPartidos();
    } catch (err) {
      mostrarMensaje('error', 'Error al actualizar partido: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setCargandoAccion(false);
    }
  };

  // Eliminar partido (borrado lógico)
  const handleEliminarPartido = async (p) => {
    if (!window.confirm(`¿Estás seguro de que deseás eliminar el partido '${p.equipo_local} vs ${p.equipo_visitante}'? (Se realizará una baja lógica y se recalcularán automáticamente las posiciones y estadísticas).`)) return;
    setCargandoAccion(true);
    try {
      await api.delete(`/partidos/${p.id_partido}`);
      mostrarMensaje('exito', 'Partido eliminado correctamente. Tabla de posiciones recalculada.');
      cargarPartidos();
    } catch (err) {
      mostrarMensaje('error', 'Error al eliminar partido: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setCargandoAccion(false);
    }
  };

  // Handlers para Sedes (Crear, Editar, Borrado Lógico)
  const iniciarCrearSede = () => {
    setSedeEditando(null);
    setFormSede({
      nombre_sede: '',
      direccion: '',
      google_maps_url: '',
      es_sede_propia: false,
    });
    setMostrarCrearSede(true);
  };

  const iniciarEditarSede = (s) => {
    setSedeEditando(s);
    setFormSede({
      nombre_sede: s.nombre_sede || '',
      direccion: s.direccion || '',
      google_maps_url: s.google_maps_url || '',
      es_sede_propia: Boolean(s.es_sede_propia),
    });
    setMostrarCrearSede(true);
  };

  const handleGuardarSede = async (e) => {
    e.preventDefault();
    if (!formSede.nombre_sede.trim()) {
      mostrarMensaje('error', 'El nombre de la sede es obligatorio.');
      return;
    }
    setCargandoAccion(true);
    try {
      if (sedeEditando) {
        await api.put(`/sedes/${sedeEditando.id_sede}`, formSede);
        mostrarMensaje('exito', 'Sede actualizada correctamente.');
      } else {
        await api.post('/sedes', formSede);
        mostrarMensaje('exito', 'Sede creada exitosamente.');
      }
      setMostrarCrearSede(false);
      setSedeEditando(null);
      setFormSede({ nombre_sede: '', direccion: '', google_maps_url: '', es_sede_propia: false });
      cargarSedes();
    } catch (err) {
      mostrarMensaje('error', 'Error al guardar sede: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setCargandoAccion(false);
    }
  };

  const handleEliminarSede = async (s) => {
    if (!window.confirm(`¿Estás seguro de eliminar la sede '${s.nombre_sede}'? (Se realizará una baja lógica).`)) return;
    setCargandoAccion(true);
    try {
      await api.delete(`/sedes/${s.id_sede}`);
      mostrarMensaje('exito', 'Sede dada de baja correctamente.');
      cargarSedes();
    } catch (err) {
      mostrarMensaje('error', 'Error al eliminar sede: ' + (err.response?.data?.mensaje || err.message));
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
                Crear torneos, finalizar y archivar ediciones (Apertura/Clausura), playoffs y cuadros de llaves
              </p>
            </article>

            {/* Tarjeta 2: Equipos */}
            <article
              onClick={() => setModuloActivo('equipos')}
              className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md hover:border-[#991b1b] transition-all duration-200 cursor-pointer group flex flex-col items-center text-center gap-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#991b1b] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#991b1b] group-hover:text-white transition-all shadow-sm">
                <FaShieldAlt className="text-2xl" />
              </div>
              <h2 className="font-headline text-xl text-slate-900 group-hover:text-[#991b1b] transition-colors uppercase">
                Equipos y Planteles
              </h2>
              <p className="text-xs text-slate-500 font-body">
                Configurar planteles de Argentinos del Norte, incorporar jugadores del padrón y asignar cuerpo técnico
              </p>
            </article>

            {/* Tarjeta 3: Padrón de Jugadores */}
            <article
              onClick={() => setModuloActivo('jugadores')}
              className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md hover:border-[#991b1b] transition-all duration-200 cursor-pointer group flex flex-col items-center text-center gap-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#991b1b] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#991b1b] group-hover:text-white transition-all shadow-sm">
                <FaUsers className="text-2xl" />
              </div>
              <h2 className="font-headline text-xl text-slate-900 group-hover:text-[#991b1b] transition-colors uppercase">
                Padrón de Jugadores
              </h2>
              <p className="text-xs text-slate-500 font-body">
                Directorio único de socios y jugadores del club por DNI, fichas personales y estado multi-equipo
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

            {/* Tarjeta 6: Finanzas y Tesorería */}
            <article
              onClick={() => setModuloActivo('cuotas')}
              className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-600 transition-all duration-200 cursor-pointer group flex flex-col items-center text-center gap-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                <FaWallet className="text-2xl" />
              </div>
              <h2 className="font-headline text-xl text-slate-900 group-hover:text-emerald-700 transition-colors uppercase">
                Finanzas y Tesorería
              </h2>
              <p className="text-xs text-slate-500 font-body">
                Cuotas de socios, Entradas del club (partidos, buffet, sponsors), egresos y balance neto
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


            {/* Tarjeta 9: Historial de Torneos */}
            <article
              onClick={() => setModuloActivo('historial')}
              className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-500 transition-all duration-200 cursor-pointer group flex flex-col items-center text-center gap-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-sm">
                <FaHistory className="text-2xl" />
              </div>
              <h2 className="font-headline text-xl text-slate-900 group-hover:text-amber-600 transition-colors uppercase">
                Historial de Torneos
              </h2>
              <p className="text-xs text-slate-500 font-body">
                Archivo de torneos disputados, podio de campeones, tablas finales y resultados históricos
              </p>
            </article>

            {/* Tarjeta 10: Usuarios y Accesos */}
            <article
              onClick={() => setModuloActivo('usuarios')}
              className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md hover:border-[#151f89] transition-all duration-200 cursor-pointer group flex flex-col items-center text-center gap-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-[#151f89] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#151f89] group-hover:text-white transition-all shadow-sm">
                <FaUserShield className="text-2xl" />
              </div>
              <h2 className="font-headline text-xl text-slate-900 group-hover:text-[#151f89] transition-colors uppercase">
                Usuarios y Accesos
              </h2>
              <p className="text-xs text-slate-500 font-body">
                Gestión de administradores y planilleros, asignación de roles, altas, bajas y reseteo de claves
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
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              Finanzas
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
            <button
              onClick={() => setModuloActivo('historial')}
              className={`px-3.5 py-1.5 rounded-xl font-title font-bold text-xs uppercase shrink-0 transition-colors ${
                moduloActivo === 'historial'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              Historial
            </button>
            <button
              onClick={() => setModuloActivo('usuarios')}
              className={`px-3.5 py-1.5 rounded-xl font-title font-bold text-xs uppercase shrink-0 transition-colors ${
                moduloActivo === 'usuarios'
                  ? 'bg-[#151f89] text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              Usuarios
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
              <div className="bg-blue-50 border-2 border-[#151f89] p-5 sm:p-6 rounded-2xl shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline text-lg sm:text-xl uppercase text-[#151f89]">
                    Cargar Resultado: {partidoEditando.equipo_local} vs {partidoEditando.equipo_visitante}
                  </h3>
                  <button
                    onClick={() => {
                      setPartidoEditando(null);
                      setPlantelPartido([]);
                      setStatsPartido({});
                    }}
                    className="text-slate-400 hover:text-slate-700 p-1"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleGuardarResultado} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
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

                    <div>
                      <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                        Estado del Partido
                      </label>
                      <select
                        value={formResultado.estado_partido}
                        onChange={(e) => setFormResultado({ ...formResultado, estado_partido: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-headline uppercase"
                      >
                        <option value="2">Finalizado</option>
                        <option value="1">En Vivo</option>
                        <option value="0">Programado</option>
                        <option value="3">Suspendido</option>
                        <option value="4">Cancelado</option>
                      </select>
                    </div>
                  </div>

                  {/* Sección Estadísticas Exclusivas Argentinos del Norte */}
                  {(partidoEditando.local_es_argentinos || partidoEditando.visitante_es_argentinos) && (
                    <div className="mt-4 pt-4 border-t border-[#151f89]/20 space-y-3">
                      <div className="flex items-center gap-2">
                        <ClubShield className="w-5 h-5 shrink-0" />
                        <div>
                          <h4 className="font-headline text-sm uppercase text-[#151f89] tracking-wide">
                            Estadísticas Individuales — Argentinos del Norte
                          </h4>
                          <p className="text-[11px] text-slate-600 font-body">
                            Asigná los goles y tarjetas del plantel del club. Las estadísticas de rivales no se trackean individualmente.
                          </p>
                        </div>
                      </div>

                      {cargandoStatsPartido ? (
                        <div className="py-4 text-center text-xs font-title text-slate-500">Cargando plantel del club...</div>
                      ) : plantelPartido.length === 0 ? (
                        <div className="bg-white/80 p-3 rounded-xl text-xs text-slate-500 font-title border border-slate-200">
                          No hay jugadores registrados en el plantel de este equipo todavía. Podés convocarlos desde la pestaña Equipos.
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                            {plantelPartido.map((jug) => {
                              const st = statsPartido[jug.id_jugador] || { goles: 0, tarjetas_amarillas: 0, tarjetas_rojas: 0 };
                              return (
                                <div key={jug.id_jugador} className="p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors">
                                  <div className="flex items-center gap-2.5 min-w-[140px]">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 uppercase">
                                      {jug.nombre?.[0]}{jug.apellido?.[0]}
                                    </div>
                                    <span className="font-bold text-slate-800 font-title">
                                      {jug.apellido}, {jug.nombre}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-4">
                                    {/* Goles */}
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-headline uppercase text-slate-500 font-bold">Goles:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        max="30"
                                        value={st.goles || 0}
                                        onChange={(e) => {
                                          const val = Math.max(0, parseInt(e.target.value) || 0);
                                          setStatsPartido(prev => ({
                                            ...prev,
                                            [jug.id_jugador]: { ...(prev[jug.id_jugador] || {}), id_jugador: jug.id_jugador, goles: val }
                                          }));
                                        }}
                                        className="w-12 bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-center font-headline font-bold text-xs"
                                      />
                                    </div>

                                    {/* Amarillas */}
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-headline uppercase text-amber-600 font-bold">Amarillas:</span>
                                      <select
                                        value={st.tarjetas_amarillas || 0}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value) || 0;
                                          setStatsPartido(prev => ({
                                            ...prev,
                                            [jug.id_jugador]: { ...(prev[jug.id_jugador] || {}), id_jugador: jug.id_jugador, tarjetas_amarillas: val }
                                          }));
                                        }}
                                        className="bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-center font-bold text-xs"
                                      >
                                        <option value="0">0</option>
                                        <option value="1">1</option>
                                        <option value="2">2</option>
                                      </select>
                                    </div>

                                    {/* Roja */}
                                    <label className="flex items-center gap-1 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(st.tarjetas_rojas)}
                                        onChange={(e) => {
                                          const val = e.target.checked ? 1 : 0;
                                          setStatsPartido(prev => ({
                                            ...prev,
                                            [jug.id_jugador]: { ...(prev[jug.id_jugador] || {}), id_jugador: jug.id_jugador, tarjetas_rojas: val }
                                          }));
                                        }}
                                        className="rounded text-red-600 focus:ring-red-500"
                                      />
                                      <span className="text-[10px] font-headline uppercase text-red-700 font-bold">Roja</span>
                                    </label>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={cargandoAccion}
                      className="flex-1 bg-[#151f89] hover:bg-[#303a9f] text-white py-3 rounded-lg font-headline uppercase text-sm shadow-sm transition-colors"
                    >
                      {cargandoAccion ? 'Guardando...' : 'Confirmar y Guardar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPartidoEditando(null);
                        setPlantelPartido([]);
                        setStatsPartido({});
                      }}
                      className="px-5 py-3 bg-slate-200 hover:bg-slate-300 rounded-lg font-title font-bold text-sm text-slate-700 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Modal / Formulario Editar Partido (Programación y Datos) */}
            {partidoEditandoDatos && (
              <div className="bg-white border-2 border-slate-900/30 p-6 rounded-2xl shadow-md space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-[#151f89] uppercase font-bold">
                      Edición de Fixture
                    </span>
                    <h3 className="font-headline text-lg sm:text-xl uppercase text-slate-900">
                      Editar Partido: {partidoEditandoDatos.equipo_local} vs {partidoEditandoDatos.equipo_visitante}
                    </h3>
                  </div>
                  <button
                    onClick={() => setPartidoEditandoDatos(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  >
                    <FaTimes />
                  </button>
                </div>

                <form onSubmit={handleGuardarEdicionPartido} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                        Equipo Local *
                      </label>
                      <select
                        value={formEditarPartido.id_equipo_local}
                        onChange={(e) => setFormEditarPartido({ ...formEditarPartido, id_equipo_local: e.target.value })}
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body focus:outline-none"
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
                        Equipo Visitante *
                      </label>
                      <select
                        value={formEditarPartido.id_equipo_visitante}
                        onChange={(e) => setFormEditarPartido({ ...formEditarPartido, id_equipo_visitante: e.target.value })}
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body focus:outline-none"
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
                      <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                        Sede / Cancha *
                      </label>
                      <select
                        value={formEditarPartido.id_sede}
                        onChange={(e) => setFormEditarPartido({ ...formEditarPartido, id_sede: e.target.value })}
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body focus:outline-none"
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
                      <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                        Fecha y Hora *
                      </label>
                      <input
                        type="datetime-local"
                        value={formEditarPartido.fecha_partido}
                        onChange={(e) => setFormEditarPartido({ ...formEditarPartido, fecha_partido: e.target.value })}
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                        Jornada / Fecha Nº
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formEditarPartido.jornada_numero}
                        onChange={(e) => setFormEditarPartido({ ...formEditarPartido, jornada_numero: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                        Etiqueta / Nombre
                      </label>
                      <input
                        type="text"
                        placeholder="ej. Fecha 3, Clásico, Interzonal..."
                        value={formEditarPartido.nombre_partido}
                        onChange={(e) => setFormEditarPartido({ ...formEditarPartido, nombre_partido: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                        Estado del Partido
                      </label>
                      <select
                        value={formEditarPartido.estado_partido}
                        onChange={(e) => setFormEditarPartido({ ...formEditarPartido, estado_partido: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body focus:outline-none"
                      >
                        <option value="0">0 - Programado / Próximo</option>
                        <option value="1">1 - En Vivo / En Juego</option>
                        <option value="2">2 - Finalizado</option>
                        <option value="3">3 - Suspendido / Postergado</option>
                        <option value="4">4 - Cancelado</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                        Observaciones / Incidencias
                      </label>
                      <input
                        type="text"
                        placeholder="ej. Cancha 2, sin público visitante, árbitros..."
                        value={formEditarPartido.observaciones}
                        onChange={(e) => setFormEditarPartido({ ...formEditarPartido, observaciones: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-title font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={formEditarPartido.afecta_clasificacion}
                        onChange={(e) => setFormEditarPartido({ ...formEditarPartido, afecta_clasificacion: e.target.checked })}
                        className="rounded text-[#151f89] focus:ring-[#151f89] h-4 w-4"
                      />
                      <span>Afecta la Tabla de Posiciones</span>
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPartidoEditandoDatos(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-title font-bold text-xs transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={cargandoAccion}
                        className="bg-[#151f89] hover:bg-[#303a9f] text-white px-5 py-2 rounded-lg font-headline uppercase text-xs tracking-wider transition-colors shadow-sm"
                      >
                        {cargandoAccion ? 'Guardando...' : 'Guardar Cambios'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Lista y Tabla de partidos */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {/* Vista Móvil: Cards */}
              <div className="block md:hidden divide-y divide-slate-100">
                {partidos.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-title text-xs">No hay partidos programados en esta división.</div>
                ) : (
                  partidos.map((p) => (
                    <div key={p.id_partido} className="p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-500 font-mono">
                          {p.nombre_partido || `Fecha ${p.jornada_numero}`}
                        </span>
                        {p.estado_partido === 2 ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            Finalizado
                          </span>
                        ) : p.estado_partido === 1 ? (
                          <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                            En Vivo
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            Programado
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                        <div className="flex-1 font-bold text-slate-900 text-xs text-left truncate pr-2">
                          {p.equipo_local}
                        </div>
                        <div className="font-headline text-lg font-bold text-slate-900 px-3 shrink-0">
                          {p.estado_partido === 2 ? `${p.goles_local} - ${p.goles_visitante}` : 'VS'}
                        </div>
                        <div className="flex-1 font-bold text-slate-900 text-xs text-right truncate pl-2">
                          {p.equipo_visitante}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                        <button
                          onClick={() => iniciarEdicionPartido(p)}
                          className="flex-1 sm:flex-none bg-[#151f89] hover:bg-[#303a9f] text-white px-3 py-1.5 rounded-xl text-xs font-headline uppercase tracking-wider text-center transition-colors"
                        >
                          Cargar Resultado
                        </button>
                        <button
                          onClick={() => iniciarEdicionDatosPartido(p)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                          title="Editar programación del partido"
                        >
                          <FaEdit className="text-xs" />
                        </button>
                        <button
                          onClick={() => handleEliminarPartido(p)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                          title="Eliminar partido (borrado lógico)"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Vista Desktop: Tabla */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-headline text-xs text-slate-600 uppercase">
                      <th className="p-3.5">Jornada</th>
                      <th className="p-3.5">Local</th>
                      <th className="p-3.5 text-center">Goles</th>
                      <th className="p-3.5">Visitante</th>
                      <th className="p-3.5">Estado</th>
                      <th className="p-3.5 text-right">Acciones</th>
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
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => iniciarEdicionPartido(p)}
                              className="bg-[#151f89] hover:bg-[#303a9f] text-white px-3 py-1.5 rounded-lg text-xs font-headline uppercase tracking-wider transition-colors"
                              title="Cargar o modificar resultado y goleadores"
                            >
                              Cargar Resultado
                            </button>
                            <button
                              onClick={() => iniciarEdicionDatosPartido(p)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                              title="Editar programación del partido"
                            >
                              <FaEdit className="text-xs" />
                            </button>
                            <button
                              onClick={() => handleEliminarPartido(p)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                              title="Eliminar partido (borrado lógico)"
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-headline text-2xl uppercase tracking-wide text-slate-900">
                  Sedes y Complejos Habilitados
                </h2>
                <p className="text-xs text-slate-500 font-body">
                  Canchas reglamentarias donde se juegan los partidos de Futsal AFA.
                </p>
              </div>
              <button
                onClick={iniciarCrearSede}
                className="flex items-center gap-2 bg-[#151f89] hover:bg-[#303a9f] text-white px-4 py-2 rounded-xl text-xs font-headline uppercase tracking-wider transition-colors shadow-sm shrink-0"
              >
                <FaPlus className="text-xs" />
                <span>Nueva Sede</span>
              </button>
            </div>

            {/* Formulario Crear / Editar Sede */}
            {mostrarCrearSede && (
              <div className="bg-white border-2 border-[#151f89]/30 p-6 rounded-2xl shadow-sm space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-headline text-lg uppercase text-[#151f89]">
                    {sedeEditando ? `Editar Sede: ${sedeEditando.nombre_sede}` : 'Registrar Nueva Sede'}
                  </h3>
                  <button
                    onClick={() => {
                      setMostrarCrearSede(false);
                      setSedeEditando(null);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  >
                    <FaTimes />
                  </button>
                </div>

                <form onSubmit={handleGuardarSede} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                      Nombre de la Sede *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Cancha Central Argentinos, Complejo Belgrano..."
                      value={formSede.nombre_sede}
                      onChange={(e) => setFormSede({ ...formSede, nombre_sede: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                      Dirección *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Av. Benjamín Aráoz 650, San Miguel de Tucumán"
                      value={formSede.direccion}
                      onChange={(e) => setFormSede({ ...formSede, direccion: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                      Enlace a Google Maps (Opcional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://maps.google.com/..."
                      value={formSede.google_maps_url}
                      onChange={(e) => setFormSede({ ...formSede, google_maps_url: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none bg-blue-50/50 border border-blue-200 px-4 py-2.5 rounded-xl">
                      <input
                        type="checkbox"
                        checked={formSede.es_sede_propia}
                        onChange={(e) => setFormSede({ ...formSede, es_sede_propia: e.target.checked })}
                        className="rounded text-[#151f89] focus:ring-[#151f89] h-4 w-4"
                      />
                      <span className="text-xs font-title font-bold text-slate-800 uppercase">
                        Es Sede Propia del Club Argentinos del Norte
                      </span>
                    </label>
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarCrearSede(false);
                        setSedeEditando(null);
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-title font-bold text-xs transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={cargandoAccion}
                      className="bg-[#151f89] hover:bg-[#303a9f] text-white px-5 py-2 rounded-lg font-headline uppercase text-xs tracking-wider transition-colors shadow-sm"
                    >
                      {cargandoAccion ? 'Guardando...' : (sedeEditando ? 'Actualizar Sede' : 'Crear Sede')}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sedes.length === 0 ? (
                <div className="col-span-2 p-12 text-center text-slate-400 font-title text-sm bg-white rounded-2xl border border-slate-200">
                  No hay sedes registradas en el sistema.
                </div>
              ) : (
                sedes.map((s) => (
                  <div key={s.id_sede} className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-xs hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-headline text-lg text-slate-900 uppercase">{s.nombre_sede}</h4>
                          {s.es_sede_propia && (
                            <span className="bg-[#151f89] text-white text-[10px] px-2.5 py-0.5 rounded-full font-headline uppercase">
                              Sede Propia
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => iniciarEditarSede(s)}
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Editar sede"
                        >
                          <FaEdit className="text-xs" />
                        </button>
                        <button
                          onClick={() => handleEliminarSede(s)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Eliminar sede (borrado lógico)"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm font-title text-slate-600 flex items-center gap-2">
                      <FaMapMarkerAlt className="text-[#151f89] shrink-0" />
                      <span>{s.direccion}</span>
                    </p>
                    {s.google_maps_url && (
                      <a
                        href={s.google_maps_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-xs text-[#151f89] font-bold hover:underline"
                      >
                        Ver en Google Maps →
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VISTA 7: HISTORIAL DE TORNEOS */}
        {moduloActivo === 'historial' && (
          <HistorialManager onActualizarTorneos={cargarDivisiones} />
        )}

        {/* VISTA 8: GESTIÓN DE USUARIOS */}
        {moduloActivo === 'usuarios' && (
          <UsuariosManager divisiones={divisiones} />
        )}
      </main>
    </div>
  );
}
