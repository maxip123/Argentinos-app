import React from 'react';
import ClubShield from '../ui/ClubShield';
import Paginacion from '../ui/Paginacion';
import usePaginacion from '../../hooks/usePaginacion';
import { FaFutbol } from 'react-icons/fa';

export default function ScorersTable({ goleadores = [], cargando = false, soloClub = false, onToggleSoloClub }) {
  const paginacion = usePaginacion(goleadores, 15);

  if (cargando) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
        <div className="w-10 h-10 border-4 border-[#151f89] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="font-title text-slate-500 font-semibold uppercase tracking-wider text-sm">
          Cargando tabla de goleadores...
        </p>
      </div>
    );
  }

  if (!goleadores || goleadores.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
        <p className="font-headline text-slate-700 text-lg uppercase tracking-wide">
          No hay goles registrados todavía
        </p>
        <p className="text-slate-500 text-sm mt-1 font-body">
          Los goles se cargarán a medida que se disputen los partidos de la división.
        </p>
      </div>
    );
  }

  return (
    <div id={paginacion.idLista} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden scroll-mt-24">
      {/* Header con filtro "Solo Argentinos del Norte" */}
      <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-headline text-slate-900 text-lg uppercase tracking-wide flex items-center gap-2">
            <FaFutbol className="text-[#151f89]" />
            Tabla de Goleadores
          </h3>
          <p className="text-xs text-slate-500 font-title">
            Máximos artilleros del torneo
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-blue-50 text-[#151f89] border border-blue-200 px-3 py-1 rounded-full text-xs font-title font-bold shadow-2xs">
          <ClubShield className="w-4 h-4 shrink-0" />
          <span>Estadísticas Exclusivas del Club</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead>
            <tr className="bg-[#efecf6] text-[#454652] uppercase tracking-wider border-b border-slate-200 font-headline text-xs">
              <th className="py-3 px-3 w-16 text-center">POS</th>
              <th className="py-3 px-4">JUGADOR</th>
              <th className="py-3 px-4">EQUIPO</th>
              <th className="py-3 px-6 text-center font-headline text-[#151f89]">GOLES</th>
            </tr>
          </thead>
          <tbody className="font-body text-sm divide-y divide-slate-100">
            {paginacion.visibles.map((jugador, index) => {
              const pos = paginacion.desde + index + 1;
              const esClub = jugador.es_jugador_club || jugador.es_argentinos_del_norte;

              return (
                <tr
                  key={`${jugador.id_jugador}-${jugador.nombre_equipo}-${index}`}
                  className={`transition-colors ${
                    esClub ? 'bg-blue-50/50 hover:bg-blue-100/50' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Posición */}
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

                  {/* Jugador */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                        {jugador.foto_url ? (
                          <img
                            src={jugador.foto_url}
                            alt={jugador.nombre}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-headline text-xs text-slate-600 font-bold">
                            {jugador.nombre ? jugador.nombre[0] : ''}
                            {jugador.apellido ? jugador.apellido[0] : ''}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-title text-base font-bold text-slate-900 leading-tight">
                            {jugador.apellido}, {jugador.nombre}
                          </span>
                          {esClub && (
                            <span className="bg-[#151f89] text-white text-[10px] px-1.5 py-0.5 rounded font-headline uppercase tracking-wider">
                              Club
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Equipo */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2 text-slate-700 font-title text-sm font-semibold">
                      {esClub && <ClubShield className="w-4 h-5" />}
                      <span>{jugador.nombre_equipo}</span>
                    </div>
                  </td>

                  {/* Total de Goles */}
                  <td className="py-3.5 px-6 text-center font-headline text-2xl text-[#151f89] font-black">
                    {jugador.goles}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Paginacion paginacion={paginacion} singular="goleador" plural="goleadores" className="p-4 border-t border-slate-100" />
    </div>
  );
}
