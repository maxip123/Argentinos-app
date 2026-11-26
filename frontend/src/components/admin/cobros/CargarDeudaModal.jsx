import React, { useEffect, useMemo, useState } from 'react';
import api from '../../../api/axios';
import { FaTimes, FaExclamationCircle } from 'react-icons/fa';
import { fechaClub } from '../../../utils/fechas';
import { MESES, leerMonto, vencimientoSugerido, nombreJugador } from '../../../utils/cobros';

const claseInput =
  'w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30 focus:border-[#991b1b]';
const claseLabel = 'block text-[11px] font-title font-bold text-slate-700 uppercase mb-1';

// Carga una deuda a un equipo entero (cada jugador activo del plantel) o a un jugador.
// jugadorFijo: { id_jugador, nombre, apellido, equipos_asignados? } cuando se abre desde el estado de cuenta.
export default function CargarDeudaModal({ jugadorFijo = null, equipoInicial = '', onClose, onCargado }) {
  const hoy = fechaClub();
  const [anioHoy, mesHoy] = hoy.split('-').map(Number);

  const [conceptos, setConceptos] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [destino, setDestino] = useState(jugadorFijo ? 'jugador' : 'equipo');
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState({
    id_concepto: '',
    monto: '',
    periodo_mes: mesHoy,
    periodo_anio: anioHoy,
    descripcion: '',
    fecha_vencimiento: vencimientoSugerido(mesHoy, anioHoy),
    id_equipo: equipoInicial ? String(equipoInicial) : '',
    id_jugador: jugadorFijo ? String(jugadorFijo.id_jugador) : '',
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    Promise.all([
      api.get('/cobros/conceptos'),
      api.get('/equipos?solo_argentinos=true'),
      jugadorFijo ? Promise.resolve(null) : api.get('/jugadores?solo_club=true'),
    ])
      .then(([resConceptos, resEquipos, resJugadores]) => {
        if (!vigente) return;
        setConceptos((resConceptos.data.data || []).filter((c) => c.activo));
        setEquipos(resEquipos.data.data || []);
        if (resJugadores) setJugadores((resJugadores.data.data || []).filter((j) => !j.es_inactivo));
      })
      .catch(() => vigente && setError('No se pudieron cargar los conceptos y equipos.'));
    return () => { vigente = false; };
  }, [jugadorFijo]);

  const concepto = conceptos.find((c) => String(c.id_concepto) === String(form.id_concepto));
  const jugadoresFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = q ? jugadores.filter((j) => nombreJugador(j).toLowerCase().includes(q)) : jugadores;
    return lista.slice(0, 50);
  }, [jugadores, busqueda]);

  const elegirConcepto = (id) => {
    const c = conceptos.find((x) => String(x.id_concepto) === String(id));
    setForm((f) => ({
      ...f,
      id_concepto: id,
      monto: c?.monto_sugerido ? String(Number(c.monto_sugerido)) : f.monto,
      fecha_vencimiento: c?.es_mensual ? vencimientoSugerido(f.periodo_mes, f.periodo_anio) : f.fecha_vencimiento,
    }));
  };

  const cambiarPeriodo = (campo, valor) => {
    setForm((f) => {
      const nuevo = { ...f, [campo]: Number(valor) };
      return { ...nuevo, fecha_vencimiento: vencimientoSugerido(nuevo.periodo_mes, nuevo.periodo_anio) };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const monto = leerMonto(form.monto);
    if (!concepto) return setError('Elegí un concepto.');
    if (!monto) return setError('Escribí un monto válido, sin puntos de miles (ej. 20000 o 20000,50).');
    if (destino === 'equipo' && !form.id_equipo) return setError('Elegí el equipo.');
    if (destino === 'jugador' && !form.id_jugador) return setError('Elegí el jugador.');
    if (!form.fecha_vencimiento) return setError('Indicá la fecha de vencimiento.');

    setCargando(true);
    setError('');
    try {
      const res = await api.post('/cobros/cargos', {
        id_concepto: Number(form.id_concepto),
        monto,
        fecha_vencimiento: form.fecha_vencimiento,
        periodo_mes: concepto.es_mensual ? form.periodo_mes : null,
        periodo_anio: concepto.es_mensual ? form.periodo_anio : null,
        descripcion: form.descripcion.trim() || null,
        id_equipo: form.id_equipo ? Number(form.id_equipo) : null,
        id_jugador: destino === 'jugador' ? Number(form.id_jugador) : null,
      });
      onCargado(res.data.mensaje);
      onClose();
    } catch (err) {
      setError(err.response?.data?.mensaje || 'No se pudo cargar la deuda.');
      setCargando(false);
    }
  };

  // Con jugador fijo, el equipo opcional se elige entre los suyos
  const equiposParaJugador = jugadorFijo?.equipos_asignados?.length
    ? jugadorFijo.equipos_asignados
    : equipos;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#991b1b] to-[#7f1d1d] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-widest text-red-200 font-bold">Cobros</span>
            <h3 className="font-headline text-lg sm:text-xl uppercase tracking-wide">Cargar deuda</h3>
            {jugadorFijo && <p className="text-xs text-red-100 truncate">{nombreJugador(jugadorFijo)}</p>}
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10" aria-label="Cerrar">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200 flex items-center gap-2">
              <FaExclamationCircle className="shrink-0" /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className={claseLabel}>Concepto *</label>
              <select value={form.id_concepto} onChange={(e) => elegirConcepto(e.target.value)} className={claseInput}>
                <option value="">Elegir...</option>
                {conceptos.map((c) => (
                  <option key={c.id_concepto} value={c.id_concepto}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={claseLabel}>Monto ($) *</label>
              <input
                type="text" inputMode="decimal" placeholder="20000"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                className={claseInput}
              />
            </div>
          </div>

          {concepto?.es_mensual ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={claseLabel}>Mes *</label>
                <select value={form.periodo_mes} onChange={(e) => cambiarPeriodo('periodo_mes', e.target.value)} className={claseInput}>
                  {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className={claseLabel}>Año *</label>
                <input
                  type="number" min="2000" max="2100"
                  value={form.periodo_anio}
                  onChange={(e) => cambiarPeriodo('periodo_anio', e.target.value)}
                  className={claseInput}
                />
              </div>
            </div>
          ) : (
            <div>
              <label className={claseLabel}>Descripción</label>
              <input
                type="text" maxLength={150} placeholder='Ej: 1er semestre, Fecha 3 vs D10 FC'
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                className={claseInput}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Distingue deudas del mismo concepto: no se carga dos veces la misma descripción a un jugador.
              </p>
            </div>
          )}

          <div>
            <label className={claseLabel}>Vence el *</label>
            <input
              type="date" value={form.fecha_vencimiento}
              onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
              className={claseInput}
            />
          </div>

          {!jugadorFijo && (
            <div className="inline-flex rounded-xl border border-slate-300 overflow-hidden" role="radiogroup" aria-label="A quién se le carga">
              {[['equipo', 'A un equipo'], ['jugador', 'A un jugador']].map(([id, label]) => (
                <button
                  key={id} type="button" role="radio" aria-checked={destino === id}
                  onClick={() => setDestino(id)}
                  className={`px-3 py-1.5 text-xs font-title font-bold transition-colors ${
                    destino === id ? 'bg-[#151f89] text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {destino === 'jugador' && !jugadorFijo && (
            <div className="space-y-2">
              <label className={claseLabel}>Jugador *</label>
              <input
                type="text" placeholder="Buscar por apellido o nombre..."
                value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                className={claseInput}
              />
              <select
                value={form.id_jugador} size={6}
                onChange={(e) => setForm({ ...form, id_jugador: e.target.value })}
                className={`${claseInput} h-auto`}
              >
                {jugadoresFiltrados.map((j) => (
                  <option key={j.id_jugador} value={j.id_jugador}>{nombreJugador(j)}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={claseLabel}>{destino === 'equipo' ? 'Equipo *' : 'Equipo (opcional)'}</label>
            <select value={form.id_equipo} onChange={(e) => setForm({ ...form, id_equipo: e.target.value })} className={claseInput}>
              <option value="">{destino === 'equipo' ? 'Elegir...' : 'Sin equipo'}</option>
              {(destino === 'jugador' ? equiposParaJugador : equipos).map((eq) => (
                <option key={eq.id_equipo} value={eq.id_equipo}>
                  {eq.nombre_equipo}{eq.nombre_division ? ` (${eq.nombre_division})` : ''}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              {destino === 'equipo'
                ? 'Se carga a cada jugador activo del plantel; a quien ya la tiene no se le repite.'
                : 'Con equipo, la deuda aparece en la planilla de ese equipo.'}
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit" disabled={cargando}
              className="flex-1 bg-[#991b1b] hover:bg-[#7f1d1d] disabled:opacity-60 text-white py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider shadow-sm"
            >
              {cargando ? 'Cargando...' : 'Cargar deuda'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-title font-bold text-xs text-slate-600">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
