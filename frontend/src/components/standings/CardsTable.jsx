import React from 'react';
import ClubShield from '../ui/ClubShield';

export default function CardsTable({ tarjetas = [], cargando = false, soloClub = false, onToggleSoloClub }) {
  if (cargando) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
        <div className="w-10 h-10 border-4 border-[#151f89] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="font-title text-slate-500 font-semibold uppercase tracking-wider text-sm">
          Cargando tabla de tarjetas...
        </p>
      </div>
    );
  }

  if (!tarjetas || tarjetas.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
        <p className="font-headline text-slate-700 text-lg uppercase tracking-wide">
          Sin tarjetas registradas
        </p>
        <p className="text-slate-500 text-sm mt-1 font-body">
          No hay sanciones o amonestaciones registradas en esta división.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-headline text-slate-900 text-lg uppercase tracking-wide flex items-center gap-2">
            Control Disciplinario y Tarjetas
          </h3>
          <p className="text-xs text-slate-500 font-title">
            Acumulación de tarjetas amarillas y rojas
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-blue-50 text-[#151f89] border border-blue-200 px-3 py-1 rounded-full text-xs font-title font-bold shadow-2xs">
          <ClubShield className="w-4 h-4 shrink-0" />
          <span>Control Disciplinario del Club</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead>
            <tr className="bg-[#efecf6] text-[#454652] uppercase tracking-wider border-b border-slate-200 font-headline text-xs">
              <th className="py-3 px-3 w-16 text-center">#</th>
              <th className="py-3 px-4">JUGADOR</th>
              <th className="py-3 px-4">EQUIPO</th>
              <th className="py-3 px-3 text-center">
                <span className="inline-block w-4 h-5 bg-amber-400 rounded-xs shadow-xs border border-amber-500" title="Amarillas"></span>
              </th>
              <th className="py-3 px-3 text-center">
                <span className="inline-block w-4 h-5 bg-red-600 rounded-xs shadow-xs border border-red-700" title="Rojas"></span>
              </th>
            </tr>
          </thead>
          <tbody className="font-body text-sm divide-y divide-slate-100">
            {tarjetas.map((jugador, index) => {
              const esClub = jugador.es_jugador_club || jugador.es_argentinos_del_norte;

              return (
                <tr
                  key={jugador.id_jugador || index}
                  className={`transition-colors ${
                    esClub ? 'bg-blue-50/50 hover:bg-blue-100/50' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-3.5 px-3 text-center font-title font-bold text-slate-500">
                    {index + 1}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-title text-base font-bold text-slate-900">
                        {jugador.apellido}, {jugador.nombre}
                      </span>
                      {esClub && (
                        <span className="bg-[#151f89] text-white text-[10px] px-1.5 py-0.5 rounded font-headline uppercase tracking-wider">
                          Club
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2 text-slate-700 font-title text-sm font-semibold">
                      {esClub && <ClubShield className="w-4 h-5" />}
                      <span>{jugador.nombre_equipo}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-center font-headline text-lg text-amber-600 font-bold">
                    {jugador.amarillas}
                  </td>
                  <td className="py-3.5 px-3 text-center font-headline text-lg text-red-600 font-bold">
                    {jugador.rojas}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
