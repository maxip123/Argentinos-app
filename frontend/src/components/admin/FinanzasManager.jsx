import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api/axios';
import Paginacion from '../ui/Paginacion';
import usePaginacion from '../../hooks/usePaginacion';
import { formatFecha, fechaClub, mediodiaClub } from '../../utils/fechas';
import {
  FaMoneyBillWave,
  FaArrowDown,
  FaArrowUp,
  FaCheckCircle,
  FaExclamationCircle,
  FaClock,
  FaUserSlash,
  FaPlus,
  FaTimes,
  FaTrash,
  FaEdit,
  FaSyncAlt,
  FaChartLine,
  FaFilter,
  FaCoins,
  FaReceipt,
  FaTag,
  FaSearch,
} from 'react-icons/fa';

/* ─── helpers ──────────────────────────────────────────────────────────────── */
const MESES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const CATEGORIAS_ENTRADA = [
  'Entradas Partido',
  'Sponsors y Publicidad',
  'Cantina / Buffet',
  'Venta de Indumentaria',
  'Eventos y Rifas',
  'Alquiler de Canchas',
  'Donaciones',
  'Otro Ingreso',
];

const CATEGORIAS_GASTO = [
  'Infraestructura',
  'Equipamiento Deportivo',
  'Sueldos y Honorarios',
  'Arbitraje',
  'Viáticos y Traslados',
  'Servicios Públicos',
  'Mantenimiento',
  'General',
  'Otro Gasto',
];

const ESTADO_CONFIG = {
  'Al dia':   { label: 'Al día',   color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: FaCheckCircle },
  'Pendiente':{ label: 'Pendiente', color: 'bg-amber-50 text-amber-700 border border-amber-200',     icon: FaClock },
  'Inactivo': { label: 'Inactivo',  color: 'bg-slate-100 text-slate-500 border border-slate-200',    icon: FaUserSlash },
  'Sin cuota':{ label: 'Sin cuota', color: 'bg-red-50 text-red-700 border border-red-200',          icon: FaExclamationCircle },
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

function formatMoney(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n || 0);
}

const CATEGORIA_CUOTA = 'Cuota Socio';
const FILTRO_ANULADOS = 'ANULADOS';

/* ─── Modal de Anulación de Movimiento ───────────────────────────────────────── */
function ModalAnularMovimiento({ movimiento, onClose, onSuccess }) {
  const [motivo, setMotivo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const esCobroCuota = movimiento.categoria === CATEGORIA_CUOTA;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!motivo.trim()) { setError('Indicá el motivo de la anulación.'); return; }
    setCargando(true);
    setError('');
    try {
      const res = await api.post(`/gastos/${movimiento.id_gasto}/anular`, { motivo: motivo.trim() });
      onSuccess(res.data.mensaje);
      onClose();
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al anular el movimiento.');
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#991b1b] to-[#7f1d1d] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-widest text-red-200 font-bold">Caja y Tesorería</span>
            <h3 className="font-headline text-lg sm:text-xl uppercase tracking-wide">
              {esCobroCuota ? 'Anular Cobro de Cuota' : 'Anular Movimiento'}
            </h3>
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

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm">
            <strong className="block text-slate-900 break-words">{movimiento.concepto}</strong>
            <span className="text-xs text-slate-500 font-mono">
              {formatFecha(movimiento.fecha_gasto)} · {formatMoney(movimiento.monto)}
            </span>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
            <FaExclamationCircle className="text-amber-700 mt-0.5 shrink-0" />
            <div>
              {esCobroCuota
                ? 'Se quita el monto de la cuota y el vencimiento del socio vuelve al de su último pago válido. Si no le quedan pagos, pasa a figurar sin cuota.'
                : 'El movimiento deja de contar en los balances, pero queda registrado como anulado.'}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Motivo *</label>
            <textarea
              required
              rows={3}
              maxLength={500}
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: se cargó al socio equivocado"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30 focus:border-[#991b1b]"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit" disabled={cargando}
              className="flex-1 bg-[#991b1b] hover:bg-[#7f1d1d] disabled:opacity-60 text-white py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider transition-colors shadow-sm"
            >
              {cargando ? 'Anulando...' : 'Confirmar Anulación'}
            </button>
            <button
              type="button" onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-title font-bold text-xs text-slate-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* Quién, cuándo y por qué se anuló un movimiento */
function DetalleAnulacion({ movimiento }) {
  return (
    <p className="text-[11px] text-red-700 font-medium mt-1 break-words">
      Anulado{movimiento.fecha_anulacion ? ` el ${formatFecha(movimiento.fecha_anulacion)}` : ''}
      {movimiento.anulado_por_nombre ? ` por ${movimiento.anulado_por_nombre}` : ''}
      : {movimiento.motivo_anulacion || 'sin motivo registrado'}
    </p>
  );
}

/* ─── Modal de Cobro Rápido de Cuota ─────────────────────────────────────────── */
function ModalCobro({ jugador, divisiones, onClose, onSuccess }) {
  const [form, setForm] = useState({
    monto: '',
    metodo_pago: 'Efectivo',
    fecha_pago: fechaClub(),
    id_division: jugador?.id_division || '',
    observaciones: '',
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.monto) { setError('Por favor ingresá el monto de la cuota.'); return; }
    setCargando(true);
    setError('');
    try {
      await api.post('/cuotas/pago-rapido', {
        id_jugador: jugador.id_jugador,
        id_division: form.id_division ? Number(form.id_division) : null,
        monto: parseFloat(form.monto),
        metodo_pago: form.metodo_pago,
        fecha_pago: mediodiaClub(form.fecha_pago),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#991b1b] to-[#7f1d1d] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-red-200 font-bold">Tesorería de Cuotas</span>
            <h3 className="font-headline text-lg sm:text-xl uppercase tracking-wide">Cobrar Cuota</h3>
            <p className="text-xs text-red-100 font-medium mt-0.5 truncate max-w-[260px] sm:max-w-none">{jugador?.jugador_nombre}</p>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Monto ($) *</label>
              <input
                type="number" step="0.01" min="1" required
                value={form.monto}
                onChange={e => setForm({ ...form, monto: e.target.value })}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30 focus:border-[#991b1b]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Fecha de Pago</label>
              <input
                type="date"
                value={form.fecha_pago}
                onChange={e => setForm({ ...form, fecha_pago: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30 focus:border-[#991b1b]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Método</label>
              <select
                value={form.metodo_pago}
                onChange={e => setForm({ ...form, metodo_pago: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30"
              >
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>MercadoPago</option>
                <option>Débito</option>
                <option>Crédito</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Concepto u Observaciones</label>
            <input
              type="text"
              value={form.observaciones}
              onChange={e => setForm({ ...form, observaciones: e.target.value })}
              placeholder="Ej: Cuota mensual, descuento de hermano..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30"
            />
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900 flex items-start gap-2">
            <FaClock className="text-emerald-700 mt-0.5 shrink-0" />
            <div>
              El vencimiento se calcula automáticamente: <strong>fecha de pago + 31 días</strong>, actualizando el estado del socio a <span className="text-emerald-700 font-bold">AL DÍA</span>.
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit" disabled={cargando}
              className="flex-1 bg-[#991b1b] hover:bg-[#7f1d1d] disabled:opacity-60 text-white py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider transition-colors shadow-sm"
            >
              {cargando ? 'Registrando...' : 'Confirmar Cobro'}
            </button>
            <button
              type="button" onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-title font-bold text-xs text-slate-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Modal Historial de Cuotas del Jugador ─────────────────────────────────── */
function ModalHistorialJugador({ jugador, onClose }) {
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    const fetchHistorial = async () => {
      setCargando(true);
      setError('');
      try {
        const res = await api.get(`/cuotas?id_jugador=${jugador.id_jugador}`);
        if (activo) setHistorial(res.data.data || []);
      } catch (err) {
        if (activo) setError('No se pudo cargar el historial de pagos del jugador.');
      } finally {
        if (activo) setCargando(false);
      }
    };
    fetchHistorial();
    return () => { activo = false; };
  }, [jugador.id_jugador]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#151f89] to-[#303a9f] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-blue-200 font-bold">Historial de Cuotas</span>
            <h3 className="font-headline text-lg sm:text-xl uppercase tracking-wide">{jugador?.jugador_nombre}</h3>
            <p className="text-xs text-blue-100 font-medium mt-0.5">DNI: {jugador?.dni || '—'} · {jugador?.nombre_division}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10">
            <FaTimes />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {cargando ? (
            <div className="py-12 text-center text-slate-400 font-title text-sm">Cargando recibos y pagos anteriores...</div>
          ) : error ? (
            <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200 flex items-center gap-2">
              <FaExclamationCircle /> {error}
            </div>
          ) : historial.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-title text-sm space-y-2">
              <FaCoins className="text-3xl mx-auto text-slate-300" />
              <p>Este socio no registra cuotas previas en el sistema.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-title font-bold text-slate-500 uppercase tracking-wider">
                Total de recibos registrados: {historial.length}
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-headline text-[11px] text-slate-500 uppercase tracking-wider">
                      <th className="p-3">Período</th>
                      <th className="p-3">Fecha Pago</th>
                      <th className="p-3">Monto</th>
                      <th className="p-3">Método</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-title">
                    {historial.map(c => (
                      <tr key={c.id_cuota} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-800">
                          {MESES[c.periodo_mes]} {c.periodo_anio}
                        </td>
                        <td className="p-3 text-slate-600 font-mono">
                          {formatFecha(c.fecha_pago || c.created_at)}
                        </td>
                        <td className="p-3 font-bold text-emerald-700 font-mono">
                          {formatMoney(c.monto_abonado || c.monto_esperado)}
                        </td>
                        <td className="p-3 text-slate-600">
                          <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px]">
                            {c.metodo_pago || 'Efectivo'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            c.estado_pago === 'Pagado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {c.estado_pago}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 max-w-[150px] truncate" title={c.observaciones || ''}>
                          {c.observaciones || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl font-title font-bold text-xs text-slate-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal de Movimiento de Caja (Entrada o Gasto) ─────────────────────────── */
function ModalMovimiento({ movimiento, tipoInicial = 'INGRESO', onClose, onSuccess }) {
  const isEdit = !!movimiento?.id_gasto;
  const [tipo, setTipo] = useState(movimiento?.tipo || tipoInicial);
  const [form, setForm] = useState({
    concepto: movimiento?.concepto || '',
    monto: movimiento?.monto || '',
    fecha_gasto: fechaClub(movimiento?.fecha_gasto || new Date()),
    categoria: movimiento?.categoria || (tipo === 'INGRESO' ? 'Entradas Partido' : 'General'),
    metodo_pago: movimiento?.metodo_pago || 'Efectivo',
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Sincronizar categorías por defecto al alternar tipo
  const handleCambioTipo = (nuevoTipo) => {
    setTipo(nuevoTipo);
    setForm(prev => ({
      ...prev,
      categoria: nuevoTipo === 'INGRESO' ? 'Entradas Partido' : 'General',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.concepto || !form.monto) { setError('Concepto y monto son obligatorios.'); return; }
    setCargando(true);
    setError('');
    try {
      const payload = { ...form, tipo, fecha_gasto: mediodiaClub(form.fecha_gasto) };
      if (isEdit) {
        await api.put(`/gastos/${movimiento.id_gasto}`, payload);
        onSuccess('Movimiento actualizado correctamente.');
      } else {
        await api.post('/gastos', payload);
        onSuccess(tipo === 'INGRESO' ? 'Entrada del club registrada con éxito.' : 'Gasto registrado correctamente.');
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar el movimiento.');
    } finally {
      setCargando(false);
    }
  };

  const categoriasDisponibles = tipo === 'INGRESO' ? CATEGORIAS_ENTRADA : CATEGORIAS_GASTO;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Encabezado según tipo */}
        <div className={`p-4 sm:p-5 flex items-center justify-between text-white transition-colors duration-300 shrink-0 ${
          tipo === 'INGRESO' ? 'bg-gradient-to-r from-emerald-700 to-teal-800' : 'bg-gradient-to-r from-[#991b1b] to-rose-900'
        }`}>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-100 font-bold">
              {tipo === 'INGRESO' ? 'Tesorería — Ingreso Club' : 'Tesorería — Egreso Club'}
            </span>
            <h3 className="font-headline text-lg sm:text-xl uppercase tracking-wide">
              {isEdit ? 'Editar Movimiento' : (tipo === 'INGRESO' ? 'Registrar Entrada / Ingreso' : 'Registrar Gasto / Salida')}
            </h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200 flex items-center gap-2">
              <FaExclamationCircle className="shrink-0" /> {error}
            </div>
          )}

          {/* Selector de Tipo si es nuevo */}
          {!isEdit && (
            <div>
              <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1.5">Tipo de Movimiento</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleCambioTipo('INGRESO')}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-headline uppercase tracking-wider transition-all ${
                    tipo === 'INGRESO'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FaArrowDown className="text-[10px]" /> Entrada / Ingreso
                </button>
                <button
                  type="button"
                  onClick={() => handleCambioTipo('EGRESO')}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-headline uppercase tracking-wider transition-all ${
                    tipo === 'EGRESO'
                      ? 'bg-[#991b1b] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FaArrowUp className="text-[10px]" /> Gasto / Salida
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Concepto *</label>
            <input
              type="text" required
              value={form.concepto}
              onChange={e => setForm({ ...form, concepto: e.target.value })}
              placeholder={tipo === 'INGRESO' ? 'Ej: Venta de 120 entradas vs San Martín, Recaudación Buffet...' : 'Ej: Compra de 10 pelotas, Pago terna arbitral...'}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30 focus:border-[#991b1b]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Monto ($) *</label>
              <input
                type="number" step="0.01" min="0.01" required
                value={form.monto}
                onChange={e => setForm({ ...form, monto: e.target.value })}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30"
              />
            </div>
            <div>
              <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Fecha</label>
              <input
                type="date"
                value={form.fecha_gasto}
                onChange={e => setForm({ ...form, fecha_gasto: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Método de Cobro/Pago</label>
              <select
                value={form.metodo_pago}
                onChange={e => setForm({ ...form, metodo_pago: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30"
              >
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>MercadoPago</option>
                <option>Débito</option>
                <option>Crédito</option>
                <option>Cheque</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit" disabled={cargando}
              className={`flex-1 py-3 rounded-xl font-headline uppercase text-xs tracking-wider transition-colors shadow-sm text-white ${
                tipo === 'INGRESO' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#991b1b] hover:bg-[#7f1d1d]'
              }`}
            >
              {cargando ? 'Guardando...' : (isEdit ? 'Actualizar' : (tipo === 'INGRESO' ? 'Confirmar Entrada' : 'Confirmar Gasto'))}
            </button>
            <button
              type="button" onClick={onClose}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-title font-bold text-xs text-slate-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Componente Principal FinanzasManager ───────────────────────────────────── */
export default function FinanzasManager({ divisiones = [], mostrarMensaje }) {
  const [tab, setTab] = useState('cuotas');
  const [jugadores, setJugadores] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [cargandoJugadores, setCargandoJugadores] = useState(false);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(false);

  // Filtros de cuotas
  const [divisionFiltro, setDivisionFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Filtros de movimientos de caja
  const [filtroTipoMov, setFiltroTipoMov] = useState(''); // '' | 'INGRESO' | 'EGRESO'
  const [filtroCategoriaMov, setFiltroCategoriaMov] = useState('');
  const [busquedaMov, setBusquedaMov] = useState('');

  // Paginación de caja (server-side)
  const LIMIT_CAJA = 20;
  const [paginaCaja, setPaginaCaja] = useState(1);
  const [totalMovimientos, setTotalMovimientos] = useState(0);

  // Refs para uso dentro del useCallback estable
  const filtroTipoMovRef   = useRef('');
  const filtroCategoriaMovRef = useRef('');
  const busquedaMovRef     = useRef('');
  const paginaCajaRef      = useRef(1);
  const busquedaTimeoutRef = useRef(null);

  // Filtros de resumen
  const now = new Date();
  const [resMes, setResMes] = useState(now.getMonth() + 1);
  const [resAnio, setResAnio] = useState(now.getFullYear());

  // Modales
  const [jugadorCobro, setJugadorCobro] = useState(null);
  const [jugadorHistorial, setJugadorHistorial] = useState(null);
  const [movimientoEditar, setMovimientoEditar] = useState(null);
  const [tipoMovimientoModal, setTipoMovimientoModal] = useState('INGRESO');
  const [mostrarModalMovimiento, setMostrarModalMovimiento] = useState(false);

  const [movimientoAnular, setMovimientoAnular] = useState(null);

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

  const cargarMovimientos = useCallback(async () => {
    setCargandoMovimientos(true);
    try {
      const params = new URLSearchParams();
      if (filtroTipoMovRef.current === FILTRO_ANULADOS) params.append('anulados', 'true');
      else if (filtroTipoMovRef.current)  params.append('tipo',   filtroTipoMovRef.current);
      if (filtroCategoriaMovRef.current)  params.append('categoria', filtroCategoriaMovRef.current);
      if (busquedaMovRef.current.trim())  params.append('q',      busquedaMovRef.current.trim());
      params.append('limit',  String(LIMIT_CAJA));

      const pedirPagina = () => {
        params.set('offset', String((paginaCajaRef.current - 1) * LIMIT_CAJA));
        return api.get(`/gastos?${params.toString()}`);
      };

      let res = await pedirPagina();
      // Si se anuló el último movimiento de la última página, volver a la anterior
      while (!res.data.data?.movimientos?.length && paginaCajaRef.current > 1) {
        paginaCajaRef.current -= 1;
        setPaginaCaja(paginaCajaRef.current);
        res = await pedirPagina();
      }
      setMovimientos(res.data.data?.movimientos || []);
      setTotalMovimientos(res.data.data?.total  || 0);
    } catch (err) {
      console.error('[FinanzasManager] cargarMovimientos:', err);
    } finally {
      setCargandoMovimientos(false);
    }
  }, []); // identidad estable: lee filtros desde refs

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
    if (tab === 'caja') cargarMovimientos();
    if (tab === 'resumen') cargarResumen();
  }, [tab, cargarJugadores, cargarMovimientos, cargarResumen]);

  useEffect(() => {
    return () => clearTimeout(busquedaTimeoutRef.current);
  }, []);

  // Conteos rápidos de cuotas
  const conteos = jugadores.reduce((acc, j) => {
    const k = j.estado_cuota || 'Sin cuota';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  // Filtrado de jugadores
  const jugadoresFiltrados = jugadores.filter(j => {
    if (estadoFiltro && j.estado_cuota !== estadoFiltro) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      const matchNom = j.jugador_nombre?.toLowerCase().includes(q);
      const matchDni = j.dni?.toLowerCase().includes(q);
      if (!matchNom && !matchDni) return false;
    }
    return true;
  });
  const paginacionCuotas = usePaginacion(jugadoresFiltrados, 15, `${divisionFiltro}|${estadoFiltro}|${busqueda}`);

  // Handlers para filtros de caja (sincronizan ref + estado + recargan)
  const handleCambioTipoMov = (val) => {
    setFiltroTipoMov(val);
    filtroTipoMovRef.current = val;
    setPaginaCaja(1);
    paginaCajaRef.current = 1;
    cargarMovimientos();
  };

  const handleCambioCategoriaMov = (val) => {
    setFiltroCategoriaMov(val);
    filtroCategoriaMovRef.current = val;
    setPaginaCaja(1);
    paginaCajaRef.current = 1;
    cargarMovimientos();
  };

  const handleCambioBusquedaMov = (val) => {
    setBusquedaMov(val);
    busquedaMovRef.current = val;
    clearTimeout(busquedaTimeoutRef.current);
    busquedaTimeoutRef.current = setTimeout(() => {
      setPaginaCaja(1);
      paginaCajaRef.current = 1;
      cargarMovimientos();
    }, 450);
  };

  const handleCambioPaginaCaja = (nuevaPagina) => {
    setPaginaCaja(nuevaPagina);
    paginaCajaRef.current = nuevaPagina;
    cargarMovimientos();
  };

  const totalPaginasCaja = Math.ceil(totalMovimientos / LIMIT_CAJA);

  return (
    <div className="space-y-6">
      {/* ─── Encabezado Institucional de Finanzas ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-[#1e1b4b] text-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[11px] font-mono tracking-widest text-slate-300 uppercase">Tesorería Central</span>
            </div>
            <h1 className="font-headline text-2xl uppercase tracking-wide mt-0.5">Finanzas y Entradas del Club</h1>
            <p className="text-xs text-slate-300 font-title mt-0.5">
              Control unificado de Cuotas de Socios, Entradas directas (partidos, sponsors, buffet) y Egresos operativos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMovimientoEditar(null);
                setTipoMovimientoModal('INGRESO');
                setMostrarModalMovimiento(true);
              }}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider transition-all shadow-sm hover:scale-102"
            >
              <FaPlus /> Nueva Entrada
            </button>
            <button
              onClick={() => {
                setMovimientoEditar(null);
                setTipoMovimientoModal('EGRESO');
                setMostrarModalMovimiento(true);
              }}
              className="flex items-center gap-2 bg-[#991b1b] hover:bg-[#7f1d1d] text-white px-4 py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider transition-all shadow-sm hover:scale-102"
            >
              <FaPlus /> Nuevo Gasto
            </button>
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 overflow-x-auto">
          {[
            { id: 'cuotas',  label: 'Estado de Cuotas',        icon: FaMoneyBillWave },
            { id: 'caja',    label: 'Libro de Caja (Entradas/Salidas)', icon: FaCoins         },
            { id: 'resumen', label: 'Balance y Tesorería',     icon: FaChartLine     },
          ].map(t => {
            const Icon = t.icon;
            const activo = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2.5 py-4 px-4 text-xs font-headline uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                  activo
                    ? 'border-[#991b1b] text-[#991b1b] bg-white font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`text-sm ${activo ? 'text-[#991b1b]' : 'text-slate-400'}`} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ TAB 1: ESTADO DE CUOTAS ═══ */}
      {tab === 'cuotas' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { estado: 'Al dia',    icon: FaCheckCircle,       bg: 'bg-emerald-50/70', border: 'border-emerald-200', text: 'text-emerald-700', num: 'text-emerald-800' },
              { estado: 'Pendiente', icon: FaClock,             bg: 'bg-amber-50/70',   border: 'border-amber-200',   text: 'text-amber-700',   num: 'text-amber-800'   },
              { estado: 'Sin cuota', icon: FaExclamationCircle, bg: 'bg-red-50/70',     border: 'border-red-200',     text: 'text-red-700',     num: 'text-red-800'     },
              { estado: 'Inactivo',  icon: FaUserSlash,         bg: 'bg-slate-100',     border: 'border-slate-200',   text: 'text-slate-500',   num: 'text-slate-700'   },
            ].map(({ estado, icon: Icon, bg, border, text, num }) => (
              <button
                key={estado}
                onClick={() => setEstadoFiltro(estadoFiltro === estado ? '' : estado)}
                className={`${bg} border ${border} rounded-2xl p-4 text-left transition-all hover:shadow-sm ${
                  estadoFiltro === estado ? 'ring-2 ring-[#991b1b]' : ''
                }`}
              >
                <div className={`${text} mb-1 flex items-center justify-between`}>
                  <Icon className="text-sm" />
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Filtrar</span>
                </div>
                <div className={`font-headline text-3xl ${num}`}>{conteos[estado] || 0}</div>
                <div className={`text-xs ${text} font-title font-bold uppercase mt-0.5`}>
                  {ESTADO_CONFIG[estado]?.label}
                </div>
              </button>
            ))}
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3 shadow-sm">
            <div className="flex items-center gap-2 text-slate-400 shrink-0">
              <FaFilter className="text-xs" />
              <span className="text-xs font-title font-bold text-slate-600 uppercase">Filtros</span>
            </div>
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-3 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Buscar por nombre o DNI..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30"
              />
            </div>
            <select
              value={divisionFiltro}
              onChange={e => setDivisionFiltro(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="">Todas las divisiones</option>
              {divisiones.map(d => (
                <option key={d.id_division} value={d.id_division}>{d.nombre_division}</option>
              ))}
            </select>
            <select
              value={estadoFiltro}
              onChange={e => setEstadoFiltro(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="">Todos los estados</option>
              <option value="Al dia">Al día</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Sin cuota">Sin cuota</option>
              <option value="Inactivo">Inactivo</option>
            </select>
            <button
              onClick={cargarJugadores}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 text-xs font-title font-bold transition-colors shrink-0"
            >
              <FaSyncAlt className={cargandoJugadores ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refrescar</span>
            </button>
          </div>

          <div id={paginacionCuotas.idLista} className="scroll-mt-24" />

          {/* Vista móvil: Cards de jugadores */}
          <div className="block md:hidden space-y-3">
            {cargandoJugadores ? (
              <div className="p-8 text-center text-slate-400 font-title text-xs">Cargando estado de cuotas...</div>
            ) : jugadoresFiltrados.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-title text-xs">No se encontraron jugadores.</div>
            ) : (
              paginacionCuotas.visibles.map(j => (
                <div key={j.id_jugador} className={`bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3 ${j.es_inactivo ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900 text-sm block leading-tight">{j.jugador_nombre}</span>
                      <span className="text-[11px] text-slate-400 font-mono">DNI: {j.dni || '—'} · {j.nombre_division}</span>
                    </div>
                    <EstadoBadge estado={j.estado_cuota} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-mono">Vencimiento</span>
                      <span className={`font-mono font-bold ${
                        j.estado_cuota === 'Pendiente' ? 'text-red-600' : 'text-slate-800'
                      }`}>
                        {formatFecha(j.fecha_vencimiento)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setJugadorHistorial(j)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-title font-bold transition-colors"
                      >
                        Historial
                      </button>
                      {!j.es_inactivo && (
                        <button
                          onClick={() => setJugadorCobro(j)}
                          className="bg-[#991b1b] hover:bg-[#7f1d1d] text-white px-3.5 py-1.5 rounded-xl text-xs font-headline uppercase tracking-wider transition-colors shadow-sm"
                        >
                          Cobrar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Vista escritorio: Tabla de Socios / Jugadores */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {cargandoJugadores ? (
              <div className="p-12 text-center text-slate-400 font-title text-sm">Cargando estado de cuotas...</div>
            ) : jugadoresFiltrados.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-title text-sm">No se encontraron jugadores.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-headline text-[11px] text-slate-500 uppercase tracking-wider">
                      <th className="p-3.5">Jugador / Socio</th>
                      <th className="p-3.5">División</th>
                      <th className="p-3.5">Último Pago</th>
                      <th className="p-3.5">Vencimiento</th>
                      <th className="p-3.5">Estado Cuota</th>
                      <th className="p-3.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-title text-xs">
                    {paginacionCuotas.visibles.map(j => (
                      <tr
                        key={j.id_jugador}
                        className={`hover:bg-slate-50/80 transition-colors ${j.es_inactivo ? 'opacity-50' : ''}`}
                      >
                        <td className="p-3.5">
                          <span className="font-bold text-slate-900 block text-sm">{j.jugador_nombre}</span>
                          <span className="text-[11px] text-slate-400 font-mono">DNI: {j.dni || '—'}</span>
                        </td>
                        <td className="p-3.5 text-slate-600 font-bold">{j.nombre_division}</td>
                        <td className="p-3.5 text-slate-500 font-mono">{formatFecha(j.fecha_ultimo_pago)}</td>
                        <td className="p-3.5">
                          {j.fecha_vencimiento ? (
                            <span className={`font-bold font-mono ${
                              j.estado_cuota === 'Pendiente' ? 'text-red-600' : 'text-slate-800'
                            }`}>
                              {formatFecha(j.fecha_vencimiento)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <EstadoBadge estado={j.estado_cuota} />
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            onClick={() => setJugadorHistorial(j)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-title font-bold transition-colors"
                          >
                            Historial
                          </button>
                          {!j.es_inactivo && (
                            <button
                              onClick={() => setJugadorCobro(j)}
                              className="bg-[#991b1b] hover:bg-[#7f1d1d] text-white px-3 py-1.5 rounded-lg text-[11px] font-headline uppercase tracking-wider transition-colors shadow-sm"
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

          {!cargandoJugadores && <Paginacion paginacion={paginacionCuotas} singular="jugador" plural="jugadores" />}
        </div>
      )}

      {/* ═══ TAB 2: LIBRO DE CAJA (ENTRADAS Y GASTOS) ═══ */}
      {tab === 'caja' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3 shadow-sm">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-3 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Buscar por concepto..."
                value={busquedaMov}
                onChange={e => handleCambioBusquedaMov(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30"
              />
            </div>

            <select
              value={filtroTipoMov}
              onChange={e => handleCambioTipoMov(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="">Todos los movimientos</option>
              <option value="INGRESO">Solo Entradas / Ingresos</option>
              <option value="EGRESO">Solo Gastos / Salidas</option>
              <option value={FILTRO_ANULADOS}>Movimientos anulados</option>
            </select>

            <select
              value={filtroCategoriaMov}
              onChange={e => handleCambioCategoriaMov(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="">Todas las categorías</option>
              <optgroup label="Ingresos">
                <option value={CATEGORIA_CUOTA}>{CATEGORIA_CUOTA}</option>
                {CATEGORIAS_ENTRADA.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="Gastos">
                {CATEGORIAS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
            </select>

            <button
              onClick={cargarMovimientos}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 text-xs font-title font-bold transition-colors shrink-0"
            >
              <FaSyncAlt className={cargandoMovimientos ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refrescar</span>
            </button>
          </div>

          {/* Vista móvil: Cards de movimientos */}
          <div className="block md:hidden space-y-3">
            {cargandoMovimientos ? (
              <div className="p-8 text-center text-slate-400 font-title text-xs">Cargando libro de caja...</div>
            ) : movimientos.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-title text-xs">No hay movimientos registrados con los filtros aplicados.</div>
            ) : (
              movimientos.map(m => {
                const esIngreso = m.tipo === 'INGRESO';
                const anulado = m.activo === false;
                return (
                  <div key={m.id_gasto} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                          esIngreso
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {esIngreso ? <FaArrowDown className="text-[9px]" /> : <FaArrowUp className="text-[9px]" />}
                          {esIngreso ? 'Entrada' : 'Gasto'}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm leading-tight">{m.concepto}</h4>
                        <span className="text-[11px] text-slate-500 font-medium">{m.categoria} · {m.metodo_pago || 'Efectivo'}</span>
                        {anulado && <DetalleAnulacion movimiento={m} />}
                      </div>
                      <div className={`font-headline text-lg font-bold shrink-0 ${anulado ? 'text-slate-400 line-through' : esIngreso ? 'text-emerald-600' : 'text-red-600'}`}>
                        {esIngreso ? '+' : '-'}{formatMoney(m.monto)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-400 font-mono">
                      <span>{formatFecha(m.fecha_gasto)}</span>
                      {!anulado && (
                        <div className="flex items-center gap-2">
                          {m.categoria !== CATEGORIA_CUOTA && (
                            <button
                              onClick={() => {
                                setMovimientoEditar(m);
                                setTipoMovimientoModal(m.tipo);
                                setMostrarModalMovimiento(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                              title="Editar movimiento"
                            >
                              <FaEdit className="text-xs" />
                            </button>
                          )}
                          <button
                            onClick={() => setMovimientoAnular(m)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            title="Anular movimiento"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Vista escritorio: Tabla de Movimientos */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {cargandoMovimientos ? (
              <div className="p-12 text-center text-slate-400 font-title text-sm">Cargando libro de caja...</div>
            ) : movimientos.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <FaReceipt className="mx-auto text-3xl text-slate-300" />
                <p className="text-slate-400 font-title text-sm">No hay movimientos registrados con los filtros aplicados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-headline text-[11px] text-slate-500 uppercase tracking-wider">
                      <th className="p-3.5">Tipo</th>
                      <th className="p-3.5">Concepto</th>
                      <th className="p-3.5">Categoría</th>
                      <th className="p-3.5">Método</th>
                      <th className="p-3.5">Fecha</th>
                      <th className="p-3.5 text-right">Monto</th>
                      <th className="p-3.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-title text-xs">
                    {movimientos.map(m => {
                      const esIngreso = m.tipo === 'INGRESO';
                      const anulado = m.activo === false;
                      return (
                        <tr key={m.id_gasto} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              esIngreso
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {esIngreso ? <FaArrowDown className="text-[9px]" /> : <FaArrowUp className="text-[9px]" />}
                              {esIngreso ? 'Entrada' : 'Gasto'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-slate-900 text-sm">{m.concepto}</span>
                            {anulado && <DetalleAnulacion movimiento={m} />}
                          </td>
                          <td className="p-3.5">
                            <span className="bg-slate-100 text-slate-600 text-[11px] px-2.5 py-0.5 rounded-full font-bold">
                              {m.categoria}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-500 font-medium">{m.metodo_pago || 'Efectivo'}</td>
                          <td className="p-3.5 text-slate-500 font-mono">{formatFecha(m.fecha_gasto)}</td>
                          <td className="p-3.5 text-right font-headline text-base">
                            <span className={anulado ? 'text-slate-400 line-through' : esIngreso ? 'text-emerald-600' : 'text-red-600'}>
                              {esIngreso ? '+' : '-'}{formatMoney(m.monto)}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            {!anulado && (
                              <div className="flex items-center justify-end gap-1.5">
                                {m.categoria !== CATEGORIA_CUOTA && (
                                  <button
                                    onClick={() => {
                                      setMovimientoEditar(m);
                                      setTipoMovimientoModal(m.tipo);
                                      setMostrarModalMovimiento(true);
                                    }}
                                    className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                    title="Editar movimiento"
                                  >
                                    <FaEdit className="text-xs" />
                                  </button>
                                )}
                                <button
                                  onClick={() => setMovimientoAnular(m)}
                                  className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                  title="Anular movimiento"
                                >
                                  <FaTrash className="text-xs" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Paginación */}
          {totalPaginasCaja > 1 && (
            <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 px-4 py-3 shadow-sm">
              <span className="text-xs text-slate-500 font-title">
                {totalMovimientos} movimientos · página {paginaCaja} de {totalPaginasCaja}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleCambioPaginaCaja(paginaCaja - 1)}
                  disabled={paginaCaja <= 1 || cargandoMovimientos}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                {Array.from({ length: Math.min(totalPaginasCaja, 5) }, (_, i) => {
                  const page = totalPaginasCaja <= 5
                    ? i + 1
                    : paginaCaja <= 3 ? i + 1
                    : paginaCaja >= totalPaginasCaja - 2 ? totalPaginasCaja - 4 + i
                    : paginaCaja - 2 + i;
                  return (
                    <button
                      key={page}
                      onClick={() => handleCambioPaginaCaja(page)}
                      disabled={cargandoMovimientos}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                        page === paginaCaja
                          ? 'bg-[#151f89] text-white'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => handleCambioPaginaCaja(paginaCaja + 1)}
                  disabled={paginaCaja >= totalPaginasCaja || cargandoMovimientos}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 3: BALANCE Y TESORERÍA ═══ */}
      {tab === 'resumen' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Selector de Período */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-2">
              <FaCoins className="text-[#991b1b]" />
              <span className="font-headline uppercase text-sm text-slate-800">Período Fiscal</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={resMes}
                onChange={e => setResMes(parseInt(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none"
              >
                {MESES.slice(1).map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={resAnio}
                onChange={e => setResAnio(parseInt(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={cargarResumen}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
                title="Actualizar balance"
              >
                <FaSyncAlt className="text-xs" />
              </button>
            </div>
          </div>

          {resumen && (
            <>
              {/* Tarjetas de Balance General */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Ingresos Totales */}
                <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 border border-emerald-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between text-emerald-700 mb-2">
                    <span className="text-xs font-headline uppercase tracking-wider">Total Ingresos</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <FaArrowDown className="text-xs" />
                    </div>
                  </div>
                  <div className="font-headline text-3xl text-emerald-800">
                    {formatMoney(resumen.ingresos.total_ingresos)}
                  </div>
                  <div className="mt-3 pt-3 border-t border-emerald-100 space-y-1 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Cuotas de Jugadores:</span>
                      <strong className="text-emerald-700">{formatMoney(resumen.ingresos.total_cuotas)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Entradas del Club:</span>
                      <strong className="text-emerald-700">{formatMoney(resumen.ingresos.total_entradas)}</strong>
                    </div>
                  </div>
                </div>

                {/* Gastos Totales */}
                <div className="bg-gradient-to-br from-red-50 via-white to-red-50/30 border border-red-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between text-red-700 mb-2">
                    <span className="text-xs font-headline uppercase tracking-wider">Total Egresos</span>
                    <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
                      <FaArrowUp className="text-xs" />
                    </div>
                  </div>
                  <div className="font-headline text-3xl text-red-700">
                    {formatMoney(resumen.egresos.total_gastos)}
                  </div>
                  <div className="mt-3 pt-3 border-t border-red-100 space-y-1 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Operaciones registradas:</span>
                      <strong className="text-slate-800">{resumen.egresos.cantidad_gastos}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Promedio por gasto:</span>
                      <strong className="text-slate-800">
                        {formatMoney(resumen.egresos.cantidad_gastos ? (resumen.egresos.total_gastos / resumen.egresos.cantidad_gastos) : 0)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Balance Neto */}
                <div className={`bg-gradient-to-br ${
                  resumen.balance >= 0
                    ? 'from-blue-50 via-white to-indigo-50/30 border-blue-200'
                    : 'from-amber-50 via-white to-red-50/30 border-amber-300'
                } border rounded-2xl p-5 shadow-sm`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-headline uppercase tracking-wider text-slate-700">Balance Neto</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      resumen.balance >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {resumen.balance >= 0 ? 'Superávit' : 'Déficit'}
                    </span>
                  </div>
                  <div className={`font-headline text-3xl ${resumen.balance >= 0 ? 'text-blue-900' : 'text-red-700'}`}>
                    {resumen.balance >= 0 ? '+' : ''}{formatMoney(resumen.balance)}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                    {resumen.balance >= 0 ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                        <FaCheckCircle /> Las finanzas del club se mantienen en superávit este mes.
                      </span>
                    ) : (
                      <span className="text-red-700 font-semibold flex items-center gap-1.5">
                        <FaExclamationCircle /> Los gastos del período superan los ingresos recaudados.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Desglose por Categorías */}
              {resumen.categorias && resumen.categorias.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="font-headline text-sm uppercase text-slate-800 tracking-wider mb-4 flex items-center gap-2">
                    <FaTag className="text-[#991b1b]" /> Desglose por Categorías del Período
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {resumen.categorias.map((c, i) => {
                      const esIngreso = c.tipo === 'INGRESO';
                      return (
                        <div key={i} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${esIngreso ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                              <span className="font-bold text-xs text-slate-800">{c.categoria}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{c.cantidad} operaciones</span>
                          </div>
                          <div className={`font-headline text-sm font-bold ${esIngreso ? 'text-emerald-700' : 'text-red-600'}`}>
                            {esIngreso ? '+' : '-'}{formatMoney(c.subtotal)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Modales ── */}
      {jugadorHistorial && (
        <ModalHistorialJugador
          jugador={jugadorHistorial}
          onClose={() => setJugadorHistorial(null)}
        />
      )}

      {jugadorCobro && (
        <ModalCobro
          jugador={jugadorCobro}
          divisiones={divisiones}
          onClose={() => setJugadorCobro(null)}
          onSuccess={(msg) => {
            mostrarMensaje && mostrarMensaje('exito', msg);
            cargarJugadores();
          }}
        />
      )}

      {mostrarModalMovimiento && (
        <ModalMovimiento
          movimiento={movimientoEditar}
          tipoInicial={tipoMovimientoModal}
          onClose={() => {
            setMostrarModalMovimiento(false);
            setMovimientoEditar(null);
          }}
          onSuccess={(msg) => {
            mostrarMensaje && mostrarMensaje('exito', msg);
            cargarMovimientos();
            if (tab === 'resumen') cargarResumen();
          }}
        />
      )}

      {movimientoAnular && (
        <ModalAnularMovimiento
          movimiento={movimientoAnular}
          onClose={() => setMovimientoAnular(null)}
          onSuccess={(msg) => {
            mostrarMensaje && mostrarMensaje('exito', msg);
            cargarMovimientos();
          }}
        />
      )}
    </div>
  );
}
