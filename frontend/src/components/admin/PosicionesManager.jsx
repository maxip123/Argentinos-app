import React, { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import ClubShield from '../ui/ClubShield';
import { FaEdit, FaTimes, FaExclamationCircle, FaUndo } from 'react-icons/fa';

// Columnas que se pueden corregir a mano. PJ y DG se calculan a partir de ellas.
const CAMPOS = [
  { clave: 'partidos_ganados', corto: 'PG', nombre: 'Ganados' },
  { clave: 'partidos_empatados', corto: 'PE', nombre: 'Empatados' },
  { clave: 'partidos_perdidos', corto: 'PP', nombre: 'Perdidos' },
  { clave: 'goles_a_favor', corto: 'GF', nombre: 'Goles a favor' },
  { clave: 'goles_en_contra', corto: 'GC', nombre: 'Goles en contra' },
  { clave: 'puntos', corto: 'PTS', nombre: 'Puntos' },
];

// Valor que sale solo de los partidos, sin el ajuste manual
const segunPartidos = (fila, clave) => fila[clave] - (fila[`ajuste_${clave}`] || 0);
const tieneAjuste = (fila) => CAMPOS.some(({ clave }) => (fila[`ajuste_${clave}`] || 0) !== 0);
const conSigno = (n) => (n > 0 ? `+${n}` : String(n));
const descripcionAjuste = (fila) => {
  const autoria = [fila.ajustado_por_nombre, fila.fecha_ajuste && new Date(fila.fecha_ajuste).toLocaleDateString('es-AR')]
    .filter(Boolean)
    .join(', ');
  return `${fila.motivo_ajuste || 'Sin motivo'}${autoria ? ` (${autoria})` : ''}`;
};

function EscudoEquipo({ fila }) {
  return (
    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 p-0.5">
      {fila.es_argentinos_del_norte ? (
        <ClubShield className="w-full h-full object-contain" />
      ) : fila.logo_url ? (
        <img src={fila.logo_url} alt="" className="w-full h-full object-contain" />
      ) : (
        <span className="font-headline text-[10px] font-bold text-slate-600">
          {(fila.nombre_corto || fila.nombre_equipo || 'EQ').substring(0, 3).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function ModalEditarFila({ fila, onClose, onGuardado, onConflicto }) {
  const [valores, setValores] = useState(() => Object.fromEntries(CAMPOS.map(({ clave }) => [clave, String(fila[clave])])));
  const [motivo, setMotivo] = useState(fila.motivo_ajuste || '');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const numero = (clave) => Number(valores[clave]);
  const difiere = CAMPOS.some(({ clave }) => numero(clave) !== segunPartidos(fila, clave));
  const pj = numero('partidos_ganados') + numero('partidos_empatados') + numero('partidos_perdidos');
  const dg = numero('goles_a_favor') - numero('goles_en_contra');

  const restaurar = () => {
    setValores(Object.fromEntries(CAMPOS.map(({ clave }) => [clave, String(segunPartidos(fila, clave))])));
    setMotivo('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const invalido = CAMPOS.find(({ clave }) => valores[clave] === '' || !Number.isInteger(numero(clave)));
    if (invalido) { setError(`Completá ${invalido.nombre.toLowerCase()} con un número entero.`); return; }
    if (difiere && !motivo.trim()) { setError('Indicá el motivo del cambio.'); return; }
    setCargando(true);
    setError('');
    try {
      const datos = Object.fromEntries(CAMPOS.map(({ clave }) => [clave, numero(clave)]));
      // base: lo que decían los partidos al abrir el formulario, para detectar si cambió algo mientras tanto
      const base = Object.fromEntries(CAMPOS.map(({ clave }) => [clave, segunPartidos(fila, clave)]));
      const res = await api.put(`/clasificacion/${fila.id_clasificacion}`, { ...datos, base, motivo: motivo.trim() });
      onGuardado(res.data.mensaje);
      onClose();
    } catch (err) {
      if (err.response?.status === 409) {
        onConflicto(err.response.data?.mensaje || 'La tabla cambió mientras editabas. Volvé a abrir la fila.');
        return;
      }
      setError(err.response?.data?.mensaje || 'Error al guardar los cambios.');
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#151f89] to-[#303a9f] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#a7aeff] font-bold">Tabla de posiciones</span>
            <h3 className="font-headline text-lg sm:text-xl uppercase tracking-wide truncate">{fila.nombre_equipo}</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200 flex items-center gap-2">
              <FaExclamationCircle className="shrink-0" /> {error}
            </div>
          )}

          <p className="text-xs text-slate-500 font-body">
            Usalo para sanciones, puntos de mesa o partidos que no están cargados. La diferencia con lo que dicen los
            partidos queda guardada como ajuste y se mantiene cuando la tabla se recalcula.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CAMPOS.map(({ clave, corto, nombre }) => {
              const base = segunPartidos(fila, clave);
              const diferencia = numero(clave) - base;
              return (
                <label key={clave} className="block">
                  <span className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">
                    {nombre} <span className="text-slate-400">({corto})</span>
                  </span>
                  <input
                    type="number"
                    step="1"
                    min={clave === 'puntos' ? undefined : 0}
                    value={valores[clave]}
                    onChange={(e) => setValores({ ...valores, [clave]: e.target.value })}
                    className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-title font-bold focus:outline-none focus:ring-2 focus:ring-[#151f89]/30 focus:border-[#151f89] ${
                      Number.isInteger(diferencia) && diferencia !== 0 ? 'border-amber-400 bg-amber-50/60' : 'border-slate-300'
                    }`}
                  />
                  <span className="block text-[10px] text-slate-500 mt-1 font-body">
                    Según partidos: {base}
                    {Number.isInteger(diferencia) && diferencia !== 0 && (
                      <strong className="text-amber-700"> ({conSigno(diferencia)})</strong>
                    )}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex gap-3 text-xs font-title">
            <span className="bg-slate-100 rounded-lg px-3 py-1.5 text-slate-700">
              PJ: <strong>{Number.isFinite(pj) ? pj : '-'}</strong>
            </span>
            <span className="bg-slate-100 rounded-lg px-3 py-1.5 text-slate-700">
              DG: <strong>{Number.isFinite(dg) ? conSigno(dg) : '-'}</strong>
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">
              Motivo {difiere ? '*' : ''}
            </label>
            <textarea
              rows={2}
              maxLength={500}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={!difiere}
              placeholder={difiere ? 'Ej: quita de 3 puntos por sanción del Tribunal de Disciplina' : 'Sin cambios respecto de los partidos'}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#151f89]/30 focus:border-[#151f89] disabled:opacity-60"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="submit"
              disabled={cargando}
              className="flex-1 bg-[#151f89] hover:bg-[#303a9f] disabled:opacity-60 text-white py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider transition-colors shadow-sm"
            >
              {cargando ? 'Guardando...' : 'Guardar'}
            </button>
            {tieneAjuste(fila) || difiere ? (
              <button
                type="button"
                onClick={restaurar}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-headline uppercase text-xs tracking-wider transition-colors"
              >
                <FaUndo /> Según partidos
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-headline uppercase text-xs tracking-wider transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PosicionesManager({ divisiones, divisionSel, setDivisionSel, mostrarMensaje }) {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');

  const cargarTabla = useCallback(async () => {
    if (!divisionSel) return;
    setCargando(true);
    setErrorCarga('');
    try {
      const res = await api.get(`/clasificacion/${divisionSel}/detalle`);
      setFilas(res.data.data || []);
    } catch (err) {
      setFilas([]);
      setErrorCarga(err.response?.data?.mensaje || 'No se pudo cargar la tabla.');
    } finally {
      setCargando(false);
    }
  }, [divisionSel]);

  useEffect(() => {
    cargarTabla();
  }, [cargarTabla]);

  const divisionActual = divisiones.find((d) => String(d.id_division) === String(divisionSel));

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline text-2xl uppercase tracking-wide text-slate-900">Gestión de Tabla de Posiciones</h2>
          <p className="text-xs text-slate-500 font-body">
            La tabla se arma sola con los partidos finalizados. Editá una fila para cargar sanciones o correcciones.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 w-full lg:w-auto">
          <select
            value={divisionSel}
            onChange={(e) => setDivisionSel(e.target.value)}
            className="w-full sm:w-auto sm:max-w-xs min-w-0 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 font-title font-bold text-sm text-slate-800"
          >
            {divisiones.map((d) => (
              <option key={d.id_division} value={d.id_division}>
                {d.nombre_division}
              </option>
            ))}
          </select>
        </div>
      </div>

      {divisionActual?.terminado && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
          <FaExclamationCircle className="text-amber-700 mt-0.5 shrink-0" />
          <span>Este torneo está terminado. Los cambios no modifican la tabla que quedó guardada en el Historial.</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-[#151f89] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="font-title text-slate-500 font-semibold uppercase tracking-wider text-sm">Cargando tabla...</p>
          </div>
        ) : errorCarga ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-700 font-body mb-3">{errorCarga}</p>
            <button onClick={cargarTabla} className="text-xs font-title font-bold text-[#151f89] hover:underline">
              Reintentar
            </button>
          </div>
        ) : filas.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-headline text-slate-700 text-lg uppercase tracking-wide">No hay equipos en la tabla</p>
            <p className="text-slate-500 text-sm mt-1 font-body">
              Cargá equipos en el torneo desde la pestaña Equipos y van a aparecer acá.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-[#efecf6] text-[#454652] uppercase tracking-wider border-b-2 border-slate-200 font-headline text-xs">
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3">Equipo</th>
                  {['PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG'].map((c) => (
                    <th key={c} className="py-3 px-2 text-center font-title">{c}</th>
                  ))}
                  <th className="py-3 px-3 text-center text-[#151f89]">PTS</th>
                  <th className="py-3 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="font-body text-sm text-slate-800 divide-y divide-slate-100">
                {filas.map((fila, i) => {
                  const ajustada = tieneAjuste(fila);
                  return (
                    <tr key={fila.id_clasificacion} className={fila.es_argentinos_del_norte ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'}>
                      <td className="py-3 px-3 text-center font-title font-bold text-slate-500">{i + 1}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <EscudoEquipo fila={fila} />
                          <div className="min-w-0">
                            <span className={`block font-title font-semibold leading-tight ${fila.es_argentinos_del_norte ? 'text-[#151f89]' : 'text-slate-900'}`}>
                              {fila.nombre_equipo}
                            </span>
                            {ajustada && (
                              <span
                                title={descripcionAjuste(fila)}
                                className="inline-block mt-0.5 text-[10px] font-title font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded"
                              >
                                Ajustada
                                {fila.ajuste_puntos ? ` · ${conSigno(fila.ajuste_puntos)} pts` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      {['partidos_jugados', 'partidos_ganados', 'partidos_empatados', 'partidos_perdidos', 'goles_a_favor', 'goles_en_contra'].map((c) => (
                        <td key={c} className="py-3 px-2 text-center font-title">{fila[c]}</td>
                      ))}
                      <td className="py-3 px-2 text-center font-title">{conSigno(fila.diferencia_gol)}</td>
                      <td className="py-3 px-3 text-center font-headline text-base text-[#151f89]">{fila.puntos}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setEditando(fila)}
                          className="inline-flex items-center gap-1.5 text-xs font-title font-bold text-[#151f89] hover:bg-[#151f89]/10 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <FaEdit /> Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editando && (
        <ModalEditarFila
          fila={editando}
          onClose={() => setEditando(null)}
          onGuardado={(texto) => {
            mostrarMensaje('exito', texto);
            cargarTabla();
          }}
          onConflicto={(texto) => {
            setEditando(null);
            mostrarMensaje('error', texto);
            cargarTabla();
          }}
        />
      )}
    </div>
  );
}
