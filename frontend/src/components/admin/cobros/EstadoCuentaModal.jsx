import React, { useCallback, useEffect, useState } from 'react';
import api from '../../../api/axios';
import { useAuthStore } from '../../../stores/authStore';
import { FaTimes, FaExclamationCircle, FaPlus } from 'react-icons/fa';
import { fechaClub, formatFecha } from '../../../utils/fechas';
import {
  METODOS_PAGO, COLOR_ESTADO_DEUDA, formatearMonto, leerMonto, tituloDeuda, nombreJugador,
} from '../../../utils/cobros';
import CargarDeudaModal from './CargarDeudaModal';

const claseInput =
  'w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30';
const botonChico = 'px-3 py-1.5 rounded-lg text-[11px] font-title font-bold transition-colors';

// Formulario en línea para una acción sobre una deuda o un pago (cobrar, no corresponde, anular)
function FormAccion({ accion, cargo, onCancelar, onHecho }) {
  const [monto, setMonto] = useState(accion.tipo === 'cobrar' ? String(Number(cargo.saldo)) : '');
  const [metodo, setMetodo] = useState('Efectivo');
  const [fecha, setFecha] = useState(fechaClub());
  const [texto, setTexto] = useState('');
  const [referencia, setReferencia] = useState('');
  const [recibidoPor, setRecibidoPor] = useState('');
  const [cargando, setCargando] = useState(false);
  // El n.º de operación solo tiene sentido si la plata no se entregó en mano
  const pideReferencia = metodo !== 'Efectivo' && metodo !== 'Canje';
  const [error, setError] = useState('');

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    let pedido;
    if (accion.tipo === 'cobrar') {
      const valor = leerMonto(monto);
      if (!valor) return setError('Escribí un monto válido, sin puntos de miles.');
      if (metodo === 'Canje' && !texto.trim()) return setError('En un canje, indicá qué se recibió a cambio.');
      pedido = api.post(`/cobros/cargos/${cargo.id_cargo}/pagos`, {
        monto: valor, metodo_pago: metodo, fecha_pago: fecha, observaciones: texto.trim() || null,
        referencia: pideReferencia ? referencia.trim() || null : null,
        recibido_por: recibidoPor.trim() || null,
      });
    } else {
      if (!texto.trim()) return setError('Indicá el motivo.');
      pedido = accion.tipo === 'no_corresponde'
        ? api.post(`/cobros/cargos/${cargo.id_cargo}/no-corresponde`, { motivo: texto.trim() })
        : api.post(`/cobros/pagos/${accion.pago.id_pago}/anular`, { motivo: texto.trim() });
    }
    setCargando(true);
    try {
      const res = await pedido;
      onHecho(res.data.mensaje);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'No se pudo completar la acción.');
      setCargando(false);
    }
  };

  const titulos = {
    cobrar: 'Registrar cobro',
    no_corresponde: 'Marcar "no corresponde"',
    anular: `Anular pago de ${formatearMonto(accion.pago?.monto)}`,
  };

  return (
    <form onSubmit={enviar} className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
      <div className="text-[11px] font-title font-bold text-slate-700 uppercase">{titulos[accion.tipo]}</div>
      {error && (
        <div className="bg-red-50 text-red-700 text-xs p-2 rounded-lg border border-red-200 flex items-center gap-2">
          <FaExclamationCircle className="shrink-0" /> {error}
        </div>
      )}
      {accion.tipo === 'cobrar' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <label className="block">
            <span className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Monto ($)</span>
            <input type="text" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} className={claseInput} />
          </label>
          <label className="block">
            <span className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Método</span>
            <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className={claseInput}>
              {METODOS_PAGO.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label className="block col-span-2 sm:col-span-1">
            <span className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Fecha</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={claseInput} />
          </label>
          {pideReferencia && (
            <label className="block col-span-2 sm:col-span-1">
              <span className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">N.º de operación</span>
              <input
                type="text" maxLength={100} value={referencia} onChange={(e) => setReferencia(e.target.value)}
                placeholder="Comprobante" className={claseInput}
              />
            </label>
          )}
          <label className={`block col-span-2 ${pideReferencia ? 'sm:col-span-2' : 'sm:col-span-3'}`}>
            <span className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Recibido por</span>
            <input
              type="text" maxLength={100} value={recibidoPor} onChange={(e) => setRecibidoPor(e.target.value)}
              placeholder="Quién recibió la plata" className={claseInput}
            />
          </label>
        </div>
      )}
      <label className="block">
        <span className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
          {accion.tipo === 'cobrar' ? (metodo === 'Canje' ? 'Qué se recibió a cambio *' : 'Observaciones') : 'Motivo *'}
        </span>
        <input type="text" maxLength={500} value={texto} onChange={(e) => setTexto(e.target.value)} className={claseInput} />
      </label>
      {accion.tipo === 'cobrar' && metodo === 'Canje' && (
        <p className="text-[11px] text-slate-500">El canje salda la deuda pero no entra plata a la caja.</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit" disabled={cargando}
          className={`${botonChico} ${accion.tipo === 'cobrar' ? 'bg-[#991b1b] hover:bg-[#7f1d1d] text-white' : 'bg-slate-800 hover:bg-slate-900 text-white'} disabled:opacity-60`}
        >
          {cargando ? 'Guardando...' : 'Confirmar'}
        </button>
        <button type="button" onClick={onCancelar} className={`${botonChico} bg-white border border-slate-300 text-slate-600 hover:bg-slate-100`}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// Estado de cuenta de un jugador: sus deudas con pagos, y desde acá se cobra, se marca "no corresponde" o se anula.
export default function EstadoCuentaModal({ jugador, onClose, onCambio }) {
  // Anular pagos y movimientos es solo de Superadmin y Administrador (el backend responde 403 al resto)
  const puedeAnular = useAuthStore((s) => ['Superadmin', 'Administrador'].includes(s.usuario?.rol));
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [accion, setAccion] = useState(null); // { tipo, id_cargo, pago? }
  const [cargandoDeuda, setCargandoDeuda] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await api.get(`/cobros/jugadores/${jugador.id_jugador}/estado-cuenta`);
      setDatos(res.data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.mensaje || 'No se pudo cargar el estado de cuenta.');
    }
  }, [jugador.id_jugador]);

  useEffect(() => { cargar(); }, [cargar]);

  const hecho = (mensaje) => {
    setAccion(null);
    setAviso(mensaje);
    cargar();
    onCambio?.();
  };

  const cargos = datos?.cargos || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#151f89] to-[#303a9f] text-white p-4 sm:p-5 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-widest text-blue-200 font-bold">Estado de cuenta</span>
            <h3 className="font-headline text-lg sm:text-xl uppercase tracking-wide truncate">{nombreJugador(jugador)}</h3>
            {datos && (
              <p className="text-xs text-blue-100 mt-0.5">
                Debe {formatearMonto(datos.deuda_total)}
                {Number(datos.deuda_vencida) > 0 && <> · <strong className="text-white">{formatearMonto(datos.deuda_vencida)} vencido</strong></>}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 shrink-0" aria-label="Cerrar">
            <FaTimes />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {aviso ? <p className="text-xs text-emerald-700 font-title font-bold">{aviso}</p> : <span />}
            <button
              onClick={() => setCargandoDeuda(true)}
              className="flex items-center gap-1.5 bg-[#991b1b] hover:bg-[#7f1d1d] text-white px-3 py-1.5 rounded-lg text-[11px] font-headline uppercase tracking-wider"
            >
              <FaPlus className="text-[10px]" /> Cargar deuda
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200 flex items-center gap-2">
              <FaExclamationCircle /> {error}
            </div>
          )}
          {!datos && !error && <div className="py-10 text-center text-slate-400 font-title text-sm">Cargando...</div>}
          {datos && cargos.length === 0 && (
            <div className="py-10 text-center text-slate-500 font-title text-sm">No tiene deudas cargadas.</div>
          )}

          {cargos.map((c) => {
            const accionAca = accion && accion.id_cargo === c.id_cargo ? accion : null;
            const cobrable = !c.no_corresponde && Number(c.saldo) > 0;
            const pagosActivos = (c.pagos || []).filter((p) => p.activo);
            return (
              <div key={c.id_cargo} className={`border rounded-xl p-3 ${c.estado === 'Vencida' ? 'border-red-200' : 'border-slate-200'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-title font-bold text-slate-900 text-sm">{tituloDeuda(c)}</div>
                    <div className="text-[11px] text-slate-500">
                      Vence {formatFecha(c.fecha_vencimiento)}
                      {c.nombre_equipo ? ` · ${c.nombre_equipo}` : ''}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${COLOR_ESTADO_DEUDA[c.estado] || ''}`}>
                    {c.estado === 'Pagada' && c.tiene_canje ? 'Canje' : c.estado}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 text-xs font-title">
                  <div><span className="block text-[10px] text-slate-400 uppercase">Monto</span>{formatearMonto(c.monto)}</div>
                  <div><span className="block text-[10px] text-slate-400 uppercase">Pagado</span>{formatearMonto(c.pagado)}</div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Saldo</span>
                    <strong className={Number(c.saldo) > 0 ? 'text-red-700' : 'text-emerald-700'}>{formatearMonto(c.saldo)}</strong>
                  </div>
                </div>

                {c.no_corresponde && (
                  <p className="mt-2 text-[11px] text-slate-500">No corresponde: {c.motivo_no_corresponde}</p>
                )}

                {(c.pagos || []).length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {c.pagos.map((p) => (
                      <li key={p.id_pago} className={`flex flex-wrap items-center justify-between gap-2 text-[11px] bg-slate-50 rounded-lg px-2.5 py-1.5 ${p.activo ? '' : 'opacity-60'}`}>
                        <span className={p.activo ? 'text-slate-700' : 'text-slate-500 line-through'}>
                          {formatFecha(p.fecha_pago)} · {formatearMonto(p.monto)} · {p.metodo_pago}
                          {p.referencia ? ` n.º ${p.referencia}` : ''}
                          {p.recibido_por ? ` · recibió ${p.recibido_por}` : ''}
                          {p.observaciones ? ` · ${p.observaciones}` : ''}
                        </span>
                        {p.activo ? (puedeAnular && (
                          <button
                            onClick={() => setAccion({ tipo: 'anular', id_cargo: c.id_cargo, pago: p })}
                            className="text-red-700 hover:underline font-bold"
                          >
                            Anular
                          </button>
                        )) : (
                          <span className="text-slate-500">Anulado: {p.motivo_anulacion}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {!accionAca && (cobrable || (!c.no_corresponde && pagosActivos.length === 0)) && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {cobrable && (
                      <button
                        onClick={() => setAccion({ tipo: 'cobrar', id_cargo: c.id_cargo })}
                        className={`${botonChico} bg-[#991b1b] hover:bg-[#7f1d1d] text-white`}
                      >
                        Cobrar
                      </button>
                    )}
                    {!c.no_corresponde && pagosActivos.length === 0 && (
                      <button
                        onClick={() => setAccion({ tipo: 'no_corresponde', id_cargo: c.id_cargo })}
                        className={`${botonChico} bg-white border border-slate-300 text-slate-600 hover:bg-slate-100`}
                      >
                        No corresponde
                      </button>
                    )}
                  </div>
                )}

                {accionAca && (
                  <FormAccion accion={accionAca} cargo={c} onCancelar={() => setAccion(null)} onHecho={hecho} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {cargandoDeuda && (
        <CargarDeudaModal
          jugadorFijo={jugador}
          onClose={() => setCargandoDeuda(false)}
          onCargado={hecho}
        />
      )}
    </div>
  );
}
