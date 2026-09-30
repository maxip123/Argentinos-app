import React, { useState } from 'react';
import api from '../../api/axios';
import PlayoffsManager from './PlayoffsManager';
import {
  FaTrophy,
  FaPlus,
  FaCopy,
  FaCheck,
  FaHistory,
  FaTrash,
  FaEdit,
  FaProjectDiagram,
  FaArrowLeft,
} from 'react-icons/fa';

export default function TorneosManager({ divisiones = [], onActualizar, onSeleccionarTorneo }) {
  const [torneoPlayoff, setTorneoPlayoff] = useState(null);
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [torneoClonando, setTorneoClonando] = useState(null);
  const [torneoEditando, setTorneoEditando] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Formulario nuevo torneo
  const [nuevoTorneo, setNuevoTorneo] = useState({
    nombre_division: '',
    categoria: 'Primera',
    genero: 'Masculino',
    temporada: new Date().getFullYear(),
  });

  // Formulario clonar torneo (Apertura -> Clausura)
  const [formClonar, setFormClonar] = useState({
    nombre_nuevo_torneo: '',
    temporada: new Date().getFullYear(),
    marcar_anterior_finalizado: true,
  });

  const mostrarAviso = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };

  // Crear torneo desde cero
  const handleCrear = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      await api.post('/divisiones', nuevoTorneo);
      mostrarAviso('exito', '¡Torneo creado exitosamente!');
      setMostrarCrear(false);
      setNuevoTorneo({
        nombre_division: '',
        categoria: 'Primera',
        genero: 'Masculino',
        temporada: new Date().getFullYear(),
      });
      onActualizar();
    } catch (err) {
      mostrarAviso('error', 'Error al crear torneo: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setCargando(false);
    }
  };

  // Guardar edición
  const handleEditar = async (e) => {
    e.preventDefault();
    if (!torneoEditando) return;
    setCargando(true);
    try {
      await api.put(`/divisiones/${torneoEditando.id_division}`, {
        nombre_division: torneoEditando.nombre_division,
        categoria: torneoEditando.categoria,
        genero: torneoEditando.genero,
        temporada: Number(torneoEditando.temporada),
        terminado: torneoEditando.terminado,
      });
      mostrarAviso('exito', 'Torneo actualizado correctamente.');
      setTorneoEditando(null);
      onActualizar();
    } catch (err) {
      mostrarAviso('error', 'Error al editar torneo: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setCargando(false);
    }
  };

  // Clonar torneo (Migrar Apertura a Clausura)
  const handleClonar = async (e) => {
    e.preventDefault();
    if (!torneoClonando) return;
    setCargando(true);
    try {
      const res = await api.post(`/divisiones/clonar/${torneoClonando.id_division}`, formClonar);
      mostrarAviso('exito', res.data.mensaje || 'Torneo clonado con éxito. Equipos y jugadores migrados.');
      setTorneoClonando(null);
      onActualizar();
    } catch (err) {
      mostrarAviso('error', 'Error al clonar torneo: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setCargando(false);
    }
  };

  // Eliminar torneo (soft delete)
  const handleEliminar = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el torneo '${nombre}'?`)) return;
    setCargando(true);
    try {
      await api.delete(`/divisiones/${id}`);
      mostrarAviso('exito', 'Torneo eliminado.');
      onActualizar();
    } catch (err) {
      mostrarAviso('error', 'Error al eliminar: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setCargando(false);
    }
  };

  // Si se seleccionó gestionar Playoffs para un torneo específico
  if (torneoPlayoff) {
    return (
      <div className="space-y-4">
        <PlayoffsManager
          divisiones={divisiones}
          divisionInicialId={torneoPlayoff.id_division}
          onVolver={() => setTorneoPlayoff(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado del Módulo */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="font-headline text-2xl uppercase tracking-wide text-slate-900 flex items-center gap-2">
            <FaTrophy className="text-[#151f89]" />
            Gestor de Torneos y Ediciones (Apertura / Clausura)
          </h2>
          <p className="text-xs text-slate-500 font-body">
            Administrá torneos vigentes e históricos de la AFA. Podés clonar un torneo finalizado para iniciar el siguiente período.
          </p>
        </div>

        <button
          onClick={() => {
            setMostrarCrear(!mostrarCrear);
            setTorneoClonando(null);
            setTorneoEditando(null);
          }}
          className="flex items-center gap-2 bg-[#151f89] hover:bg-[#303a9f] text-white px-5 py-2.5 rounded-xl font-headline uppercase text-sm tracking-wider shadow-sm transition-all"
        >
          <FaPlus className="text-xs" />
          <span>Nuevo Torneo</span>
        </button>
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

      {/* Formulario Crear Nuevo Torneo */}
      {mostrarCrear && (
        <div className="bg-white border-2 border-[#151f89]/30 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-headline text-lg uppercase text-[#151f89]">Crear Nuevo Torneo</h3>
          <form onSubmit={handleCrear} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                Nombre del Torneo / Edición
              </label>
              <input
                type="text"
                required
                placeholder="ej. Primera División - Torneo Apertura"
                value={nuevoTorneo.nombre_division}
                onChange={(e) => setNuevoTorneo({ ...nuevoTorneo, nombre_division: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body"
              />
            </div>

            <div>
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">Categoría</label>
              <select
                value={nuevoTorneo.categoria}
                onChange={(e) => setNuevoTorneo({ ...nuevoTorneo, categoria: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-title font-bold"
              >
                <option value="Primera">Primera</option>
                <option value="Reserva">Reserva</option>
                <option value="Sub-17">Sub-17</option>
                <option value="Sub-15">Sub-15</option>
                <option value="Infantiles">Infantiles</option>
                <option value="Senior">Senior</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">Género</label>
              <select
                value={nuevoTorneo.genero}
                onChange={(e) => setNuevoTorneo({ ...nuevoTorneo, genero: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-title font-bold"
              >
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">Temporada (Año)</label>
              <input
                type="number"
                min="2000"
                max="2100"
                value={nuevoTorneo.temporada}
                onChange={(e) => setNuevoTorneo({ ...nuevoTorneo, temporada: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body"
              />
            </div>

            <div className="sm:col-span-3 flex items-end gap-2">
              <button
                type="submit"
                disabled={cargando}
                className="bg-[#151f89] hover:bg-[#303a9f] text-white px-6 py-2.5 rounded-lg font-headline uppercase text-sm"
              >
                {cargando ? 'Guardando...' : 'Crear Torneo'}
              </button>
              <button
                type="button"
                onClick={() => setMostrarCrear(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-title font-bold text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal / Formulario Clonar Torneo (ej. Apertura a Clausura) */}
      {torneoClonando && (
        <div className="bg-amber-50 border-2 border-amber-500 p-6 rounded-2xl shadow-md space-y-4">
          <div className="flex items-center gap-2 text-amber-900 font-headline text-lg uppercase">
            <FaCopy />
            <span>Clonar Torneo: {torneoClonando.nombre_division} ({torneoClonando.temporada})</span>
          </div>
          <p className="text-xs text-amber-800 font-body">
            Esta función creará una nueva edición (por ejemplo, el Torneo Clausura) migrando automáticamente todos los
            equipos y sus planteles de jugadores, <strong>reiniciando sus goles y tarjetas a 0</strong>. El torneo anterior quedará intacto en el historial.
          </p>

          <form onSubmit={handleClonar} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2">
              <label className="block text-xs font-title font-bold text-slate-800 uppercase mb-1">
                Nombre de la Nueva Edición
              </label>
              <input
                type="text"
                required
                value={formClonar.nombre_nuevo_torneo}
                onChange={(e) => setFormClonar({ ...formClonar, nombre_nuevo_torneo: e.target.value })}
                placeholder="ej. Primera División - Torneo Clausura 2026"
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-body"
              />
            </div>

            <div>
              <label className="block text-xs font-title font-bold text-slate-800 uppercase mb-1">Temporada</label>
              <input
                type="number"
                value={formClonar.temporada}
                onChange={(e) => setFormClonar({ ...formClonar, temporada: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-body"
              />
            </div>

            <div className="sm:col-span-3 flex flex-wrap items-center justify-between gap-4 pt-2">
              <label className="flex items-center gap-2 text-xs font-title font-bold text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formClonar.marcar_anterior_finalizado}
                  onChange={(e) => setFormClonar({ ...formClonar, marcar_anterior_finalizado: e.target.checked })}
                  className="rounded text-[#151f89]"
                />
                <span>Marcar el torneo anterior como Finalizado (Archivar en Historial)</span>
              </label>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={cargando}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-lg font-headline uppercase text-sm shadow-sm"
                >
                  {cargando ? 'Migrando...' : 'Confirmar Clonación'}
                </button>
                <button
                  type="button"
                  onClick={() => setTorneoClonando(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2.5 rounded-lg font-title font-bold text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal / Formulario Editar Torneo */}
      {torneoEditando && (
        <div className="bg-blue-50 border-2 border-[#151f89] p-6 rounded-2xl shadow-md space-y-4">
          <h3 className="font-headline text-lg uppercase text-[#151f89]">Editar Torneo</h3>
          <form onSubmit={handleEditar} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div className="sm:col-span-2">
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">Nombre</label>
              <input
                type="text"
                required
                value={torneoEditando.nombre_division}
                onChange={(e) => setTorneoEditando({ ...torneoEditando, nombre_division: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-body"
              />
            </div>

            <div>
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">Estado</label>
              <select
                value={torneoEditando.terminado ? 'true' : 'false'}
                onChange={(e) => setTorneoEditando({ ...torneoEditando, terminado: e.target.value === 'true' })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-title font-bold"
              >
                <option value="false">En Curso (Activo)</option>
                <option value="true">Finalizado (Historial)</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={cargando}
                className="bg-[#151f89] hover:bg-[#303a9f] text-white px-5 py-2.5 rounded-lg font-headline uppercase text-sm"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setTorneoEditando(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2.5 rounded-lg font-title font-bold text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Torneos */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Vista Móvil: Cards */}
        <div className="block md:hidden divide-y divide-slate-100">
          {divisiones.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-title text-xs">No hay torneos registrados.</div>
          ) : (
            divisiones.map((div) => {
              const esFinalizado = div.terminado;
              return (
                <div key={div.id_division} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base leading-tight">
                        {div.nombre_division}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] font-title">
                        <span className="bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-md">
                          {div.categoria}
                        </span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          {div.genero}
                        </span>
                        <span className="bg-slate-100 text-slate-800 font-bold font-mono px-2 py-0.5 rounded-md">
                          {div.temporada}
                        </span>
                      </div>
                    </div>
                    {esFinalizado ? (
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                        <FaHistory className="text-[9px]" />
                        Historial
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                        <FaCheck className="text-[9px]" />
                        En Curso
                      </span>
                    )}
                  </div>

                  <div>
                    <button
                      onClick={() => onSeleccionarTorneo && onSeleccionarTorneo(div.id_division)}
                      className="text-xs text-[#151f89] hover:underline font-semibold inline-block"
                    >
                      Ver equipos y partidos de este torneo →
                    </button>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setTorneoPlayoff(div)}
                      className="flex-1 sm:flex-none bg-[#151f89] hover:bg-[#303a9f] text-white px-3 py-2 rounded-xl text-xs font-headline uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      title="Crear y editar llaves de playoffs / brackets"
                    >
                      <FaProjectDiagram className="text-xs" />
                      <span>Playoffs</span>
                    </button>

                    <button
                      onClick={() => {
                        setTorneoClonando(div);
                        setFormClonar({
                          nombre_nuevo_torneo: div.nombre_division.includes('Apertura')
                            ? div.nombre_division.replace('Apertura', 'Clausura')
                            : `${div.nombre_division} - Edición Siguiente`,
                          temporada: div.temporada,
                          marcar_anterior_finalizado: true,
                        });
                        setTorneoEditando(null);
                        setMostrarCrear(false);
                      }}
                      className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-xl text-xs font-headline uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      title="Clonar edición"
                    >
                      <FaCopy className="text-xs" />
                      <span>Clonar</span>
                    </button>

                    <button
                      onClick={() => {
                        setTorneoEditando(div);
                        setTorneoClonando(null);
                        setMostrarCrear(false);
                      }}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-headline transition-colors"
                      title="Editar torneo"
                    >
                      <FaEdit />
                    </button>

                    <button
                      onClick={() => handleEliminar(div.id_division, div.nombre_division)}
                      className="p-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-headline transition-colors"
                      title="Eliminar torneo"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Vista Desktop: Tabla */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-headline text-xs text-slate-600 uppercase">
                <th className="p-3.5">Torneo / Edición</th>
                <th className="p-3.5">Categoría</th>
                <th className="p-3.5">Género</th>
                <th className="p-3.5 text-center">Temporada</th>
                <th className="p-3.5 text-center">Estado</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-title">
              {divisiones.map((div) => {
                const esFinalizado = div.terminado;

                return (
                  <tr key={div.id_division} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <span className="font-bold text-slate-900 block text-base">{div.nombre_division}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => onSeleccionarTorneo && onSeleccionarTorneo(div.id_division)}
                          className="text-xs text-[#151f89] hover:underline font-semibold"
                        >
                          Equipos y partidos →
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          onClick={() => setTorneoPlayoff(div)}
                          className="text-xs text-indigo-700 hover:underline font-semibold flex items-center gap-1"
                        >
                          <FaProjectDiagram className="text-[10px]" /> Bracket y Playoffs →
                        </button>
                      </div>
                    </td>

                    <td className="p-3.5 font-bold text-slate-700">{div.categoria}</td>
                    <td className="p-3.5 text-slate-600">{div.genero}</td>
                    <td className="p-3.5 text-center font-bold text-slate-800">{div.temporada}</td>

                    <td className="p-3.5 text-center">
                      {esFinalizado ? (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                          <FaHistory className="text-[10px]" />
                          Historial
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                          <FaCheck className="text-[10px]" />
                          En Curso
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setTorneoPlayoff(div)}
                          className="bg-[#151f89] hover:bg-[#303a9f] text-white px-3 py-1.5 rounded-lg text-xs font-headline uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-colors"
                          title="Crear y editar llaves eliminatorias y cuadro de playoffs de este torneo"
                        >
                          <FaProjectDiagram className="text-xs" />
                          <span>Playoffs</span>
                        </button>

                        <button
                          onClick={() => {
                            setTorneoClonando(div);
                            setFormClonar({
                              nombre_nuevo_torneo: div.nombre_division.includes('Apertura')
                                ? div.nombre_division.replace('Apertura', 'Clausura')
                                : `${div.nombre_division} - Edición Siguiente`,
                              temporada: div.temporada,
                              marcar_anterior_finalizado: true,
                            });
                            setTorneoEditando(null);
                            setMostrarCrear(false);
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-headline uppercase tracking-wider flex items-center gap-1 shadow-xs"
                          title="Clonar equipos y planteles para un nuevo torneo (ej. Apertura a Clausura)"
                        >
                          <FaCopy className="text-xs" />
                          <span>Clonar</span>
                        </button>

                        <button
                          onClick={() => {
                            setTorneoEditando(div);
                            setTorneoClonando(null);
                            setMostrarCrear(false);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-headline uppercase"
                          title="Editar torneo"
                        >
                          <FaEdit />
                        </button>

                        <button
                          onClick={() => handleEliminar(div.id_division, div.nombre_division)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 px-2.5 py-1.5 rounded-lg text-xs font-headline uppercase"
                          title="Eliminar torneo"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
