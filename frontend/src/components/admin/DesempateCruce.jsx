import React from 'react';
import { FaFutbol } from 'react-icons/fa';
import { necesitaDesempateFront } from '../../utils/playoffs';

const claseInput = 'w-full bg-white border border-amber-300 rounded px-2 py-1 text-center font-headline text-xs focus:outline-none';

/**
 * "¿Quién pasa?" para el partido que define un cruce cuando, con este resultado, el cruce queda empatado.
 * No muestra nada si el partido no es de un cruce o si no hace falta desempatar.
 * valor: { id_equipo_desempate, penales_local, penales_visitante } (strings de los inputs).
 */
export default function DesempateCruce({ partido, golesLocal, golesVisitante, valor, onChange }) {
  if (!necesitaDesempateFront(partido, golesLocal, golesVisitante)) return null;
  const cambiar = (campo, v) => onChange({ ...valor, [campo]: v });
  const opciones = [
    { id: partido.id_equipo_local, nombre: partido.equipo_local },
    { id: partido.id_equipo_visitante, nombre: partido.equipo_visitante },
  ];
  const esVuelta = partido.cruce_formato === 'ida_vuelta';

  return (
    <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl space-y-2.5">
      <div className="flex items-center gap-1.5 text-amber-900 font-headline text-xs uppercase tracking-wider">
        <FaFutbol className="text-xs" />
        <span>{esVuelta ? 'El global está empatado' : 'El partido terminó empatado'}</span>
      </div>
      <label className="block">
        <span className="block text-[11px] font-title font-bold text-amber-900 uppercase mb-1">¿Quién pasa? *</span>
        <select
          value={valor.id_equipo_desempate}
          onChange={(e) => cambiar('id_equipo_desempate', e.target.value)}
          className="w-full bg-white border border-amber-400 rounded-lg px-2 py-1.5 text-xs font-title font-bold text-amber-950 focus:outline-none"
        >
          <option value="">-- Elegir equipo --</option>
          {opciones.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
        </select>
      </label>
      <div>
        <span className="block text-[10px] font-title font-bold text-amber-800 uppercase mb-1">Penales (opcional, solo para mostrar)</span>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number" min="0" placeholder={partido.equipo_local}
            aria-label={`Penales de ${partido.equipo_local}`}
            value={valor.penales_local}
            onChange={(e) => cambiar('penales_local', e.target.value)}
            className={claseInput}
          />
          <input
            type="number" min="0" placeholder={partido.equipo_visitante}
            aria-label={`Penales de ${partido.equipo_visitante}`}
            value={valor.penales_visitante}
            onChange={(e) => cambiar('penales_visitante', e.target.value)}
            className={claseInput}
          />
        </div>
      </div>
    </div>
  );
}

