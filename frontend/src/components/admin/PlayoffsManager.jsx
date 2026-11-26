import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import EscudoEquipo from '../ui/EscudoEquipo';
import {
  ETIQUETA_COPA,
  agruparPorFase,
  campeonDeLlaves,
  copasDe,
  ganadorDeLlave,
  FORMATOS_CRUCE,
  resumenCruce,
  nombrePartidoCruce,
} from '../../utils/playoffs';
import { formatFecha, desdeInputFechaHora } from '../../utils/fechas';
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
} from 'react-icons/fa';

export default function PlayoffsManager({
  divisiones = [],
  divisionInicialId = '',
  onVolver,
}) {
  const [divisionSel, setDivisionSel] = useState(
    divisionInicialId || (divisiones[0]?.id_division || '')
  );
  const [todasLasLlaves, setTodasLasLlaves] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardandoId, setGuardandoId] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [cantidadEquipos, setCantidadEquipos] = useState(8);
  const [dosCopas, setDosCopas] = useState(false);
  const [cantidadSegundaCopa, setCantidadSegundaCopa] = useState(4);
  const [copaElegida, setCopaElegida] = useState(null);
  const [vistaActiva, setVistaActiva] = useState('editor'); // 'editor' | 'diagrama'
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [modalReiniciar, setModalReiniciar] = useState(false);
  const [formatos, setFormatos] = useState({}); // { 'Semifinal': 'ida_vuelta', ... } al generar
  const [sedes, setSedes] = useState([]);
  const [programando, setProgramando] = useState(null); // { llave, numeroJuego }
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
      const [resLlaves, resEquipos, resSedes] = await Promise.all([
        api.get(`/playoff/${divisionSel}`),
        api.get(`/equipos?id_division=${divisionSel}`),
        api.get('/sedes'),
      ]);
      setTodasLasLlaves(resLlaves.data.data || []);
      setEquipos(resEquipos.data.data || []);
      setSedes(resSedes.data.data || []);
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

  // Copa que se está viendo: las acciones del panel actúan solo sobre ella
  const copas = copasDe(todasLasLlaves);
  const copaActiva = copas.includes(copaElegida) ? copaElegida : copas[0];
  const llaves = todasLasLlaves.filter((l) => l.copa === copaActiva);
  const hayCopas = copas.length > 0 && copaActiva !== 'Unica';
  const copaFaltante = hayCopas && copas.length === 1 ? (copaActiva === 'Oro' ? 'Plata' : 'Oro') : null;

  // Generar uno o más cuadros, uno por copa
  const generarCuadros = async (cuadros) => {
    setGenerando(true);
    try {
      for (const { copa, cantidad } of cuadros) {
        await api.post('/playoff/generar', {
          id_division: Number(divisionSel),
          cantidad_equipos: parseInt(cantidad, 10),
          copa,
          formatos,
        });
      }
      mostrarAviso('exito', cuadros.length > 1 ? '¡Copa Oro y Copa Plata generadas con éxito!' : '¡Cuadro de playoff generado con éxito!');
      setCopaElegida(cuadros[0].copa);
    } catch (err) {
      mostrarAviso('error', err.response?.data?.mensaje || 'Error al generar el cuadro.');
    } finally {
      await cargarDatos(false);
      setGenerando(false);
    }
  };

  const handleGenerarBracket = () =>
    generarCuadros(
      dosCopas
        ? [
            { copa: 'Oro', cantidad: cantidadEquipos },
            { copa: 'Plata', cantidad: cantidadSegundaCopa },
          ]
        : [{ copa: 'Unica', cantidad: cantidadEquipos }]
    );

  // Reiniciar Bracket (eliminar las llaves de la copa activa)
  const handleReiniciarBracket = async () => {
    setReiniciando(true);
    try {
      await api.delete(`/playoff/division/${divisionSel}?copa=${copaActiva}`);
      mostrarAviso('exito', hayCopas ? `${ETIQUETA_COPA[copaActiva]} reiniciada correctamente.` : 'Cuadro de playoff reiniciado correctamente.');
      setModalReiniciar(false);
      await cargarDatos(false);
    } catch (err) {
      mostrarAviso('error', err.response?.data?.mensaje || 'Error al reiniciar el cuadro.');
    } finally {
      setReiniciando(false);
    }
  };

  // Guardar equipos y formato de un cruce (el resultado sale de sus partidos)
  const handleGuardarLlaveCompleta = async (llaveEditada) => {
    setGuardandoId(llaveEditada.id_llave);
    try {
      await api.put(`/playoff/${llaveEditada.id_llave}`, {
        id_equipo_local: llaveEditada.id_equipo_local || null,
        id_equipo_visitante: llaveEditada.id_equipo_visitante || null,
        formato: llaveEditada.formato,
      });
      mostrarAviso('exito', 'Cruce actualizado.');
      await cargarDatos(false);
    } catch (err) {
      mostrarAviso('error', err.response?.data?.mensaje || 'Error al guardar los cambios.');
    } finally {
      setGuardandoId(null);
    }
  };

  const { fasesMap, fasesOrdenadas } = agruparPorFase(llaves);

  const divisionActual = divisiones.find(
    (d) => Number(d.id_division) === Number(divisionSel)
  );

  // Estadísticas del bracket
  const totalPartidos = llaves.length;
  const partidosFinalizados = llaves.filter((l) => l.estado_partido === 2).length;
  const campeonNombre = campeonDeLlaves(llaves)?.nombre ?? null;
  const etiquetaCampeon = hayCopas ? `Campeón ${ETIQUETA_COPA[copaActiva]}` : 'Campeón';

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
              <span>Reiniciar {hayCopas ? ETIQUETA_COPA[copaActiva] : 'Bracket'}</span>
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

          {/* Una copa o Copa Oro y Plata */}
          <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl max-w-full">
            {[
              { valor: false, titulo: 'Una copa' },
              { valor: true, titulo: 'Copa Oro y Plata' },
            ].map((opc) => (
              <button
                key={opc.titulo}
                type="button"
                onClick={() => setDosCopas(opc.valor)}
                className={`px-4 py-2 rounded-lg font-headline text-xs uppercase tracking-wider transition-all ${
                  dosCopas === opc.valor
                    ? 'bg-white text-[#151f89] shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opc.titulo}
              </button>
            ))}
          </div>

          {dosCopas && (
            <p className="font-headline text-xs uppercase tracking-wider text-slate-500 text-left">
              Equipos en Copa Oro
            </p>
          )}

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

          {dosCopas && (
            <SelectorCantidad
              etiqueta="Equipos en Copa Plata"
              value={cantidadSegundaCopa}
              onChange={setCantidadSegundaCopa}
            />
          )}

          {/* Formato de cada ronda: partido único o ida y vuelta */}
          <div className="text-left space-y-2">
            <p className="font-headline text-xs uppercase tracking-wider text-slate-500">Formato de cada ronda</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {fasesParaCantidad(Math.max(cantidadEquipos, dosCopas ? cantidadSegundaCopa : 0)).map((fase) => (
                <label key={fase} className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <span className="font-title text-xs font-bold text-slate-700">{fase}</span>
                  <select
                    value={formatos[fase] || 'unico'}
                    onChange={(e) => setFormatos((prev) => ({ ...prev, [fase]: e.target.value }))}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-title focus:outline-none focus:border-[#151f89]"
                  >
                    {FORMATOS_CRUCE.map((f) => <option key={f.valor} value={f.valor}>{f.etiqueta}</option>)}
                  </select>
                </label>
              ))}
            </div>
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
                  <span>
                    {dosCopas
                      ? `Generar Copa Oro (${cantidadEquipos}) y Copa Plata (${cantidadSegundaCopa})`
                      : `Generar Cuadro de Playoff (${cantidadEquipos} Equipos)`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* ─── ESTADO ACTIVO: BRACKET GENERADO ────────────────────────────── */
        <div className="space-y-6">
          {/* Selector de Copa y alta de la copa que falta */}
          {hayCopas && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {copas.map((copa) => (
                  <button
                    key={copa}
                    type="button"
                    onClick={() => setCopaElegida(copa)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-headline text-xs uppercase tracking-wider transition-all ${
                      copa === copaActiva
                        ? 'bg-white text-[#151f89] shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FaTrophy className={copa === 'Oro' ? 'text-amber-500' : 'text-slate-400'} />
                    <span>{ETIQUETA_COPA[copa]}</span>
                  </button>
                ))}
              </div>

              {copaFaltante && (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <SelectorCantidad
                    etiqueta={`Equipos en ${ETIQUETA_COPA[copaFaltante]}`}
                    value={cantidadSegundaCopa}
                    onChange={setCantidadSegundaCopa}
                  />
                  <button
                    type="button"
                    disabled={generando}
                    onClick={() => generarCuadros([{ copa: copaFaltante, cantidad: cantidadSegundaCopa }])}
                    className="inline-flex items-center justify-center gap-2 bg-[#151f89] hover:bg-[#303a9f] text-white px-4 py-2.5 rounded-xl font-headline uppercase tracking-wider text-xs shadow-md transition-all disabled:opacity-50"
                  >
                    <FaProjectDiagram />
                    <span>{generando ? 'Generando...' : `Agregar ${ETIQUETA_COPA[copaFaltante]}`}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Barra de Estadísticas y Selector de Vistas */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-headline text-xs uppercase tracking-wider bg-blue-50 text-[#151f89] px-3 py-1.5 rounded-lg border border-blue-100">
                {fasesOrdenadas.length} Fases
              </span>
              <span className="font-headline text-xs uppercase tracking-wider bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg">
                {partidosFinalizados} / {totalPartidos} Cruces definidos
              </span>
              {campeonNombre && (
                <span className="font-headline text-xs uppercase tracking-wider bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center gap-1.5">
                  <FaTrophy className="text-amber-600" />
                  <span>{etiquetaCampeon}: {campeonNombre}</span>
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
                          onProgramar={(llaveSel, numeroJuego) => setProgramando({ llave: llaveSel, numeroJuego })}
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
                tituloCampeon={hayCopas ? `CAMPEÓN ${ETIQUETA_COPA[copaActiva]}` : 'CAMPEÓN DEL TORNEO'}
              />
            </div>
          )}
        </div>
      )}

      {programando && (
        <ProgramarPartidoCruceModal
          llave={programando.llave}
          numeroJuego={programando.numeroJuego}
          sedes={sedes}
          onClose={() => setProgramando(null)}
          onCreado={async (texto) => {
            setProgramando(null);
            mostrarAviso('exito', texto);
            await cargarDatos(false);
          }}
        />
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
                ¿Reiniciar {hayCopas ? ETIQUETA_COPA[copaActiva] : 'Cuadro de Playoff'}?
              </h4>
              <p className="text-xs text-slate-500 font-body">
                Esta acción eliminará todas las llaves, cruces y sus partidos (con goles y tarjetas) {hayCopas ? `de ${ETIQUETA_COPA[copaActiva]} ` : ''}para{' '}
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

// Rondas que tiene un cuadro de N equipos, de la primera a la final
const FASES_DESDE = { 32: '16avos de Final', 16: 'Octavos de Final', 8: 'Cuartos de Final', 4: 'Semifinal', 2: 'Final' };
function fasesParaCantidad(cantidad) {
  const fases = [];
  for (let n = cantidad; n >= 2; n /= 2) if (FASES_DESDE[n]) fases.push(FASES_DESDE[n]);
  return fases;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: SELECTOR DE CANTIDAD DE EQUIPOS DE UNA COPA
// ─────────────────────────────────────────────────────────────────────────────
function SelectorCantidad({ etiqueta, value, onChange }) {
  return (
    <label className="flex items-center justify-center gap-3 text-xs font-title font-semibold text-slate-600">
      <span>{etiqueta}:</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-headline text-sm text-slate-900 focus:outline-none focus:border-[#151f89]"
      >
        {[2, 4, 8, 16, 32].map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: TARJETA DE UN CRUCE (EDITOR)
// Los equipos y el formato se editan mientras el cruce no tenga partidos.
// El resultado sale de sus partidos, que se programan desde acá y se cargan en Partidos.
// ─────────────────────────────────────────────────────────────────────────────
function LlavePartidoCard({ llave, numeroPartido, equipos, estaGuardando, onGuardar, onProgramar }) {
  const inicial = () => ({
    id_equipo_local: llave.id_equipo_local || '',
    id_equipo_visitante: llave.id_equipo_visitante || '',
    formato: llave.formato || 'unico',
  });
  const [form, setForm] = useState(inicial);
  const [haCambiado, setHaCambiado] = useState(false);

  useEffect(() => {
    setForm(inicial());
    setHaCambiado(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [llave]);

  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setHaCambiado(true);
  };

  const resumen = resumenCruce(llave);
  const partidos = llave.partidos || [];
  const bloqueado = partidos.length > 0;
  const definido = llave.estado_partido === 2;
  const ganadorId = definido && llave.id_equipo_ganador ? Number(llave.id_equipo_ganador) : null;
  const tieneEquipos = llave.id_equipo_local && llave.id_equipo_visitante;
  const juegos = partidos.map((p) => Number(p.numero_juego));
  const faltante = !tieneEquipos
    ? null
    : llave.formato === 'ida_vuelta'
      ? (!juegos.includes(1) ? 1 : !juegos.includes(2) ? 2 : null)
      : (!juegos.includes(1) ? 1 : null);
  const textoBoton = llave.formato === 'ida_vuelta'
    ? (faltante === 1 ? 'Programar ida' : 'Programar vuelta')
    : 'Programar partido';

  const filaEquipo = (campo, etiqueta, golesGlobal) => {
    const idEquipo = Number(llave[campo]);
    return (
      <div className={`flex items-center justify-between gap-2 p-1.5 rounded-lg ${ganadorId && ganadorId === idEquipo ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'}`}>
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] font-headline uppercase text-slate-400 mb-0.5">{etiqueta}</label>
          <select
            value={form[campo]}
            disabled={bloqueado}
            onChange={(e) => handleChange(campo, e.target.value)}
            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-title font-semibold text-slate-800 truncate focus:outline-none focus:border-[#151f89] disabled:bg-slate-100 disabled:text-slate-600"
          >
            <option value="">-- Seleccionar --</option>
            {equipos.map((eq) => (
              <option key={eq.id_equipo} value={eq.id_equipo}>
                {eq.nombre_equipo} {eq.es_argentinos_del_norte ? '(Argentinos)' : ''}
              </option>
            ))}
          </select>
        </div>
        <span className="w-10 shrink-0 text-center font-headline text-base text-slate-900">
          {golesGlobal ?? '-'}
        </span>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-xl border-2 transition-all p-4 flex flex-col justify-between gap-3 shadow-xs ${definido ? 'border-emerald-300 bg-emerald-50/15' : 'border-slate-200 hover:border-slate-300'}`}>
      {/* Encabezado: número, formato y estado */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <span className="font-headline text-xs uppercase tracking-wider text-slate-500">Partido {numeroPartido}</span>
        <div className="flex items-center gap-1.5">
          <select
            value={form.formato}
            disabled={bloqueado}
            onChange={(e) => handleChange('formato', e.target.value)}
            title={bloqueado ? 'El formato no se puede cambiar: el cruce ya tiene partidos' : 'Formato del cruce'}
            className="bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-[10px] font-headline uppercase text-slate-700 focus:outline-none disabled:opacity-70"
          >
            {FORMATOS_CRUCE.map((f) => <option key={f.valor} value={f.valor}>{f.etiqueta}</option>)}
          </select>
          <span className={`text-[10px] font-headline uppercase px-2 py-0.5 rounded font-bold ${definido ? 'bg-emerald-100 text-emerald-800' : llave.estado_partido === 1 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
            {definido ? 'Definido' : llave.estado_partido === 1 ? 'En juego' : 'Pendiente'}
          </span>
        </div>
      </div>

      {/* Equipos con el global del cruce */}
      <div className="space-y-2">
        {filaEquipo('id_equipo_local', 'Equipo local (mejor ubicado)', resumen.global?.local)}
        {filaEquipo('id_equipo_visitante', 'Equipo visitante', resumen.global?.visitante)}
      </div>

      {/* Partidos del cruce */}
      {resumen.partidos.length > 0 && (
        <ul className="space-y-1">
          {resumen.partidos.map((p) => (
            <li key={p.id_partido} className="flex items-center justify-between gap-2 text-[11px] bg-slate-50 rounded-lg px-2.5 py-1.5 font-title">
              <span className="font-bold text-slate-600">{p.etiqueta || 'Partido'}</span>
              <span className="text-slate-700 truncate">
                {p.jugado ? `${p.local} - ${p.visitante}` : `${formatFecha(p.fecha_partido)} · ${p.nombre_sede || ''}`}
              </span>
            </li>
          ))}
        </ul>
      )}
      {resumen.desempate && (
        <p className="text-[11px] font-title font-bold text-amber-800">{resumen.desempate}</p>
      )}

      {/* Acciones */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] text-slate-500 font-body truncate">
            {llave.id_llave_siguiente ? (
              <span className="flex items-center gap-1">
                <FaChevronRight className="text-[8px] text-slate-400" />
                <span>Avanza como {llave.es_local_siguiente ? 'Local' : 'Visitante'}</span>
              </span>
            ) : (
              <span className="text-amber-600 font-semibold flex items-center gap-1">
                <FaTrophy className="text-[9px]" />
                <span>Cruce definitorio del campeón</span>
              </span>
            )}
          </div>
          {haCambiado && (
            <button
              type="button"
              onClick={() => onGuardar({ ...llave, ...form })}
              disabled={estaGuardando}
              className="inline-flex items-center gap-1.5 bg-[#151f89] hover:bg-[#303a9f] text-white px-3 py-1.5 rounded-lg font-headline uppercase text-[10px] tracking-wider transition-all shadow-xs"
            >
              <FaSave />
              <span>{estaGuardando ? '...' : 'Guardar'}</span>
            </button>
          )}
        </div>
        {faltante && !haCambiado && (
          <button
            type="button"
            onClick={() => onProgramar(llave, faltante)}
            className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-black text-white px-3 py-2 rounded-lg font-headline uppercase text-[11px] tracking-wider transition-colors"
          >
            <FaCalendarCheck />
            <span>{textoBoton}</span>
          </button>
        )}
        {bloqueado && (
          <p className="text-[10px] text-slate-500 font-body">El resultado se carga en Partidos.</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: PROGRAMAR UN PARTIDO DE UN CRUCE (ida, vuelta o partido único)
// Localía propuesta: en la ida juega de local el visitante del cruce; en la vuelta
// y en el partido único, el local del cruce (el mejor ubicado). Se puede invertir.
// ─────────────────────────────────────────────────────────────────────────────
function ProgramarPartidoCruceModal({ llave, numeroJuego, sedes, onClose, onCreado }) {
  const deCruce = [
    { id: Number(llave.id_equipo_local), nombre: llave.equipo_local_nombre },
    { id: Number(llave.id_equipo_visitante), nombre: llave.equipo_visitante_nombre },
  ];
  const propuesta = llave.formato === 'ida_vuelta' && numeroJuego === 1 ? [deCruce[1], deCruce[0]] : deCruce;
  const [orden, setOrden] = useState(propuesta);
  const [idSede, setIdSede] = useState(sedes[0]?.id_sede ? String(sedes[0].id_sede) : '');
  const [fecha, setFecha] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const nombre = nombrePartidoCruce(llave.fase, llave.formato, numeroJuego);

  const guardar = async (e) => {
    e.preventDefault();
    if (!idSede || !fecha) return setError('Elegí la sede y la fecha y hora.');
    setGuardando(true);
    setError('');
    try {
      await api.post('/partidos', {
        id_division: Number(llave.id_division),
        id_sede: Number(idSede),
        fecha_partido: desdeInputFechaHora(fecha),
        id_equipo_local: orden[0].id,
        id_equipo_visitante: orden[1].id,
        id_llave: Number(llave.id_llave),
        numero_juego: numeroJuego,
        nombre_partido: nombre,
      });
      onCreado(`${nombre} programado. El resultado se carga en Partidos.`);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'No se pudo programar el partido.');
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <form onSubmit={guardar} className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl border border-slate-200">
        <div>
          <span className="text-[10px] font-headline uppercase tracking-widest text-slate-500">Programar partido del cruce</span>
          <h4 className="font-headline text-xl uppercase tracking-wide text-slate-900">{nombre}</h4>
        </div>
        {error && (
          <div className="bg-red-50 text-red-700 text-xs p-2.5 rounded-lg border border-red-200 flex items-center gap-2">
            <FaExclamationTriangle className="shrink-0" /> {error}
          </div>
        )}
        <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
          <div className="flex-1 min-w-0 text-xs font-title">
            <span className="block text-[10px] font-headline uppercase text-slate-400">Local</span>
            <span className="block font-bold text-slate-900 truncate">{orden[0].nombre}</span>
          </div>
          <button
            type="button"
            onClick={() => setOrden([orden[1], orden[0]])}
            className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-[10px] font-headline uppercase text-slate-700"
          >
            Invertir localía
          </button>
          <div className="flex-1 min-w-0 text-xs font-title text-right">
            <span className="block text-[10px] font-headline uppercase text-slate-400">Visitante</span>
            <span className="block font-bold text-slate-900 truncate">{orden[1].nombre}</span>
          </div>
        </div>
        <label className="block">
          <span className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Sede *</span>
          <select value={idSede} onChange={(e) => setIdSede(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none">
            <option value="">-- Elegir sede --</option>
            {sedes.map((s) => <option key={s.id_sede} value={s.id_sede}>{s.nombre_sede}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Fecha y hora *</span>
          <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none" />
        </label>
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={guardando} className="flex-1 bg-[#151f89] hover:bg-[#303a9f] text-white py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider transition-colors disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Programar'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-title font-bold text-xs uppercase transition-colors">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: DIAGRAMA VISUAL DEL BRACKET (ÁRBOL HORIZONTAL)
// ─────────────────────────────────────────────────────────────────────────────
function DiagramaVisualBracket({ fasesOrdenadas, fasesMap, campeonNombre, tituloCampeon }) {
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
                  const ganadorId = ganadorDeLlave(llave);
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
                          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            <EscudoEquipo
                              logoUrl={llave.logo_local}
                              esClub={llave.local_es_argentinos}
                              nombre={llave.equipo_local_nombre || 'Por Definir'}
                              nombreCorto={llave.nombre_corto_local}
                              letras={1}
                              textoClassName="text-[10px] font-bold text-slate-500 leading-none"
                            />
                          </div>
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
                          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            <EscudoEquipo
                              logoUrl={llave.logo_visitante}
                              esClub={llave.visitante_es_argentinos}
                              nombre={llave.equipo_visitante_nombre || 'Por Definir'}
                              nombreCorto={llave.nombre_corto_visitante}
                              letras={1}
                              textoClassName="text-[10px] font-bold text-slate-500 leading-none"
                            />
                          </div>
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
            {tituloCampeon}
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
