import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import ClubShield from '../ui/ClubShield';
import {
  FaTrophy,
  FaProjectDiagram,
  FaCheck,
  FaUndo,
  FaExclamationTriangle,
  FaShieldAlt,
  FaCalendarCheck,
  FaClock,
  FaChevronRight,
  FaSave,
  FaEdit,
  FaEye,
  FaArrowLeft,
  FaFutbol,
} from 'react-icons/fa';

export default function PlayoffsManager({
  divisiones = [],
  divisionInicialId = '',
  onVolver,
}) {
  const [divisionSel, setDivisionSel] = useState(
    divisionInicialId || (divisiones[0]?.id_division || '')
  );
  const [llaves, setLlaves] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardandoId, setGuardandoId] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [cantidadEquipos, setCantidadEquipos] = useState(8);
  const [vistaActiva, setVistaActiva] = useState('editor'); // 'editor' | 'diagrama'
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [modalReiniciar, setModalReiniciar] = useState(false);
  const [reiniciando, setReiniciando] = useState(false);

  // Sincronizar división seleccionada
  useEffect(() => {
    if (divisionInicialId) {
      setDivisionSel(divisionInicialId);
    } else if (!divisionSel && divisiones.length > 0) {
      setDivisionSel(divisiones[0].id_division);
    }
  }, [divisionInicialId, divisiones]);

  const mostrarAviso = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };

  // Cargar llaves y equipos de la división
  const cargarDatos = useCallback(async (mostrarSpinner = true) => {
    if (!divisionSel) return;
    if (mostrarSpinner) setCargando(true);
    try {
      const [resLlaves, resEquipos] = await Promise.all([
        api.get(`/playoff/${divisionSel}`),
        api.get(`/equipos?id_division=${divisionSel}`),
      ]);
      setLlaves(resLlaves.data.data || []);
      setEquipos(resEquipos.data.data || []);
    } catch (err) {
      console.error(err);
      mostrarAviso('error', 'Error al cargar los datos del cuadro de playoff.');
    } finally {
      if (mostrarSpinner) setCargando(false);
    }
  }, [divisionSel]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Generar Bracket
  const handleGenerarBracket = async () => {
    setGenerando(true);
    try {
      const res = await api.post('/playoff/generar', {
        id_division: Number(divisionSel),
        cantidad_equipos: parseInt(cantidadEquipos, 10),
      });
      mostrarAviso('exito', res.data.mensaje || '¡Cuadro de playoff generado con éxito!');
      await cargarDatos(false);
    } catch (err) {
      mostrarAviso('error', err.response?.data?.mensaje || 'Error al generar el cuadro.');
    } finally {
      setGenerando(false);
    }
  };

  // Reiniciar Bracket (eliminar llaves de la división)
  const handleReiniciarBracket = async () => {
    setReiniciando(true);
    try {
      await api.delete(`/playoff/division/${divisionSel}`);
      mostrarAviso('exito', 'Cuadro de playoff reiniciado correctamente.');
      setModalReiniciar(false);
      await cargarDatos(false);
    } catch (err) {
      mostrarAviso('error', err.response?.data?.mensaje || 'Error al reiniciar el cuadro.');
    } finally {
      setReiniciando(false);
    }
  };

  // Actualizar un campo individual de una llave
  const actualizarCampo = async (idLlave, campo, valor) => {
    setGuardandoId(idLlave);
    try {
      await api.put(`/playoff/${idLlave}`, { [campo]: valor });
      await cargarDatos(false);
    } catch (err) {
      console.error(err);
      mostrarAviso('error', 'Error al actualizar el partido.');
    } finally {
      setGuardandoId(null);
    }
  };

  // Guardar datos completos de una llave
  const handleGuardarLlaveCompleta = async (llaveEditada) => {
    setGuardandoId(llaveEditada.id_llave);
    try {
      await api.put(`/playoff/${llaveEditada.id_llave}`, {
        id_equipo_local: llaveEditada.id_equipo_local || null,
        id_equipo_visitante: llaveEditada.id_equipo_visitante || null,
        goles_local: llaveEditada.goles_local !== '' ? llaveEditada.goles_local : null,
        goles_visitante: llaveEditada.goles_visitante !== '' ? llaveEditada.goles_visitante : null,
        penales_local: llaveEditada.penales_local !== '' ? llaveEditada.penales_local : null,
        penales_visitante: llaveEditada.penales_visitante !== '' ? llaveEditada.penales_visitante : null,
        estado_partido: llaveEditada.estado_partido,
        id_equipo_ganador: llaveEditada.id_equipo_ganador || null,
      });
      mostrarAviso('exito', 'Partido actualizado y llaves enlazadas.');
      await cargarDatos(false);
    } catch (err) {
      mostrarAviso('error', err.response?.data?.mensaje || 'Error al guardar los cambios.');
    } finally {
      setGuardandoId(null);
    }
  };

  // Alternar estado de partido terminado
  const handleToggleTerminado = async (llave, checked) => {
    if (checked) {
      const gl = parseInt(llave.goles_local, 10);
      const gv = parseInt(llave.goles_visitante, 10);
      const hayEmpate = !isNaN(gl) && !isNaN(gv) && gl === gv;

      if (hayEmpate && !llave.id_equipo_ganador) {
        mostrarAviso(
          'error',
          'El partido está empatado. Por favor, definí el ganador por penales antes de marcarlo como Terminado.'
        );
        return;
      }
    }

    setGuardandoId(llave.id_llave);
    try {
      await api.put(`/playoff/${llave.id_llave}`, {
        estado_partido: checked ? 2 : 0,
      });
      await cargarDatos(false);
    } catch (err) {
      console.error(err);
      mostrarAviso('error', 'Error al cambiar estado.');
    } finally {
      setGuardandoId(null);
    }
  };

  // Agrupar llaves por fase
  const fasesMap = {};
  llaves.forEach((llave) => {
    if (!fasesMap[llave.fase]) fasesMap[llave.fase] = [];
    fasesMap[llave.fase].push(llave);
  });
  // Ordenar fases según jerarquía: 16avos -> Octavos -> Cuartos -> Semifinal -> Final
  const ordenJerarquia = {
    '16avos de Final': 1,
    'Octavos de Final': 2,
    'Cuartos de Final': 3,
    'Semifinal': 4,
    'Final': 5,
  };
  const fasesOrdenadas = Object.keys(fasesMap).sort(
    (a, b) => (ordenJerarquia[a] || 99) - (ordenJerarquia[b] || 99)
  );

  const divisionActual = divisiones.find(
    (d) => Number(d.id_division) === Number(divisionSel)
  );

  // Estadísticas del bracket
  const totalPartidos = llaves.length;
  const partidosFinalizados = llaves.filter((l) => l.estado_partido === 2).length;
  const llaveFinal = llaves.find((l) => l.fase === 'Final');
  let campeonNombre = null;
  if (llaveFinal && llaveFinal.estado_partido === 2) {
    const gl = llaveFinal.goles_local;
    const gv = llaveFinal.goles_visitante;
    if (gl !== null && gv !== null) {
      if (gl > gv) campeonNombre = llaveFinal.equipo_local_nombre;
      else if (gv > gl) campeonNombre = llaveFinal.equipo_visitante_nombre;
      else if (llaveFinal.id_equipo_ganador) {
        campeonNombre =
          llaveFinal.id_equipo_ganador === llaveFinal.id_equipo_local
            ? llaveFinal.equipo_local_nombre
            : llaveFinal.equipo_visitante_nombre;
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── Encabezado Principal y Selector ─────────────────────────────── */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {onVolver && (
            <button
              onClick={onVolver}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-title font-bold text-xs uppercase mb-3 transition-colors"
            >
              <FaArrowLeft className="text-[10px]" />
              <span>Volver a Lista de Torneos</span>
            </button>
          )}
          <div className="flex items-center gap-2 text-[#151f89] font-headline text-xs tracking-widest uppercase">
            <FaProjectDiagram />
            <span>Fase de Playoff y Cruces Eliminatorios</span>
          </div>
          <h2 className="font-headline text-2xl sm:text-3xl uppercase tracking-wide text-slate-900 mt-1">
            Gestor de Cuadros y Brackets
          </h2>
          <p className="text-xs text-slate-500 font-body">
            Configurá las llaves eliminatorias por torneo, asigná los equipos participantes y registrá resultados con pase automático de ronda.
          </p>
        </div>

        {/* Selector de Torneo */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <select
              value={divisionSel}
              onChange={(e) => setDivisionSel(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 border-2 border-slate-300 hover:border-[#151f89] rounded-xl px-4 py-2.5 font-headline font-bold text-sm text-slate-900 focus:outline-none transition-colors uppercase tracking-wider"
            >
              {divisiones.map((d) => (
                <option key={d.id_division} value={d.id_division}>
                  {d.nombre_division} ({d.temporada})
                </option>
              ))}
            </select>
          </div>

          {llaves.length > 0 && (
            <button
              onClick={() => setModalReiniciar(true)}
              className="px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-headline uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs"
              title="Borrar todas las llaves y volver a generar el bracket"
            >
              <FaUndo className="text-xs" />
              <span>Reiniciar Bracket</span>
            </button>
          )}
        </div>
      </section>

      {/* ─── Mensajes de Feedback ─────────────────────────────────────────── */}
      {mensaje.texto && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 shadow-xs ${
            mensaje.tipo === 'exito'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {mensaje.tipo === 'exito' ? (
            <FaCheck className="text-emerald-600" />
          ) : (
            <FaExclamationTriangle className="text-red-600" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* ─── Contenido Principal ──────────────────────────────────────────── */}
      {cargando ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-sm">
          <div className="w-10 h-10 border-4 border-[#151f89] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-headline text-slate-600 uppercase tracking-wider text-sm">
            Cargando llaves del torneo...
          </p>
        </div>
      ) : llaves.length === 0 ? (
        /* ─── ESTADO VACÍO: GENERADOR DE BRACKET ─────────────────────────── */
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200 shadow-sm text-center max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
            <FaTrophy className="text-3xl" />
          </div>

          <div className="space-y-2">
            <h3 className="font-headline text-2xl uppercase tracking-wide text-slate-900">
              No hay Playoff configurado para {divisionActual?.nombre_division || 'este torneo'}
            </h3>
            <p className="text-sm text-slate-500 font-body max-w-md mx-auto">
              Seleccioná la cantidad de equipos clasificados para estructurar automáticamente el árbol de llaves eliminatorias directas.
            </p>
          </div>

          {/* Opciones de formato de Playoff */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            {[
              {
                cantidad: 4,
                titulo: '4 Equipos',
                fases: 'Semifinales + Final',
                total: '3 partidos',
              },
              {
                cantidad: 8,
                titulo: '8 Equipos',
                fases: 'Cuartos + Semis + Final',
                total: '7 partidos',
                popular: true,
              },
              {
                cantidad: 16,
                titulo: '16 Equipos',
                fases: 'Octavos a Final',
                total: '15 partidos',
              },
            ].map((opc) => (
              <button
                key={opc.cantidad}
                type="button"
                onClick={() => setCantidadEquipos(opc.cantidad)}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between text-left relative ${
                  cantidadEquipos === opc.cantidad
                    ? 'border-[#151f89] bg-blue-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                {opc.popular && (
                  <span className="absolute -top-2.5 right-3 bg-[#151f89] text-white text-[10px] font-headline uppercase px-2 py-0.5 rounded-full tracking-wider">
                    Futsal Estándar
                  </span>
                )}
                <div>
                  <span className="font-headline text-lg text-slate-900 block uppercase">
                    {opc.titulo}
                  </span>
                  <span className="text-xs text-slate-500 font-body block mt-0.5">
                    {opc.fases}
                  </span>
                </div>
                <span className="mt-3 text-[11px] font-title font-bold text-[#151f89] bg-white px-2 py-1 rounded border border-slate-200 inline-block w-fit">
                  {opc.total}
                </span>
              </button>
            ))}
          </div>

          {/* Selector alternativo para 2 o 32 equipos */}
          <div className="flex items-center justify-center gap-3 pt-2 text-xs font-title font-semibold text-slate-600">
            <span>Otras opciones:</span>
            <button
              onClick={() => setCantidadEquipos(2)}
              className={`px-3 py-1 rounded-lg border ${
                cantidadEquipos === 2
                  ? 'bg-[#151f89] text-white border-[#151f89]'
                  : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
              }`}
            >
              2 Equipos (Final Directa)
            </button>
            <button
              onClick={() => setCantidadEquipos(32)}
              className={`px-3 py-1 rounded-lg border ${
                cantidadEquipos === 32
                  ? 'bg-[#151f89] text-white border-[#151f89]'
                  : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
              }`}
            >
              32 Equipos (16avos de Final)
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={handleGenerarBracket}
              disabled={generando}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#151f89] hover:bg-[#303a9f] text-white px-8 py-3.5 rounded-xl font-headline uppercase tracking-wider text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {generando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generando Estructura...</span>
                </>
              ) : (
                <>
                  <FaProjectDiagram />
                  <span>Generar Cuadro de Playoff ({cantidadEquipos} Equipos)</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* ─── ESTADO ACTIVO: BRACKET GENERADO ────────────────────────────── */
        <div className="space-y-6">
          {/* Barra de Estadísticas y Selector de Vistas */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-headline text-xs uppercase tracking-wider bg-blue-50 text-[#151f89] px-3 py-1.5 rounded-lg border border-blue-100">
                {fasesOrdenadas.length} Fases
              </span>
              <span className="font-headline text-xs uppercase tracking-wider bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg">
                {partidosFinalizados} / {totalPartidos} Partidos Finalizados
              </span>
              {campeonNombre && (
                <span className="font-headline text-xs uppercase tracking-wider bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center gap-1.5">
                  <FaTrophy className="text-amber-600" />
                  <span>Campeón: {campeonNombre}</span>
                </span>
              )}
            </div>

            {/* Alternar Pestañas de Vista */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setVistaActiva('editor')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-headline text-xs uppercase tracking-wider transition-all ${
                  vistaActiva === 'editor'
                    ? 'bg-white text-[#151f89] shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FaEdit />
                <span>Cargar Resultados</span>
              </button>
              <button
                type="button"
                onClick={() => setVistaActiva('diagrama')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-headline text-xs uppercase tracking-wider transition-all ${
                  vistaActiva === 'diagrama'
                    ? 'bg-white text-[#151f89] shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FaEye />
                <span>Diagrama Visual</span>
              </button>
            </div>
          </div>

          {/* VISTA 1: EDITOR DE PARTIDOS POR FASE */}
          {vistaActiva === 'editor' && (
            <div className="space-y-8">
              {fasesOrdenadas.map((faseNombre) => {
                const llavesDeFase = fasesMap[faseNombre].sort(
                  (a, b) => a.orden - b.orden
                );

                return (
                  <div
                    key={faseNombre}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
                  >
                    {/* Header de la Ronda */}
                    <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <h3 className="font-headline text-base sm:text-lg uppercase tracking-wider">
                          {faseNombre}
                        </h3>
                      </div>
                      <span className="text-xs text-slate-400 font-title font-semibold">
                        {llavesDeFase.length} {llavesDeFase.length === 1 ? 'partido' : 'partidos'}
                      </span>
                    </div>

                    {/* Grid de Partidos */}
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 bg-slate-50/50">
                      {llavesDeFase.map((llave, idx) => (
                        <LlavePartidoCard
                          key={llave.id_llave}
                          llave={llave}
                          numeroPartido={idx + 1}
                          equipos={equipos}
                          estaGuardando={guardandoId === llave.id_llave}
                          onGuardar={handleGuardarLlaveCompleta}
                          onToggleTerminado={handleToggleTerminado}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VISTA 2: DIAGRAMA VISUAL DEL BRACKET */}
          {vistaActiva === 'diagrama' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden">
              <DiagramaVisualBracket
                fasesOrdenadas={fasesOrdenadas}
                fasesMap={fasesMap}
                campeonNombre={campeonNombre}
              />
            </div>
          )}
        </div>
      )}

      {/* ─── Modal Confirmar Reinicio de Bracket ───────────────────────────── */}
      {modalReiniciar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <FaExclamationTriangle className="text-2xl" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="font-headline text-xl uppercase tracking-wide text-slate-900">
                ¿Reiniciar Cuadro de Playoff?
              </h4>
              <p className="text-xs text-slate-500 font-body">
                Esta acción eliminará todas las llaves, cruces y resultados cargados para{' '}
                <strong>{divisionActual?.nombre_division}</strong>. Podrás volver a generar un nuevo cuadro inmediatamente.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={reiniciando}
                onClick={handleReiniciarBracket}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider transition-colors disabled:opacity-50"
              >
                {reiniciando ? 'Reiniciando...' : 'Sí, Reiniciar'}
              </button>
              <button
                type="button"
                onClick={() => setModalReiniciar(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-title font-bold text-xs uppercase transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: TARJETA DE PARTIDO DE PLAYOFF (EDITOR)
// ─────────────────────────────────────────────────────────────────────────────
function LlavePartidoCard({
  llave,
  numeroPartido,
  equipos,
  estaGuardando,
  onGuardar,
  onToggleTerminado,
}) {
  // Estado local para edición rápida
  const [form, setForm] = useState({
    id_equipo_local: llave.id_equipo_local || '',
    id_equipo_visitante: llave.id_equipo_visitante || '',
    goles_local: llave.goles_local !== null ? llave.goles_local : '',
    goles_visitante: llave.goles_visitante !== null ? llave.goles_visitante : '',
    penales_local: llave.penales_local !== null ? llave.penales_local : '',
    penales_visitante: llave.penales_visitante !== null ? llave.penales_visitante : '',
    id_equipo_ganador: llave.id_equipo_ganador || '',
    estado_partido: llave.estado_partido ?? 0,
  });

  const [haCambiado, setHaCambiado] = useState(false);

  // Sincronizar con props
  useEffect(() => {
    setForm({
      id_equipo_local: llave.id_equipo_local || '',
      id_equipo_visitante: llave.id_equipo_visitante || '',
      goles_local: llave.goles_local !== null ? llave.goles_local : '',
      goles_visitante: llave.goles_visitante !== null ? llave.goles_visitante : '',
      penales_local: llave.penales_local !== null ? llave.penales_local : '',
      penales_visitante: llave.penales_visitante !== null ? llave.penales_visitante : '',
      id_equipo_ganador: llave.id_equipo_ganador || '',
      estado_partido: llave.estado_partido ?? 0,
    });
    setHaCambiado(false);
  }, [llave]);

  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setHaCambiado(true);
  };

  const glNum = form.goles_local !== '' ? parseInt(form.goles_local, 10) : null;
  const gvNum = form.goles_visitante !== '' ? parseInt(form.goles_visitante, 10) : null;
  const esEmpate = glNum !== null && gvNum !== null && glNum === gvNum;

  const esTerminado = llave.estado_partido === 2;

  // Determinar ganador
  let ganadorId = null;
  if (esTerminado && glNum !== null && gvNum !== null) {
    if (glNum > gvNum) ganadorId = Number(llave.id_equipo_local);
    else if (gvNum > glNum) ganadorId = Number(llave.id_equipo_visitante);
    else if (llave.id_equipo_ganador) ganadorId = Number(llave.id_equipo_ganador);
  }

  const handleGuardarClick = () => {
    onGuardar({
      ...llave,
      ...form,
    });
  };

  return (
    <div
      className={`bg-white rounded-xl border-2 transition-all p-4 flex flex-col justify-between gap-3 shadow-xs ${
        esTerminado
          ? 'border-emerald-300 bg-emerald-50/15'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Header del Match */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-headline text-xs uppercase tracking-wider text-slate-500">
            Partido {numeroPartido}
          </span>
          {esTerminado ? (
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-headline uppercase px-2 py-0.5 rounded font-bold">
              Finalizado
            </span>
          ) : (
            <span className="bg-slate-100 text-slate-600 text-[10px] font-headline uppercase px-2 py-0.5 rounded font-bold">
              Pendiente
            </span>
          )}
        </div>

        {/* Switch Terminado */}
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={esTerminado}
            onChange={(e) => onToggleTerminado(llave, e.target.checked)}
            disabled={estaGuardando}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
          <span className="font-title text-[11px] font-bold text-slate-700 uppercase">
            Terminado
          </span>
        </label>
      </div>

      {/* Cuerpo: Equipos y Goles */}
      <div className="space-y-2.5">
        {/* Fila Equipo Local */}
        <div
          className={`flex items-center justify-between gap-2 p-1.5 rounded-lg transition-colors ${
            ganadorId && ganadorId === Number(llave.id_equipo_local)
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-slate-50'
          }`}
        >
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-headline uppercase text-slate-400 mb-0.5">
              Equipo Local
            </label>
            <select
              value={form.id_equipo_local}
              onChange={(e) => handleChange('id_equipo_local', e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-title font-semibold text-slate-800 truncate focus:outline-none focus:border-[#151f89]"
            >
              <option value="">-- Seleccionar --</option>
              {equipos.map((eq) => (
                <option key={eq.id_equipo} value={eq.id_equipo}>
                  {eq.nombre_equipo} {eq.es_argentinos_del_norte ? '(Argentinos)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="w-14 shrink-0">
            <label className="block text-[10px] font-headline uppercase text-slate-400 mb-0.5 text-center">
              Goles
            </label>
            <input
              type="number"
              min="0"
              value={form.goles_local}
              onChange={(e) => handleChange('goles_local', e.target.value)}
              placeholder="-"
              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-center font-headline text-base text-slate-900 focus:outline-none focus:border-[#151f89]"
            />
          </div>
        </div>

        {/* Fila Equipo Visitante */}
        <div
          className={`flex items-center justify-between gap-2 p-1.5 rounded-lg transition-colors ${
            ganadorId && ganadorId === Number(llave.id_equipo_visitante)
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-slate-50'
          }`}
        >
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-headline uppercase text-slate-400 mb-0.5">
              Equipo Visitante
            </label>
            <select
              value={form.id_equipo_visitante}
              onChange={(e) => handleChange('id_equipo_visitante', e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-title font-semibold text-slate-800 truncate focus:outline-none focus:border-[#151f89]"
            >
              <option value="">-- Seleccionar --</option>
              {equipos.map((eq) => (
                <option key={eq.id_equipo} value={eq.id_equipo}>
                  {eq.nombre_equipo} {eq.es_argentinos_del_norte ? '(Argentinos)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="w-14 shrink-0">
            <label className="block text-[10px] font-headline uppercase text-slate-400 mb-0.5 text-center">
              Goles
            </label>
            <input
              type="number"
              min="0"
              value={form.goles_visitante}
              onChange={(e) => handleChange('goles_visitante', e.target.value)}
              placeholder="-"
              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-center font-headline text-base text-slate-900 focus:outline-none focus:border-[#151f89]"
            />
          </div>
        </div>

        {/* Selector de Penales si hay empate */}
        {esEmpate && form.id_equipo_local && form.id_equipo_visitante && (
          <div className="bg-amber-50 border border-amber-300 p-2.5 rounded-lg space-y-2 mt-2">
            <div className="flex items-center gap-1.5 text-amber-900 font-headline text-xs uppercase tracking-wider">
              <FaFutbol className="text-xs" />
              <span>Desempate por Penales</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-title font-bold text-amber-800 uppercase mb-0.5 truncate">
                  Penales Local
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.penales_local}
                  onChange={(e) => handleChange('penales_local', e.target.value)}
                  placeholder="0"
                  className="w-full bg-white border border-amber-300 rounded px-2 py-1 text-center font-headline text-xs"
                />
              </div>

              <div>
                <label className="block text-[9px] font-title font-bold text-amber-800 uppercase mb-0.5 truncate">
                  Penales Vis.
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.penales_visitante}
                  onChange={(e) => handleChange('penales_visitante', e.target.value)}
                  placeholder="0"
                  className="w-full bg-white border border-amber-300 rounded px-2 py-1 text-center font-headline text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-title font-bold text-amber-900 uppercase mb-0.5">
                Ganador que avanza de ronda:
              </label>
              <select
                value={form.id_equipo_ganador}
                onChange={(e) => handleChange('id_equipo_ganador', e.target.value)}
                className="w-full bg-white border border-amber-400 rounded px-2 py-1 text-xs font-title font-bold text-amber-950 focus:outline-none"
              >
                <option value="">-- Seleccionar Ganador --</option>
                {[
                  {
                    id: form.id_equipo_local,
                    nombre: equipos.find((e) => Number(e.id_equipo) === Number(form.id_equipo_local))?.nombre_equipo,
                  },
                  {
                    id: form.id_equipo_visitante,
                    nombre: equipos.find((e) => Number(e.id_equipo) === Number(form.id_equipo_visitante))?.nombre_equipo,
                  },
                ].map(
                  (opt) =>
                    opt.nombre && (
                      <option key={opt.id} value={opt.id}>
                        {opt.nombre}
                      </option>
                    )
                )}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Footer: Botón Guardar / Indicador de avance */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="text-[10px] text-slate-500 font-body truncate">
          {llave.id_llave_siguiente ? (
            <span className="flex items-center gap-1">
              <FaChevronRight className="text-[8px] text-slate-400" />
              <span>Avanza como {llave.es_local_siguiente ? 'Local' : 'Visitante'}</span>
            </span>
          ) : (
            <span className="text-amber-600 font-semibold flex items-center gap-1">
              <FaTrophy className="text-[9px]" />
              <span>Partido Definitorio de Campeón</span>
            </span>
          )}
        </div>

        {haCambiado && (
          <button
            type="button"
            onClick={handleGuardarClick}
            disabled={estaGuardando}
            className="inline-flex items-center gap-1.5 bg-[#151f89] hover:bg-[#303a9f] text-white px-3 py-1.5 rounded-lg font-headline uppercase text-[10px] tracking-wider transition-all shadow-xs"
          >
            <FaSave />
            <span>{estaGuardando ? '...' : 'Guardar'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: DIAGRAMA VISUAL DEL BRACKET (ÁRBOL HORIZONTAL)
// ─────────────────────────────────────────────────────────────────────────────
function DiagramaVisualBracket({ fasesOrdenadas, fasesMap, campeonNombre }) {
  const getGanadorId = (llave) => {
    if (llave.estado_partido !== 2) return null;
    const gl = llave.goles_local;
    const gv = llave.goles_visitante;
    if (gl === null || gv === null) return null;
    if (gl > gv) return Number(llave.id_equipo_local);
    if (gv > gl) return Number(llave.id_equipo_visitante);
    return llave.id_equipo_ganador ? Number(llave.id_equipo_ganador) : null;
  };

  const esPorPenales = (llave) =>
    llave.estado_partido === 2 &&
    llave.goles_local !== null &&
    llave.goles_visitante !== null &&
    llave.goles_local === llave.goles_visitante &&
    llave.id_equipo_ganador != null;

  return (
    <div className="relative overflow-x-auto pb-6">
      {/* Marca de agua del club de fondo */}
      <img
        src="/gemini-svg.svg"
        alt=""
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 opacity-5 pointer-events-none select-none z-0"
      />

      <div className="flex items-stretch min-w-max gap-8 relative z-10 py-4 px-2">
        {fasesOrdenadas.map((faseNombre) => {
          const llavesDeFase = fasesMap[faseNombre].sort(
            (a, b) => a.orden - b.orden
          );

          return (
            <div
              key={faseNombre}
              className="flex flex-col justify-around w-64 sm:w-72 shrink-0 gap-6"
            >
              {/* Encabezado de la columna */}
              <div className="bg-[#151f89] text-white py-2 px-3 rounded-xl text-center shadow-xs">
                <span className="font-headline uppercase tracking-wider text-xs font-bold block">
                  {faseNombre}
                </span>
              </div>

              {/* Partidos de la columna */}
              <div className="flex flex-col justify-around flex-1 gap-6">
                {llavesDeFase.map((llave) => {
                  const ganadorId = getGanadorId(llave);
                  const penales = esPorPenales(llave);
                  const localGano =
                    ganadorId !== null &&
                    ganadorId === Number(llave.id_equipo_local);
                  const visitGano =
                    ganadorId !== null &&
                    ganadorId === Number(llave.id_equipo_visitante);

                  return (
                    <div
                      key={llave.id_llave}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-[#151f89]/60 transition-all group"
                    >
                      {/* Cabecera del box */}
                      <div className="bg-slate-50 px-3 py-1 border-b border-slate-100 flex items-center justify-between text-[10px] font-headline uppercase text-slate-500">
                        <span>Partido {llave.orden}</span>
                        {llave.estado_partido === 2 ? (
                          <span className="text-emerald-700 font-bold">
                            {penales ? 'Penales' : 'Terminado'}
                          </span>
                        ) : (
                          <span className="text-slate-400">Pendiente</span>
                        )}
                      </div>

                      {/* Local */}
                      <div
                        className={`flex items-center justify-between px-3 py-2 border-b border-slate-100 transition-colors ${
                          localGano
                            ? 'bg-emerald-50/80 font-bold text-emerald-950'
                            : 'text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          {llave.local_es_argentinos ? (
                            <ClubShield className="w-5 h-5 shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] shrink-0 font-bold">
                              {llave.equipo_local_nombre?.[0] || 'L'}
                            </div>
                          )}
                          <span className="text-xs truncate font-title">
                            {llave.equipo_local_nombre || 'Por Definir'}
                          </span>
                          {localGano && penales && (
                            <span className="bg-amber-100 text-amber-800 text-[9px] font-headline uppercase px-1 rounded font-bold">
                              PEN
                            </span>
                          )}
                        </div>
                        <span
                          className={`min-w-6 text-center text-xs font-headline px-1.5 py-0.5 rounded ${
                            localGano
                              ? 'bg-emerald-200/80 text-emerald-900 font-bold'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {llave.estado_partido === 2 ? llave.goles_local : '-'}
                        </span>
                      </div>

                      {/* Visitante */}
                      <div
                        className={`flex items-center justify-between px-3 py-2 transition-colors ${
                          visitGano
                            ? 'bg-emerald-50/80 font-bold text-emerald-950'
                            : 'text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          {llave.visitante_es_argentinos ? (
                            <ClubShield className="w-5 h-5 shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] shrink-0 font-bold">
                              {llave.equipo_visitante_nombre?.[0] || 'V'}
                            </div>
                          )}
                          <span className="text-xs truncate font-title">
                            {llave.equipo_visitante_nombre || 'Por Definir'}
                          </span>
                          {visitGano && penales && (
                            <span className="bg-amber-100 text-amber-800 text-[9px] font-headline uppercase px-1 rounded font-bold">
                              PEN
                            </span>
                          )}
                        </div>
                        <span
                          className={`min-w-6 text-center text-xs font-headline px-1.5 py-0.5 rounded ${
                            visitGano
                              ? 'bg-emerald-200/80 text-emerald-900 font-bold'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {llave.estado_partido === 2 ? llave.goles_visitante : '-'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Columna de Trofeo y Campeón */}
        <div className="flex flex-col justify-center items-center w-56 shrink-0 text-center pl-4 border-l border-slate-200/80">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 border-2 border-amber-300 text-amber-600 flex items-center justify-center shadow-md mb-3 animate-pulse">
            <FaTrophy className="text-3xl" />
          </div>
          <span className="font-headline uppercase tracking-widest text-xs text-amber-800 font-bold block">
            CAMPEÓN DEL TORNEO
          </span>
          <h4 className="font-headline text-lg text-slate-900 uppercase tracking-wide mt-1">
            {campeonNombre || 'Por Definir'}
          </h4>
          <span className="text-[11px] text-slate-500 font-title block mt-1">
            {campeonNombre ? '¡Gloria en Futsal AFA!' : 'Aguardando el desenlace de la Final'}
          </span>
        </div>
      </div>
    </div>
  );
}
