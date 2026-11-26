import React, { useCallback, useEffect, useState } from 'react';
import api from '../../../api/axios';
import { FaTimes, FaExclamationCircle } from 'react-icons/fa';
import { formatearMonto, leerMonto } from '../../../utils/cobros';

const claseInput =
  'w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30';

// Catálogo de conceptos: alta, monto sugerido y activar/desactivar. No se borran: las deudas los referencian.
export default function ConceptosModal({ onClose }) {
  const [conceptos, setConceptos] = useState([]);
  const [nuevo, setNuevo] = useState({ nombre: '', monto: '', es_mensual: false });
  const [editando, setEditando] = useState(null); // { id_concepto, monto }
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    try {
      const res = await api.get('/cobros/conceptos');
      setConceptos(res.data.data || []);
    } catch {
      setError('No se pudieron cargar los conceptos.');
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const ejecutar = async (pedido, okMensaje) => {
    setError('');
    setAviso('');
    try {
      await pedido;
      setAviso(okMensaje);
      setEditando(null);
      cargar();
      return true;
    } catch (err) {
      setError(err.response?.data?.mensaje || 'No se pudo guardar.');
      return false;
    }
  };

  const crear = async (e) => {
    e.preventDefault();
    if (!nuevo.nombre.trim()) return setError('Escribí el nombre del concepto.');
    const monto = nuevo.monto ? leerMonto(nuevo.monto) : null;
    if (nuevo.monto && !monto) return setError('El monto sugerido no es válido (sin puntos de miles).');
    const ok = await ejecutar(
      api.post('/cobros/conceptos', { nombre: nuevo.nombre.trim(), monto_sugerido: monto, es_mensual: nuevo.es_mensual }),
      'Concepto creado.'
    );
    if (ok) setNuevo({ nombre: '', monto: '', es_mensual: false });
  };

  const guardarMonto = (c) => {
    const monto = editando.monto.trim() ? leerMonto(editando.monto) : null;
    if (editando.monto.trim() && !monto) return setError('El monto sugerido no es válido (sin puntos de miles).');
    ejecutar(api.put(`/cobros/conceptos/${c.id_concepto}`, { monto_sugerido: monto }), 'Monto sugerido actualizado.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300 font-bold">Cobros</span>
            <h3 className="font-headline text-lg sm:text-xl uppercase tracking-wide">Conceptos</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10" aria-label="Cerrar">
            <FaTimes />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200 flex items-center gap-2">
              <FaExclamationCircle className="shrink-0" /> {error}
            </div>
          )}
          {aviso && <p className="text-xs text-emerald-700 font-title font-bold">{aviso}</p>}

          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {conceptos.map((c) => (
              <li key={c.id_concepto} className={`p-3 flex flex-wrap items-center justify-between gap-2 ${c.activo ? '' : 'opacity-60'}`}>
                <div className="min-w-0">
                  <div className="font-title font-bold text-sm text-slate-900">
                    {c.nombre}
                    {c.es_mensual && <span className="ml-2 text-[10px] uppercase bg-blue-50 text-[#151f89] px-1.5 py-0.5 rounded">Mensual</span>}
                    {!c.activo && <span className="ml-2 text-[10px] uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Desactivado</span>}
                  </div>
                  {editando?.id_concepto === c.id_concepto ? (
                    <div className="mt-1.5 flex items-center gap-2">
                      <input
                        type="text" inputMode="decimal" placeholder="Sin monto sugerido"
                        value={editando.monto}
                        onChange={(e) => setEditando({ ...editando, monto: e.target.value })}
                        className={`${claseInput} w-36`}
                      />
                      <button onClick={() => guardarMonto(c)} className="text-[11px] font-bold text-[#151f89] hover:underline">Guardar</button>
                      <button onClick={() => setEditando(null)} className="text-[11px] font-bold text-slate-500 hover:underline">Cancelar</button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500">
                      Monto sugerido: {c.monto_sugerido ? formatearMonto(c.monto_sugerido) : '—'}
                    </div>
                  )}
                </div>
                {editando?.id_concepto !== c.id_concepto && (
                  <div className="flex gap-3 text-[11px] font-bold">
                    <button
                      onClick={() => setEditando({ id_concepto: c.id_concepto, monto: c.monto_sugerido ? String(Number(c.monto_sugerido)) : '' })}
                      className="text-[#151f89] hover:underline"
                    >
                      Editar monto
                    </button>
                    <button
                      onClick={() => ejecutar(
                        api.put(`/cobros/conceptos/${c.id_concepto}`, { activo: !c.activo }),
                        c.activo ? 'Concepto desactivado: no admite deudas nuevas.' : 'Concepto activado.'
                      )}
                      className="text-slate-600 hover:underline"
                    >
                      {c.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <form onSubmit={crear} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
            <div className="text-[11px] font-title font-bold text-slate-700 uppercase">Nuevo concepto</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text" maxLength={50} placeholder="Nombre (ej. Nutricionista)"
                value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                className={`${claseInput} col-span-2 sm:col-span-1`}
              />
              <input
                type="text" inputMode="decimal" placeholder="Monto sugerido (opcional)"
                value={nuevo.monto} onChange={(e) => setNuevo({ ...nuevo, monto: e.target.value })}
                className={`${claseInput} col-span-2 sm:col-span-1`}
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox" checked={nuevo.es_mensual}
                onChange={(e) => setNuevo({ ...nuevo, es_mensual: e.target.checked })}
                className="rounded h-4 w-4"
              />
              Se cobra todos los meses (pide mes y año al cargarlo)
            </label>
            <button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[11px] font-headline uppercase tracking-wider">
              Agregar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
