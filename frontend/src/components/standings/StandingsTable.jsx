import React from 'react';
import ClubShield from '../ui/ClubShield';

export default function StandingsTable({ clasificacion = [], cargando = false }) {
  if (cargando) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
        <div className="w-10 h-10 border-4 border-[#151f89] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="font-title text-slate-500 font-semibold uppercase tracking-wider text-sm">
          Cargando tabla de posiciones...
        </p>
      </div>
    );
  }

  if (!clasificacion || clasificacion.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
        <p className="font-headline text-slate-700 text-lg uppercase tracking-wide">
          No hay posiciones registradas
        </p>
        <p className="text-slate-500 text-sm mt-1 font-body">
          La tabla de posiciones se actualizará automáticamente al finalizar los partidos.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-[#efecf6] text-[#454652] uppercase tracking-wider border-b-2 border-slate-200 font-headline text-xs sm:text-sm">
              <th className="py-3.5 px-3 w-16 text-center">POS</th>
              <th className="py-3.5 px-4">EQUIPO</th>
              <th className="py-3.5 px-2.5 text-center font-title" title="Partidos Jugados">PJ</th>
              <th className="py-3.5 px-2.5 text-center font-title" title="Partidos Ganados">PG</th>
              <th className="py-3.5 px-2.5 text-center font-title" title="Partidos Empatados">PE</th>
              <th className="py-3.5 px-2.5 text-center font-title" title="Partidos Perdidos">PP</th>
              <th className="py-3.5 px-2.5 text-center font-title" title="Goles a Favor">GF</th>
              <th className="py-3.5 px-2.5 text-center font-title" title="Goles en Contra">GC</th>
              <th className="py-3.5 px-2.5 text-center font-title" title="Diferencia de Gol">DG</th>
              <th className="py-3.5 px-4 text-center font-headline text-[#151f89] text-base" title="Puntos">PTS</th>
            </tr>
          </thead>
          <tbody className="font-body text-sm text-slate-800 divide-y divide-slate-100">
            {clasificacion.map((fila, index) => {
              const pos = index + 1;
              const esClub = fila.es_argentinos_del_norte;
              const difGol = fila.diferencia_gol;

              return (
                <tr
                  key={fila.id_clasificacion || fila.id_equipo || index}
                  className={`transition-colors duration-150 ${
                    esClub
                      ? 'bg-blue-50/70 hover:bg-blue-100/60 font-medium'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* Posición con medalla */}
                  <td className="py-3.5 px-3 text-center">
                    {pos === 1 ? (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FFDF00] to-[#D4AF37] text-white flex items-center justify-center font-headline text-xs mx-auto shadow-sm border border-[#DAA520]/50 font-bold">
                        1
                      </div>
                    ) : pos === 2 ? (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E0E0E0] to-[#BDBDBD] text-white flex items-center justify-center font-headline text-xs mx-auto shadow-sm border border-[#9E9E9E]/50 font-bold">
                        2
                      </div>
                    ) : pos === 3 ? (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#CD7F32] to-[#A0522D] text-white flex items-center justify-center font-headline text-xs mx-auto shadow-sm border border-[#8B4513]/50 font-bold">
                        3
                      </div>
                    ) : (
                      <span className="font-title font-bold text-slate-500 text-sm">{pos}</span>
                    )}
                  </td>

                  {/* Nombre y Logo del Equipo */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 p-0.5">
                        {esClub ? (
                          <ClubShield className="w-full h-full object-contain" />
                        ) : fila.logo_url ? (
                          <img
                            src={fila.logo_url}
                            alt={fila.nombre_equipo}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) e.target.nextSibling.style.display = 'inline';
                            }}
                          />
                        ) : (
                          <span className="font-headline text-xs font-bold text-slate-600">
                            {(fila.nombre_corto || fila.nombre_equipo || 'EQ').substring(0, 3).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`font-title text-base sm:text-lg leading-tight ${
                            esClub ? 'text-[#151f89] font-bold' : 'text-slate-900 font-semibold'
                          }`}
                        >
                          {fila.nombre_equipo}
                        </span>
                        {esClub && (
                          <span className="bg-[#151f89] text-white text-[10px] px-1.5 py-0.5 rounded font-headline uppercase tracking-wider">
                            Club
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Stats */}
                  <td className="py-3.5 px-2.5 text-center text-slate-600 font-medium">{fila.partidos_jugados}</td>
                  <td className="py-3.5 px-2.5 text-center text-slate-600 font-medium">{fila.partidos_ganados}</td>
                  <td className="py-3.5 px-2.5 text-center text-slate-600 font-medium">{fila.partidos_empatados}</td>
                  <td className="py-3.5 px-2.5 text-center text-slate-600 font-medium">{fila.partidos_perdidos}</td>
                  <td className="py-3.5 px-2.5 text-center text-slate-600 font-medium">{fila.goles_a_favor}</td>
                  <td className="py-3.5 px-2.5 text-center text-slate-600 font-medium">{fila.goles_en_contra}</td>

                  {/* Diferencia de Gol */}
                  <td className="py-3.5 px-2.5 text-center font-bold">
                    <span
                      className={
                        difGol > 0
                          ? 'text-emerald-700'
                          : difGol < 0
                          ? 'text-red-600'
                          : 'text-slate-500'
                      }
                    >
                      {difGol > 0 ? `+${difGol}` : difGol}
                    </span>
                  </td>

                  {/* Puntos */}
                  <td className="py-3.5 px-4 text-center font-headline text-xl sm:text-2xl text-[#151f89] font-black">
                    {fila.puntos}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Referencias al pie */}
      <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 font-title gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#151f89]/20 border border-[#151f89]/50"></span>
            Equipo de Argentinos del Norte
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#D4AF37]"></span>
            Líder del torneo
          </span>
        </div>
        <span>PJ: Jugados | PG: Ganados | PE: Empatados | PP: Perdidos | DG: Diferencia de Gol | PTS: Puntos</span>
      </div>
    </div>
  );
}
