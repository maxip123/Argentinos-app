import React from 'react';
import ClubShield from '../ui/ClubShield';
import { FaShieldAlt } from 'react-icons/fa';
import { formatFecha, formatHora } from '../../utils/fechas';

export default function MatchCard({ partido }) {
  const {
    jornada_numero,
    nombre_partido,
    fecha_partido,
    equipo_local,
    logo_local,
    local_es_argentinos,
    goles_local,
    equipo_visitante,
    logo_visitante,
    visitante_es_argentinos,
    goles_visitante,
    estado_partido, // 0 = Programado, 1 = En Vivo, 2 = Finalizado, 3 = Suspendido
    nombre_sede,
    nombre_division,
    juega_argentinos,
  } = partido;

  const fechaStr = formatHora(fecha_partido)
    ? `${formatFecha(fecha_partido, { day: 'numeric', month: 'short', year: 'numeric' })}, ${formatHora(fecha_partido)} hs`
    : 'A confirmar';

  const esEnVivo = estado_partido === 1;
  const esFinalizado = estado_partido === 2;

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md ${
        juega_argentinos
          ? 'border-[#303a9f]/40 ring-1 ring-[#303a9f]/20 hover:border-[#151f89]'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Top Header */}
      <div className="bg-[#151f89] px-4 py-3 text-white flex flex-col items-center justify-center text-center gap-1">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="font-headline text-sm uppercase tracking-wider text-white">
            {nombre_partido || (jornada_numero ? `Fecha ${jornada_numero}` : 'Partido')}
          </span>

          {esEnVivo && (
            <span className="inline-flex items-center gap-1.5 bg-[#E31B23] text-white px-2 py-0.5 rounded-full text-[10px] font-headline tracking-wider animate-live">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              EN VIVO
            </span>
          )}

          {esFinalizado && (
            <span className="bg-slate-700/80 text-white/90 px-2 py-0.5 rounded text-[10px] font-title uppercase font-semibold">
              Finalizado
            </span>
          )}
        </div>

        <span className="text-white/80 font-title text-xs tracking-wide">
          {fechaStr}
        </span>
      </div>

      {/* Flag "Partido de Argentinos del Norte" */}
      {juega_argentinos && (
        <div className="bg-[#303a9f]/10 text-[#151f89] px-3 py-1 flex items-center justify-center gap-1.5 text-xs font-headline uppercase tracking-wider border-b border-[#303a9f]/10">
          <FaShieldAlt className="text-[10px]" />
          <span>Partido Oficial Club Argentinos del Norte</span>
        </div>
      )}

      {/* Body: Teams & VS / Score */}
      <div className="p-5 flex-1 flex flex-col justify-center">
        <div className="flex items-center justify-between gap-2">
          {/* Equipo Local */}
          <div className="flex flex-col items-center gap-2 w-5/12 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center p-2 shadow-inner overflow-hidden">
              {local_es_argentinos ? (
                <ClubShield className="w-full h-full object-contain" />
              ) : logo_local ? (
                <img
                  src={logo_local}
                  alt={equipo_local}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : (
                <span className="font-headline text-sm font-bold text-slate-700">
                  {equipo_local ? equipo_local.substring(0, 3).toUpperCase() : 'LOC'}
                </span>
              )}
            </div>
            <span
              className={`font-title font-bold text-xs sm:text-sm line-clamp-2 leading-tight ${
                local_es_argentinos ? 'text-[#151f89]' : 'text-slate-800'
              }`}
            >
              {equipo_local}
            </span>
          </div>

          {/* Marcador Central o VS */}
          <div className="w-2/12 flex flex-col items-center justify-center shrink-0">
            {esFinalizado || esEnVivo ? (
              <div className="flex items-center gap-1.5 font-headline text-2xl sm:text-3xl text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                <span className={goles_local > goles_visitante ? 'text-[#151f89] font-black' : ''}>
                  {goles_local ?? 0}
                </span>
                <span className="text-slate-400 text-lg">-</span>
                <span className={goles_visitante > goles_local ? 'text-[#151f89] font-black' : ''}>
                  {goles_visitante ?? 0}
                </span>
              </div>
            ) : (
              <div className="bg-[#151f89] text-white px-3 py-1 rounded-md font-headline text-sm uppercase shadow-sm">
                VS
              </div>
            )}
          </div>

          {/* Equipo Visitante */}
          <div className="flex flex-col items-center gap-2 w-5/12 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center p-2 shadow-inner overflow-hidden">
              {visitante_es_argentinos ? (
                <ClubShield className="w-full h-full object-contain" />
              ) : logo_visitante ? (
                <img
                  src={logo_visitante}
                  alt={equipo_visitante}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : (
                <span className="font-headline text-sm font-bold text-slate-700">
                  {equipo_visitante ? equipo_visitante.substring(0, 3).toUpperCase() : 'VIS'}
                </span>
              )}
            </div>
            <span
              className={`font-title font-bold text-xs sm:text-sm line-clamp-2 leading-tight ${
                visitante_es_argentinos ? 'text-[#151f89]' : 'text-slate-800'
              }`}
            >
              {equipo_visitante}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Footer Details */}
      <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-600 font-title space-y-1">
        <div className="truncate">
          <strong className="text-slate-900">Sede:</strong> {nombre_sede || 'A designar'}
        </div>
        {nombre_division && (
          <div className="truncate text-slate-500">
            <strong className="text-slate-700">División:</strong> {nombre_division}
          </div>
        )}
      </div>
    </div>
  );
}
