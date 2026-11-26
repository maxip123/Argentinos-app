import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../../api/axios';
import { FaPlus, FaExclamationCircle } from 'react-icons/fa';
import { formatearMonto, etiquetaPeriodo, nombreJugador } from '../../../utils/cobros';
import EstadoCuentaModal from './EstadoCuentaModal';
import CargarDeudaModal from './CargarDeudaModal';

// Identifica una columna: el mismo concepto en el mismo período (mensual) o con la misma descripción
const claveColumna = (c) =>
  `${c.id_concepto}|${c.periodo_mes ? `${c.periodo_anio}-${c.periodo_mes}` : (c.descripcion || '').toLowerCase()}`;

function Celda({ cargo }) {
  if (!cargo) return <span className="text-slate-300">—</span>;
  if (cargo.estado === 'No corresponde') return <span className="text-slate-400 font-bold">NO</span>;
  if (cargo.estado === 'Pagada') {
    return cargo.tiene_canje
      ? <span className="text-sky-700 font-bold">Canje</span>
      : <span className="text-emerald-700 font-bold">Pagado</span>;
  }
  const color = cargo.estado === 'Vencida' ? 'text-red-700' : cargo.estado === 'Parcial' ? 'text-amber-700' : 'text-slate-700';
  return (
    <span className={`${color} font-bold whitespace-nowrap`}>
      Debe {formatearMonto(cargo.saldo)}
      {cargo.estado === 'Parcial' && <span className="block text-[10px] font-normal">parcial</span>}
    </span>
  );
}

// Planilla de un equipo: filas = jugadores del plantel, columnas = deudas cargadas a ese equipo.
// Un clic en una fila o celda abre el estado de cuenta del jugador para cobrar.
export default function PlanillaEquipo() {
  const [equipos, setEquipos] = useState([]);
  const [idEquipo, setIdEquipo] = useState('');
  const [plantel, setPlantel] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [jugadorCuenta, setJugadorCuenta] = useState(null);
  const [cargandoDeuda, setCargandoDeuda] = useState(false);

  useEffect(() => {
    api.get('/equipos?solo_argentinos=true')
      .then((res) => {
        const lista = res.data.data || [];
        setEquipos(lista);
        if (lista.length) setIdEquipo((actual) => actual || String(lista[0].id_equipo));
      })
      .catch(() => setError('No se pudieron cargar los equipos.'));
  }, []);

  const cargar = useCallback(async () => {
    if (!idEquipo) return;
    setCargando(true);
    setError('');
    try {
      const [resPlantel, resCargos] = await Promise.all([
        api.get(`/equipos/${idEquipo}/plantel`),
        api.get(`/cobros/cargos?id_equipo=${idEquipo}`),
      ]);
      setPlantel(resPlantel.data.data || []);
      setCargos(resCargos.data.data || []);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'No se pudo cargar la planilla.');
    } finally {
      setCargando(false);
    }
  }, [idEquipo]);

  useEffect(() => { cargar(); }, [cargar]);

  // Columnas en orden de vencimiento; celdas indexadas por jugador y columna
  const { columnas, celdas } = useMemo(() => {
    const cols = new Map();
    const porCelda = new Map();
    for (const c of cargos) {
      const clave = claveColumna(c);
      if (!cols.has(clave)) cols.set(clave, { clave, concepto: c.concepto, periodo: etiquetaPeriodo(c), vence: c.fecha_vencimiento });
      porCelda.set(`${c.id_jugador}|${clave}`, c);
    }
    const ordenadas = [...cols.values()].sort((a, b) => String(a.vence).localeCompare(String(b.vence)));
    return { columnas: ordenadas, celdas: porCelda };
  }, [cargos]);

  // Jugadores del plantel y, al final, quienes tienen deudas de este equipo pero ya no están en él
  const filas = useMemo(() => {
    const ids = new Set(plantel.map((j) => String(j.id_jugador)));
    const extra = new Map();
    for (const c of cargos) {
      if (!ids.has(String(c.id_jugador)) && !extra.has(String(c.id_jugador))) {
        extra.set(String(c.id_jugador), { id_jugador: c.id_jugador, nombre: c.nombre, apellido: c.apellido, fuera: true });
      }
    }
    return [...plantel, ...extra.values()];
  }, [plantel, cargos]);

  const equipoActual = equipos.find((e) => String(e.id_equipo) === String(idEquipo));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
        <select
          value={idEquipo}
          onChange={(e) => setIdEquipo(e.target.value)}
          className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
        >
          {equipos.map((eq) => (
            <option key={eq.id_equipo} value={eq.id_equipo}>
              {eq.nombre_equipo}{eq.nombre_division ? ` (${eq.nombre_division})` : ''}
            </option>
          ))}
        </select>
        <button
          onClick={() => setCargandoDeuda(true)}
          disabled={!idEquipo}
          className="flex items-center justify-center gap-2 bg-[#991b1b] hover:bg-[#7f1d1d] disabled:opacity-60 text-white px-4 py-2 rounded-xl font-headline uppercase text-xs tracking-wider shadow-sm shrink-0"
        >
          <FaPlus /> Cargar deuda al equipo
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200 flex items-center gap-2">
          <FaExclamationCircle /> {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="p-10 text-center text-slate-400 font-title text-sm">Cargando planilla...</div>
        ) : filas.length === 0 ? (
          <div className="p-10 text-center text-slate-500 font-title text-sm">El equipo no tiene jugadores en el plantel.</div>
        ) : columnas.length === 0 ? (
          <div className="p-10 text-center text-slate-500 font-title text-sm">
            Todavía no hay deudas cargadas a {equipoActual?.nombre_equipo || 'este equipo'}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-title">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider">
                  <th className="p-3 sticky left-0 z-10 bg-slate-50 min-w-[150px]">Jugador</th>
                  {columnas.map((col) => (
                    <th key={col.clave} className="p-3 min-w-[110px] align-bottom">
                      <span className="block text-slate-700 font-bold normal-case text-[11px]">{col.concepto}</span>
                      <span className="block normal-case">{col.periodo}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filas.map((j) => (
                  <tr key={j.id_jugador} className="hover:bg-slate-50/80 cursor-pointer" onClick={() => setJugadorCuenta(j)}>
                    <td className="p-3 sticky left-0 z-10 bg-white font-bold text-slate-900">
                      {nombreJugador(j)}
                      {j.fuera && <span className="block text-[10px] font-normal text-slate-400">Ya no está en el plantel</span>}
                    </td>
                    {columnas.map((col) => (
                      <td key={col.clave} className="p-3">
                        <Celda cargo={celdas.get(`${j.id_jugador}|${col.clave}`)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {jugadorCuenta && (
        <EstadoCuentaModal jugador={jugadorCuenta} onClose={() => setJugadorCuenta(null)} onCambio={cargar} />
      )}
      {cargandoDeuda && (
        <CargarDeudaModal equipoInicial={idEquipo} onClose={() => setCargandoDeuda(false)} onCargado={cargar} />
      )}
    </div>
  );
}
