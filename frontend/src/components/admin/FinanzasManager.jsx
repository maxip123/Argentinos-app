import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import {
  FaMoneyBillWave, FaArrowDown, FaArrowUp, FaCheckCircle,
  FaExclamationCircle, FaClock, FaUserSlash, FaPlus, FaTimes,
  FaTrash, FaEdit, FaSyncAlt, FaChartLine, FaFilter,
} from 'react-icons/fa';

/* ─── helpers ──────────────────────────────────────────────────────────────── */
const MESES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const CATEGORIAS_GASTO = ['General', 'Infraestructura', 'Equipamiento', 'Sueldos', 'Arbitraje', 'Viáticos', 'Otro'];

const ESTADO_CONFIG = {
  'Al dia':   { label: 'Al día',   color: 'bg-emerald-100 text-emerald-800',  icon: FaCheckCircle,      },
  'Pendiente':{ label: 'Pendiente', color: 'bg-amber-100 text-amber-800',     icon: FaClock,            },
  'Inactivo': { label: 'Inactivo',  color: 'bg-slate-100 text-slate-600',     icon: FaUserSlash,        },
  'Sin cuota':{ label: 'Sin cuota', color: 'bg-red-50 text-red-700',          icon: FaExclamationCircle,},
};

function EstadoBadge({ estado }) {
  const cfg = ESTADO_CONFIG[estado] || ESTADO_CONFIG['Sin cuota'];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${cfg.color}`}>
      <Icon className="text-[10px]" />
      {cfg.label}
    </span>
  );
}

function formatFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMoney(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n || 0);
}

/* ─── Modal de Cobro Rápido ─────────────────────────────────────────────────── */
function ModalCobro({ jugador, divisiones, onClose, onSuccess }) {
  const [form, setForm] = useState({
    monto: '',
    metodo_pago: 'Efectivo',
    fecha_pago: new Date().toISOString().split('T')[0],
    id_division: jugador?.id_division || (divisiones[0]?.id_division || ''),
    observaciones: '',
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.monto || !form.id_division) { setError('Completá monto y división.'); return; }
    setCargando(true);
    setError('');
    try {
      await api.post('/cuotas/pago-rapido', {
        id_jugador: jugador.id_jugador,
        id_division: Number(form.id_division),
        monto: parseFloat(form.monto),
        metodo_pago: form.metodo_pago,
        fecha_pago: form.fecha_pago,
        observaciones: form.observaciones || null,
      });
      onSuccess(`Pago de ${jugador.jugador_nombre} registrado exitosamente.`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al registrar el pago.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="font-headline text-xl uppercase text-[#151f89]">Cobrar Cuota</h3>
            <p className="text-sm text-slate-500 font-title mt-0.5">{jugador?.jugador_nombre}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-1">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200 flex items-center gap-2">
              <FaExclamationCircle /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-title font-bold text-slate-600 uppercase mb-1">Monto ($) *</label>
              <input
                type="number" step="0.01" min="1" required
                value={form.monto}
                onChange={e => setForm({ ...form, monto: e.target.value })}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#151f89]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-title font-bold text-slate-600 uppercase mb-1">Fecha de Pago</label>
              <input
                type="date"
                value={form.fecha_pago}
                onChange={e => setForm({ ...form, fecha_pago: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#151f89]/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-title font-bold text-slate-600 uppercase mb-1">Método</label>
              <select
                value={form.metodo_pago}
                onChange={e => setForm({ ...form, metodo_pago: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-title font-bold focus:outline-none focus:ring-2 focus:ring-[#151f89]/30"
              >
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>MercadoPago</option>
                <option>Débito</option>
                <option>Crédito</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-title font-bold text-slate-600 uppercase mb-1">División</label>
              <select
                value={form.id_division}
                onChange={e => setForm({ ...form, id_division: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-title font-bold focus:outline-none focus:ring-2 focus:ring-[#151f89]/30"
              >
                {divisiones.map(d => (
                  <option key={d.id_division} value={d.id_division}>{d.nombre_division}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-title font-bold text-slate-600 uppercase mb-1">Observaciones</label>
            <input
              type="text"
              value={form.observaciones}
              onChange={e => setForm({ ...form, observaciones: e.target.value })}
              placeholder="Ej: Cuota octubre, descuento aplicado..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#151f89]/30"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 font-title">
            ⏱ Vencimiento calculado automáticamente: <strong>fecha de pago + 31 días</strong>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit" disabled={cargando}
              className="flex-1 bg-[#151f89] hover:bg-[#303a9f] disabled:opacity-60 text-white py-3 rounded-xl font-headline uppercase text-sm tracking-wider transition-colors shadow-sm"
            >
              {cargando ? 'Registrando...' : 'Confirmar Pago'}
            </button>
            <button
              type="button" onClick={onClose}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-title font-bold text-sm text-slate-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Modal de Gasto ─────────────────────────────────────────────────────────── */
function ModalGasto({ gasto, onClose, onSuccess }) {
  const isEdit = !!gasto?.id_gasto;
  const [form, setForm] = useState({
    concepto: gasto?.concepto || '',
    monto: gasto?.monto || '',
    fecha_gasto: gasto?.fecha_gasto ? gasto.fecha_gasto.split('T')[0] : new Date().toISOString().split('T')[0],
    categoria: gasto?.categoria || 'General',
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.concepto || !form.monto) { setError('Concepto y monto son requeridos.'); return; }
    setCargando(true);
    setError('');
    try {
      if (isEdit) {
        await api.put(`/gastos/${gasto.id_gasto}`, form);
        onSuccess('Gasto actualizado correctamente.');
      } else {
        await api.post('/gastos', form);
        onSuccess('Gasto registrado correctamente.');
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar el gasto.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-headline text-xl uppercase text-[#151f89]">
            {isEdit ? 'Editar Gasto' : 'Nuevo Gasto'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 transition-colors">
            <FaTimes />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">{error}</div>
          )}
          <div>
            <label className="block text-xs font-title font-bold text-slate-600 uppercase mb-1">Concepto *</label>
            <input
              type="text" required
              value={form.concepto}
              onChange={e => setForm({ ...form, concepto: e.target.value })}
              placeholder="Ej: Compra de redes, pago árbitro..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#151f89]/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-title font-bold text-slate-600 uppercase mb-1">Monto ($) *</label>
              <input
                type="number" step="0.01" min="0.01" required
                value={form.monto}
                onChange={e => setForm({ ...form, monto: e.target.value })}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#151f89]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-title font-bold text-slate-600 uppercase mb-1">Fecha</label>
              <input
                type="date"
                value={form.fecha_gasto}
                onChange={e => setForm({ ...form, fecha_gasto: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#151f89]/30"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-title font-bold text-slate-600 uppercase mb-1">Categoría</label>
            <select
              value={form.categoria}
              onChange={e => setForm({ ...form, categoria: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-title font-bold focus:outline-none focus:ring-2 focus:ring-[#151f89]/30"
            >
              {CATEGORIAS_GASTO.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="submit" disabled={cargando}
              className="flex-1 bg-[#151f89] hover:bg-[#303a9f] disabled:opacity-60 text-white py-3 rounded-xl font-headline uppercase text-sm tracking-wider transition-colors shadow-sm"
            >
              {cargando ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Registrar Gasto')}
            </button>
            <button
              type="button" onClick={onClose}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-title font-bold text-sm text-slate-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Componente principal ───────────────────────────────────────────────────── */
export default function FinanzasManager({ divisiones, mostrarMensaje }) {
  const [tab, setTab] = useState('cuotas');
  const [jugadores, setJugadores] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [cargandoJugadores, setCargandoJugadores] = useState(false);
  const [cargandoGastos, setCargandoGastos] = useState(false);

  // Filtros de cuotas
  const [divisionFiltro, setDivisionFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Filtros de resumen
  const now = new Date();
  const [resMes, setResMes] = useState(now.getMonth() + 1);
  const [resAnio, setResAnio] = useState(now.getFullYear());

  // Modales
  const [jugadorCobro, setJugadorCobro] = useState(null);
  const [gastoEditar, setGastoEditar] = useState(null);
  const [mostrarModalGasto, setMostrarModalGasto] = useState(false);

  const cargarJugadores = useCallback(async () => {
    setCargandoJugadores(true);
    try {
      const params = divisionFiltro ? `?id_division=${divisionFiltro}` : '';
      const res = await api.get(`/cuotas/estado-jugadores${params}`);
      setJugadores(res.data.data || []);
    } catch (err) {
      console.error('[FinanzasManager] cargarJugadores:', err);
    } finally {
      setCargandoJugadores(false);
    }
  }, [divisionFiltro]);

  const cargarGastos = useCallback(async () => {
    setCargandoGastos(true);
    try {
      const res = await api.get('/gastos');
      setGastos(res.data.data || []);
    } catch (err) {
      console.error('[FinanzasManager] cargarGastos:', err);
    } finally {
      setCargandoGastos(false);
    }
  }, []);

  const cargarResumen = useCallback(async () => {
    try {
      const res = await api.get(`/gastos/resumen?mes=${resMes}&anio=${resAnio}`);
      setResumen(res.data.data);
    } catch (err) {
      console.error('[FinanzasManager] cargarResumen:', err);
    }
  }, [resMes, resAnio]);

  useEffect(() => {
    if (tab === 'cuotas') cargarJugadores();
    if (tab === 'gastos') cargarGastos();
    if (tab === 'resumen') { cargarGastos(); cargarResumen(); }
  }, [tab, cargarJugadores, cargarGastos, cargarResumen]);

  useEffect(() => {
    if (tab === 'cuotas') cargarJugadores();
  }, [divisionFiltro, cargarJugadores, tab]);

  const handleEliminarGasto = async (id) => {
    if (!window.confirm('¿Eliminar este gasto?')) return;
    try {
      await api.delete(`/gastos/${id}`);
      mostrarMensaje('exito', 'Gasto eliminado.');
      cargarGastos();
    } catch {
      mostrarMensaje('error', 'Error al eliminar el gasto.');
    }
  };

  const jugadoresFiltrados = jugadores.filter(j => {
    const matchEstado = !estadoFiltro || j.estado_cuota === estadoFiltro;
    const matchBusq = !busqueda || j.jugador_nombre.toLowerCase().includes(busqueda.toLowerCase());
    return matchEstado && matchBusq;
  });

  const conteos = jugadores.reduce((acc, j) => {
    acc[j.estado_cuota] = (acc[j.estado_cuota] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Encabezado con tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-headline text-2xl uppercase tracking-wide text-slate-900">
            Finanzas y Cuotas
          </h2>
          <p className="text-xs text-slate-500 font-body mt-1">
            Control de cuotas de jugadores, gastos del club y balance mensual.
          </p>
        </div>
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {[
            { id: 'cuotas',  label: 'Estado de Cuotas', icon: FaCheckCircle },
            { id: 'gastos',  label: 'Gastos del Club',  icon: FaArrowDown   },
            { id: 'resumen', label: 'Balance',           icon: FaChartLine   },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-headline uppercase tracking-wider transition-all whitespace-nowrap border-b-2 ${
                  tab === t.id
                    ? 'border-[#151f89] text-[#151f89] bg-blue-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className="text-xs" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ TAB 1: ESTADO DE CUOTAS ══ */}
      {tab === 'cuotas' && (
        <div className="space-y-5">
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { estado: 'Al dia',    icon: FaCheckCircle,       bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', num: 'text-emerald-800' },
              { estado: 'Pendiente', icon: FaClock,             bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   num: 'text-amber-800'   },
              { estado: 'Sin cuota', icon: FaExclamationCircle, bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     num: 'text-red-800'     },
              { estado: 'Inactivo',  icon: FaUserSlash,         bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-500',   num: 'text-slate-700'   },
            ].map(({ estado, icon: Icon, bg, border, text, num }) => (
              <button
                key={estado}
                onClick={() => setEstadoFiltro(estadoFiltro === estado ? '' : estado)}
                className={`${bg} border ${border} rounded-2xl p-4 text-left transition-all hover:shadow-md ${
                  estadoFiltro === estado ? 'ring-2 ring-[#151f89]' : ''
                }`}
              >
                <div className={`${text} mb-1`}><Icon /></div>
                <div className={`font-headline text-3xl ${num}`}>{conteos[estado] || 0}</div>
                <div className={`text-xs ${text} font-title font-bold uppercase mt-0.5`}>
                  {ESTADO_CONFIG[estado]?.label}
                </div>
              </button>
            ))}
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 text-slate-500 shrink-0">
              <FaFilter className="text-xs" />
              <span className="text-xs font-title font-bold uppercase">Filtrar</span>
            </div>
            <input
              type="text"
              placeholder="Buscar jugador..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#151f89]/30"
            />
            <select
              value={divisionFiltro}
              onChange={e => setDivisionFiltro(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-title font-bold focus:outline-none"
            >
              <option value="">Todas las divisiones</option>
              {divisiones.map(d => (
                <option key={d.id_division} value={d.id_division}>{d.nombre_division}</option>
              ))}
            </select>
            <select
              value={estadoFiltro}
              onChange={e => setEstadoFiltro(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-title font-bold focus:outline-none"
            >
              <option value="">Todos los estados</option>
              <option value="Al dia">Al día</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Sin cuota">Sin cuota</option>
              <option value="Inactivo">Inactivo</option>
            </select>
            <button
              onClick={cargarJugadores}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 text-sm font-title font-bold transition-colors shrink-0"
            >
              <FaSyncAlt className={cargandoJugadores ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {cargandoJugadores ? (
              <div className="p-12 text-center text-slate-400 font-title">Cargando jugadores...</div>
            ) : jugadoresFiltrados.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-title">No hay jugadores para mostrar.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-headline text-xs text-slate-500 uppercase">
                      <th className="p-3.5">Jugador</th>
                      <th className="p-3.5">División</th>
                      <th className="p-3.5">Último Pago</th>
                      <th className="p-3.5">Vencimiento</th>
                      <th className="p-3.5">Estado</th>
                      <th className="p-3.5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-title">
                    {jugadoresFiltrados.map(j => (
                      <tr
                        key={j.id_jugador}
                        className={`hover:bg-slate-50/80 transition-colors ${j.es_inactivo ? 'opacity-60' : ''}`}
                      >
                        <td className="p-3.5">
                          <span className="font-bold text-slate-900 block">{j.jugador_nombre}</span>
                          <span className="text-xs text-slate-400">DNI: {j.dni || '—'}</span>
                        </td>
                        <td className="p-3.5 text-slate-600 text-xs font-bold">{j.nombre_division}</td>
                        <td className="p-3.5 text-slate-500 text-xs">{formatFecha(j.fecha_ultimo_pago)}</td>
                        <td className="p-3.5">
                          {j.fecha_vencimiento ? (
                            <span className={`text-xs font-bold ${
                              new Date(j.fecha_vencimiento) < new Date() ? 'text-red-600' : 'text-slate-700'
                            }`}>
                              {formatFecha(j.fecha_vencimiento)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <EstadoBadge estado={j.estado_cuota} />
                        </td>
                        <td className="p-3.5 text-right">
                          {!j.es_inactivo && (
                            <button
                              onClick={() => setJugadorCobro(j)}
                              className="bg-[#151f89] hover:bg-[#303a9f] text-white px-3 py-1.5 rounded-lg text-xs font-headline uppercase tracking-wider transition-colors"
                            >
                              Cobrar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB 2: GASTOS ══ */}
      {tab === 'gastos' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 font-title">
              {gastos.length} gasto{gastos.length !== 1 ? 's' : ''} registrado{gastos.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => { setGastoEditar(null); setMostrarModalGasto(true); }}
              className="flex items-center gap-2 bg-[#151f89] hover:bg-[#303a9f] text-white px-5 py-2.5 rounded-xl font-headline uppercase text-sm tracking-wider transition-colors shadow-sm"
            >
              <FaPlus /> Nuevo Gasto
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {cargandoGastos ? (
              <div className="p-12 text-center text-slate-400 font-title">Cargando gastos...</div>
            ) : gastos.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <FaArrowDown className="mx-auto text-3xl text-slate-300" />
                <p className="text-slate-400 font-title text-sm">No hay gastos registrados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-headline text-xs text-slate-500 uppercase">
                      <th className="p-3.5">Concepto</th>
                      <th className="p-3.5">Categoría</th>
                      <th className="p-3.5">Fecha</th>
                      <th className="p-3.5 text-right">Monto</th>
                      <th className="p-3.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-title">
                    {gastos.map(g => (
                      <tr key={g.id_gasto} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">{g.concepto}</td>
                        <td className="p-3.5">
                          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">
                            {g.categoria}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500 text-xs">{formatFecha(g.fecha_gasto)}</td>
                        <td className="p-3.5 text-right font-headline text-red-600">{formatMoney(g.monto)}</td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setGastoEditar(g); setMostrarModalGasto(true); }}
                              className="text-slate-400 hover:text-[#151f89] transition-colors p-1.5"
                              title="Editar"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleEliminarGasto(g.id_gasto)}
                              className="text-slate-400 hover:text-red-600 transition-colors p-1.5"
                              title="Eliminar"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td colSpan="3" className="p-3.5 font-headline text-xs uppercase text-slate-500">Total</td>
                      <td className="p-3.5 text-right font-headline text-red-700 text-base">
                        {formatMoney(gastos.reduce((s, g) => s + parseFloat(g.monto), 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB 3: BALANCE ══ */}
      {tab === 'resumen' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center gap-4">
            <span className="text-xs font-title font-bold text-slate-500 uppercase">Período:</span>
            <select
              value={resMes}
              onChange={e => setResMes(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-title font-bold focus:outline-none"
            >
              {MESES.slice(1).map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
            <input
              type="number" min="2020" max="2099"
              value={resAnio}
              onChange={e => setResAnio(Number(e.target.value))}
              className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-title font-bold focus:outline-none"
            />
            <button
              onClick={cargarResumen}
              className="flex items-center gap-2 px-4 py-2 bg-[#151f89] hover:bg-[#303a9f] text-white rounded-xl text-sm font-headline uppercase tracking-wider transition-colors"
            >
              <FaSyncAlt /> Ver
            </button>
          </div>

          {resumen ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-emerald-200 p-6 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700">
                  <FaArrowUp />
                  <span className="font-headline uppercase text-sm tracking-wider">Ingresos</span>
                </div>
                <div className="font-headline text-3xl text-emerald-700">
                  {formatMoney(resumen.ingresos.total_cobrado)}
                </div>
                <div className="text-xs text-slate-500 font-title space-y-1">
                  <div>✅ Cuotas pagadas: <strong>{resumen.ingresos.cuotas_pagadas}</strong></div>
                  <div>⏳ Pendientes: <strong>{resumen.ingresos.cuotas_pendientes}</strong></div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-red-200 p-6 space-y-3">
                <div className="flex items-center gap-2 text-red-700">
                  <FaArrowDown />
                  <span className="font-headline uppercase text-sm tracking-wider">Gastos</span>
                </div>
                <div className="font-headline text-3xl text-red-700">
                  {formatMoney(resumen.egresos.total_gastos)}
                </div>
                <div className="text-xs text-slate-500 font-title">
                  <div>📋 Cantidad: <strong>{resumen.egresos.cantidad_gastos}</strong></div>
                </div>
              </div>

              <div className={`bg-white rounded-2xl border-2 p-6 space-y-3 ${
                resumen.balance >= 0 ? 'border-emerald-400' : 'border-red-400'
              }`}>
                <div className={`flex items-center gap-2 ${resumen.balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  <FaChartLine />
                  <span className="font-headline uppercase text-sm tracking-wider">Balance</span>
                </div>
                <div className={`font-headline text-3xl ${resumen.balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {formatMoney(resumen.balance)}
                </div>
                <div className="text-xs font-title text-slate-500">
                  {resumen.balance >= 0
                    ? `✅ Superávit — ${MESES[resumen.periodo.mes]} ${resumen.periodo.anio}`
                    : `❌ Déficit — ${MESES[resumen.periodo.mes]} ${resumen.periodo.anio}`}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 font-title">
              Seleccioná un período y hacé clic en "Ver".
            </div>
          )}

          {resumen && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-headline text-base uppercase text-slate-700">
                  Detalle de Gastos — {MESES[resMes]} {resAnio}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <tbody className="divide-y divide-slate-100 font-title">
                    {gastos
                      .filter(g => {
                        const f = new Date(g.fecha_gasto);
                        return f.getMonth() + 1 === resMes && f.getFullYear() === resAnio;
                      })
                      .map(g => (
                        <tr key={g.id_gasto} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-400 text-xs">{formatFecha(g.fecha_gasto)}</td>
                          <td className="p-3 font-bold text-slate-800">{g.concepto}</td>
                          <td className="p-3">
                            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">{g.categoria}</span>
                          </td>
                          <td className="p-3 text-right font-headline text-red-600">{formatMoney(g.monto)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      {jugadorCobro && (
        <ModalCobro
          jugador={jugadorCobro}
          divisiones={divisiones}
          onClose={() => setJugadorCobro(null)}
          onSuccess={(msg) => { mostrarMensaje('exito', msg); cargarJugadores(); }}
        />
      )}

      {mostrarModalGasto && (
        <ModalGasto
          gasto={gastoEditar}
          onClose={() => { setMostrarModalGasto(false); setGastoEditar(null); }}
          onSuccess={(msg) => { mostrarMensaje('exito', msg); cargarGastos(); }}
        />
      )}
    </div>
  );
}
