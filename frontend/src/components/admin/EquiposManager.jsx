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
} from 'react-icons/fa';

export default function EquiposManager({
  divisiones = [],
  divisionInicialId = '',
  onVerJugadoresEquipo,
}) {
  const [divisionSel, setDivisionSel] = useState(divisionInicialId || (divisiones[0]?.id_division || ''));
  const [equipos, setEquipos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Modales
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [equipoEditando, setEquipoEditando] = useState(null);

  // Formulario nuevo equipo
  const [nuevoEquipo, setNuevoEquipo] = useState({
    nombre_equipo: '',
    nombre_corto: '',
    logo_url: '',
    es_argentinos_del_norte: false,
  });

  // Sincronizar división seleccionada si cambia el prop
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

  // Guardar Edición
  const handleEditar = async (e) => {
    e.preventDefault();
    if (!equipoEditando) return;
    setCargando(true);
    try {
      await api.put(`/equipos/${equipoEditando.id_equipo}`, {
        nombre_equipo: equipoEditando.nombre_equipo.trim(),
        nombre_corto: equipoEditando.nombre_corto?.trim() || null,
        logo_url: equipoEditando.es_argentinos_del_norte
          ? '/gemini-svg.svg'
          : (equipoEditando.logo_url?.trim() || null),
        es_argentinos_del_norte: Boolean(equipoEditando.es_argentinos_del_norte),
      });

      mostrarAviso('exito', 'Equipo actualizado correctamente.');
      setEquipoEditando(null);
      cargarEquipos();
    } catch (err) {
      mostrarAviso('error', 'Error al actualizar equipo: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setCargando(false);
    }
  };

  // Eliminar Equipo
  const handleEliminar = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el equipo '${nombre}' de este torneo?`)) return;
    setCargando(true);
    try {
      await api.delete(`/equipos/${id}`);
      mostrarAviso('exito', `Equipo '${nombre}' eliminado.`);
      cargarEquipos();
    } catch (err) {
      mostrarAviso('error', 'Error al eliminar: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setCargando(false);
    }
  };

  const torneoActual = divisiones.find((d) => String(d.id_division) === String(divisionSel));

  const equiposFiltrados = equipos.filter((eq) =>
    eq.nombre_equipo.toLowerCase().includes(busqueda.toLowerCase()) ||
    (eq.nombre_corto && eq.nombre_corto.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Encabezado y Filtro de Torneo */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="font-headline text-2xl uppercase tracking-wide text-slate-900 flex items-center gap-2">
            <FaShieldAlt className="text-[#151f89]" />
            Gestión de Equipos Participantes
          </h2>
          <p className="text-xs text-slate-500 font-body">
            Creá, modificá o vinculá equipos participantes para el torneo seleccionado.
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
                setEquipoEditando(null);
                setMostrarCrear(false);
              }}
              className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 font-title font-bold text-sm text-slate-800 focus:outline-none focus:border-[#151f89]"
            >
              {divisiones.map((d) => (
                <option key={d.id_division} value={d.id_division}>
                  {d.nombre_division} ({d.temporada}) {d.terminado ? '— [Finalizado]' : '— [En Curso]'}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setMostrarCrear(!mostrarCrear);
              setEquipoEditando(null);
            }}
            className="flex items-center gap-2 bg-[#151f89] hover:bg-[#303a9f] text-white px-5 py-2.5 rounded-xl font-headline uppercase text-sm tracking-wider shadow-sm transition-all"
          >
            <FaPlus className="text-xs" />
            <span>Nuevo Equipo</span>
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

      {/* Formulario Crear Equipo */}
      {mostrarCrear && (
        <div className="bg-white border-2 border-[#151f89]/30 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-headline text-lg uppercase text-[#151f89] flex items-center gap-2">
            <FaPlus className="text-sm" />
            Registrar Nuevo Equipo en {torneoActual?.nombre_division || 'Torneo Seleccionado'}
          </h3>
          <form onSubmit={handleCrear} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                Nombre del Equipo *
              </label>
              <input
                type="text"
                required
                placeholder="ej. Argentinos del Norte A, San Cayetano, Villa Luján..."
                value={nuevoEquipo.nombre_equipo}
                onChange={(e) => setNuevoEquipo({ ...nuevoEquipo, nombre_equipo: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body"
              />
            </div>

            <div>
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                Sigla / Nombre Corto (Opcional)
              </label>
              <input
                type="text"
                placeholder="ej. ARG, CAS, VL"
                maxLength={10}
                value={nuevoEquipo.nombre_corto}
                onChange={(e) => setNuevoEquipo({ ...nuevoEquipo, nombre_corto: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body uppercase"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                URL del Escudo / Logo (Opcional)
              </label>
              <input
                type="url"
                placeholder="https://... o dejar vacío para escudo estándar"
                disabled={nuevoEquipo.es_argentinos_del_norte}
                value={nuevoEquipo.es_argentinos_del_norte ? '/gemini-svg.svg' : nuevoEquipo.logo_url}
                onChange={(e) => setNuevoEquipo({ ...nuevoEquipo, logo_url: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-body disabled:opacity-60"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none bg-blue-50 border border-blue-200 px-4 py-2.5 rounded-xl w-full">
                <input
                  type="checkbox"
                  checked={nuevoEquipo.es_argentinos_del_norte}
                  onChange={(e) => {
                    const esDelClub = e.target.checked;
                    setNuevoEquipo({
                      ...nuevoEquipo,
                      es_argentinos_del_norte: esDelClub,
                      logo_url: esDelClub ? '/gemini-svg.svg' : '',
                    });
                  }}
                  className="rounded text-[#151f89] focus:ring-[#151f89] h-4 w-4"
                />
                <span className="text-xs font-title font-bold text-slate-800 uppercase">
                  Es Equipo Oficial del Club
                </span>
              </label>
            </div>

            <div className="sm:col-span-3 flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={cargando}
                className="bg-[#151f89] hover:bg-[#303a9f] text-white px-6 py-2.5 rounded-lg font-headline uppercase text-sm tracking-wider shadow-sm transition-all"
              >
                {cargando ? 'Guardando...' : 'Crear Equipo'}
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

      {/* Formulario Editar Equipo */}
      {equipoEditando && (
        <div className="bg-blue-50 border-2 border-[#151f89] p-6 rounded-2xl shadow-md space-y-4">
          <h3 className="font-headline text-lg uppercase text-[#151f89] flex items-center gap-2">
            <FaEdit className="text-sm" />
            Editar Equipo: {equipoEditando.nombre_equipo}
          </h3>
          <form onSubmit={handleEditar} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                Nombre del Equipo *
              </label>
              <input
                type="text"
                required
                value={equipoEditando.nombre_equipo}
                onChange={(e) => setEquipoEditando({ ...equipoEditando, nombre_equipo: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-body"
              />
            </div>

            <div>
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                Sigla / Corto
              </label>
              <input
                type="text"
                maxLength={10}
                value={equipoEditando.nombre_corto || ''}
                onChange={(e) => setEquipoEditando({ ...equipoEditando, nombre_corto: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-body uppercase"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-title font-bold text-slate-700 uppercase mb-1">
                URL del Logo
              </label>
              <input
                type="url"
                disabled={equipoEditando.es_argentinos_del_norte}
                value={equipoEditando.es_argentinos_del_norte ? '/gemini-svg.svg' : (equipoEditando.logo_url || '')}
                onChange={(e) => setEquipoEditando({ ...equipoEditando, logo_url: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-body disabled:opacity-60"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none bg-white border border-slate-300 px-4 py-2.5 rounded-xl w-full">
                <input
                  type="checkbox"
                  checked={Boolean(equipoEditando.es_argentinos_del_norte)}
                  onChange={(e) => {
                    const esDelClub = e.target.checked;
                    setEquipoEditando({
                      ...equipoEditando,
                      es_argentinos_del_norte: esDelClub,
                      logo_url: esDelClub ? '/gemini-svg.svg' : equipoEditando.logo_url,
                    });
                  }}
                  className="rounded text-[#151f89] focus:ring-[#151f89] h-4 w-4"
                />
                <span className="text-xs font-title font-bold text-slate-800 uppercase">
                  Es Equipo Oficial del Club
                </span>
              </label>
            </div>

            <div className="sm:col-span-3 flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={cargando}
                className="bg-[#151f89] hover:bg-[#303a9f] text-white px-6 py-2.5 rounded-lg font-headline uppercase text-sm tracking-wider shadow-sm transition-all"
              >
                {cargando ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              <button
                type="button"
                onClick={() => setEquipoEditando(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-lg font-title font-bold text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Barra de búsqueda y contador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Buscar equipo o sigla..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-sm font-body focus:outline-none focus:border-[#151f89]"
          />
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
        </div>

        <span className="text-xs font-title font-semibold text-slate-500">
          Mostrando {equiposFiltrados.length} de {equipos.length} equipos registrados en este torneo
        </span>
      </div>

      {/* Grid de Equipos */}
      {equiposFiltrados.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <FaShieldAlt className="mx-auto text-4xl text-slate-300" />
          <p className="font-headline text-lg uppercase text-slate-600">No se encontraron equipos</p>
          <p className="text-xs text-slate-400 font-body">
            Agregá equipos para comenzar a programar partidos y cargar planteles en este torneo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equiposFiltrados.map((eq) => {
            const esClub = eq.es_argentinos_del_norte;

            return (
              <div
                key={eq.id_equipo}
                className={`bg-white rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between shadow-xs hover:shadow-md ${
                  esClub
                    ? 'border-[#151f89] ring-2 ring-[#151f89]/15'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2 shrink-0">
                        {esClub ? (
                          <ClubShield className="w-8 h-9" />
                        ) : eq.logo_url ? (
                          <img
                            src={eq.logo_url}
                            alt={eq.nombre_equipo}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
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
                          {esClub && (
                            <span className="bg-[#151f89] text-white text-[10px] px-2 py-0.5 rounded-full font-headline uppercase tracking-wider">
                              Club Oficial
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  {esClub ? (
                    <button
                      onClick={() => onVerJugadoresEquipo && onVerJugadoresEquipo(eq.id_equipo, divisionSel)}
                      className="text-xs text-[#151f89] hover:underline font-title font-bold flex items-center gap-1.5"
                    >
                      <ClubShield className="w-3.5 h-4" />
                      <span>Plantel del Club</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-title italic">
                      Rival (solo partidos/tabla)
                    </span>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEquipoEditando(eq);
                        setMostrarCrear(false);
                      }}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-colors"
                      title="Editar equipo"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleEliminar(eq.id_equipo, eq.nombre_equipo)}
                      className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs transition-colors"
                      title="Eliminar equipo"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
