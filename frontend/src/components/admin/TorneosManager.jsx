import React, { useState } from 'react';
import api from '../../api/axios';
import PlayoffsManager from './PlayoffsManager';
import {
  FaTrophy,
  FaPlus,
  FaCheck,
  FaHistory,
  FaTrash,
  FaEdit,
  FaProjectDiagram,
  FaArrowLeft,
  FaArchive,
  FaCheckCircle,
} from 'react-icons/fa';

export default function TorneosManager({ divisiones = [], onActualizar, onSeleccionarTorneo }) {
  const [torneoPlayoff, setTorneoPlayoff] = useState(null);
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [torneoEditando, setTorneoEditando] = useState(null);
  const [torneoArchivando, setTorneoArchivando] = useState(null);
  const [equiposDivision, setEquiposDivision] = useState([]);
  const [cargandoEquiposDiv, setCargandoEquiposDiv] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Formulario finalizar y archivar torneo (Modelo Snapshot sin duplicar planteles)
  const [formArchivar, setFormArchivar] = useState({
    nombre_torneo: '',
    temporada: new Date().getFullYear(),
    id_equipo_campeon: '',
    nombre_siguiente_torneo: '',
    nueva_temporada: new Date().getFullYear(),
    observaciones: '',
  });

  // Formulario nuevo torneo
  const [nuevoTorneo, setNuevoTorneo] = useState({
    nombre_division: '',
    categoria: 'Primera',
    genero: 'Masculino',
    temporada: new Date().getFullYear(),
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

  // Iniciar flujo de finalizar y archivar torneo (Snapshot)
  const iniciarArchivarTorneo = async (div) => {
    setTorneoArchivando(div);
    setTorneoEditando(null);
    setMostrarCrear(false);
    setFormArchivar({
      nombre_torneo: div.nombre_division,
      temporada: div.temporada,
      id_equipo_campeon: '',
      nombre_siguiente_torneo: div.nombre_division.includes('Apertura')
        ? div.nombre_division.replace('Apertura', 'Clausura')
        : `${div.nombre_division} - Siguiente Edición`,
      nueva_temporada: div.temporada,
      observaciones: '',
    });

    setCargandoEquiposDiv(true);
    try {
      const res = await api.get(`/equipos?id_division=${div.id_division}`);
      setEquiposDivision(res.data.data || []);
    } catch (err) {
      console.error('Error al cargar equipos de la división:', err);
      setEquiposDivision([]);
    } finally {
      setCargandoEquiposDiv(false);
    }
  };

  // Confirmar y archivar torneo
  const handleArchivar = async (e) => {
    e.preventDefault();
    if (!torneoArchivando) return;
    setCargando(true);
    try {
      const res = await api.post(`/divisiones/finalizar-y-archivar/${torneoArchivando.id_division}`, {
        nombre_torneo: formArchivar.nombre_torneo,
        temporada: Number(formArchivar.temporada),
        id_equipo_campeon: formArchivar.id_equipo_campeon ? Number(formArchivar.id_equipo_campeon) : null,
        nombre_siguiente_torneo: formArchivar.nombre_siguiente_torneo,
        nueva_temporada: Number(formArchivar.nueva_temporada),
        observaciones: formArchivar.observaciones,
      });
      mostrarAviso('exito', res.data.mensaje || '¡Torneo finalizado y archivado con éxito!');
      setTorneoArchivando(null);
      onActualizar();
    } catch (err) {
      mostrarAviso('error', 'Error al finalizar y archivar: ' + (err.response?.data?.mensaje || err.message));
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
            Administrá torneos vigentes e históricos de la AFA. Al finalizar un torneo se archiva el snapshot y se resetean las posiciones sin alterar planteles.
          </p>
        </div>

        <button
          onClick={() => {
            setMostrarCrear(!mostrarCrear);
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

      {/* Modal / Formulario Finalizar y Archivar Torneo (Snapshot del Torneo) */}
      {torneoArchivando && (
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-white border-2 border-emerald-600 p-6 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center gap-2 text-emerald-950 font-headline text-lg uppercase">
            <FaArchive className="text-emerald-700 text-xl" />
            <span>Finalizar y Archivar Edición: {torneoArchivando.nombre_division} ({torneoArchivando.temporada})</span>
          </div>

          <div className="bg-emerald-100/70 border border-emerald-300 p-3.5 rounded-xl text-xs text-emerald-900 font-body leading-relaxed space-y-1">
            <p>
              <strong>¿Cómo funciona el archivado?</strong> Se guardará una instantánea histórica permanente con la
              <strong> tabla final de posiciones, fixture con resultados, playoffs, goleadores y tarjetas de Argentinos del Norte</strong>.
            </p>
            <p>
              ✅ <strong>Los equipos y jugadores permanecerán intactos</strong> en esta división, sin duplicaciones innecesarias ni desasignaciones.
            </p>
            <p>
              🔄 La tabla de posiciones se restablecerá automáticamente a 0 puntos para comenzar la siguiente edición inmediatamente.
            </p>
          </div>

          <form onSubmit={handleArchivar} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-title font-bold text-slate-800 uppercase mb-1">
                  Nombre del Torneo a Archivar en Historial
                </label>
                <input
                  type="text"
                  required
                  value={formArchivar.nombre_torneo}
                  onChange={(e) => setFormArchivar({ ...formArchivar, nombre_torneo: e.target.value })}
                  placeholder="ej. Primera División - Torneo Apertura 2026"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-body"
                />
              </div>

              <div>
                <label className="block text-xs font-title font-bold text-slate-800 uppercase mb-1">
                  Temporada Finalizada
                </label>
                <input
                  type="number"
                  required
                  value={formArchivar.temporada}
                  onChange={(e) => setFormArchivar({ ...formArchivar, temporada: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-body"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-title font-bold text-slate-800 uppercase mb-1">
                  Equipo Campeón Consagrado
                </label>
                <select
                  value={formArchivar.id_equipo_campeon}
                  onChange={(e) => setFormArchivar({ ...formArchivar, id_equipo_campeon: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-title font-bold text-slate-800"
                >
                  <option value="">🏆 Autodetectar (Ganador de Final de Playoff o 1° de Tabla)</option>
                  {equiposDivision.map((eq) => (
                    <option key={eq.id_equipo} value={eq.id_equipo}>
                      {eq.nombre_equipo} {eq.es_argentinos_del_norte ? '⭐ (Argentinos del Norte)' : ''}
                    </option>
                  ))}
                </select>
                {cargandoEquiposDiv && (
                  <span className="text-[11px] text-slate-500 font-title mt-1 block">Cargando equipos de la división...</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-title font-bold text-slate-800 uppercase mb-1">
                  Temporada Siguiente Edición
                </label>
                <input
                  type="number"
                  required
                  value={formArchivar.nueva_temporada}
                  onChange={(e) => setFormArchivar({ ...formArchivar, nueva_temporada: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-body"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-title font-bold text-slate-800 uppercase mb-1">
                  Nombre de la Nueva Edición a Iniciar
                </label>
                <input
                  type="text"
                  required
                  value={formArchivar.nombre_siguiente_torneo}
                  onChange={(e) => setFormArchivar({ ...formArchivar, nombre_siguiente_torneo: e.target.value })}
                  placeholder="ej. Primera División - Torneo Clausura 2026"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-body"
                />
              </div>

              <div>
                <label className="block text-xs font-title font-bold text-slate-800 uppercase mb-1">
                  Observaciones / Notas (Opcional)
                </label>
                <input
                  type="text"
                  value={formArchivar.observaciones}
                  onChange={(e) => setFormArchivar({ ...formArchivar, observaciones: e.target.value })}
                  placeholder="ej. Final disputada en cancha de Argentinos"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-body"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-emerald-200">
              <button
                type="button"
                onClick={() => setTorneoArchivando(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2.5 rounded-lg font-title font-bold text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={cargando}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-headline uppercase text-sm shadow-md flex items-center gap-2"
              >
                <FaArchive />
                <span>{cargando ? 'Archivando y reseteando...' : 'Finalizar y Guardar en Historial'}</span>
              </button>
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

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 flex-wrap">
                    <button
                      onClick={() => iniciarArchivarTorneo(div)}
                      className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-headline uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      title="Finalizar esta edición y archivar en el historial guardando tabla, resultados, goleadores y tarjetas"
                    >
                      <FaArchive className="text-xs" />
                      <span>Finalizar</span>
                    </button>

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
                        setTorneoEditando(div);
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
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          onClick={() => iniciarArchivarTorneo(div)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-headline uppercase tracking-wider flex items-center gap-1 shadow-xs transition-colors"
                          title="Finalizar edición y guardar snapshot histórico completo sin alterar planteles"
                        >
                          <FaArchive className="text-xs" />
                          <span>Finalizar</span>
                        </button>

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
                            setTorneoEditando(div);
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
