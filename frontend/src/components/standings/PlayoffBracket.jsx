import React, { useState } from 'react';
import { FaTrophy, FaProjectDiagram } from 'react-icons/fa';
import EscudoEquipo from '../ui/EscudoEquipo';
import {
  ETIQUETA_COPA,
  agruparPorFase,
  campeonDeLlaves,
  copasDe,
  ganadorDeLlave,
  normalizarLlave,
  resumenCruce,
  detalleCruce,
  adjuntarPartidos,
} from '../../utils/playoffs';

// partidos: en el historial, los partidos del snapshot (con id_llave) para mostrar el detalle de cada cruce
export default function PlayoffBracket({ llaves: llavesRecibidas = [], partidos: partidosHistorial = null, cargando = false }) {
  const [copaElegida, setCopaElegida] = useState(null);

  if (cargando) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
        <div className="w-10 h-10 border-4 border-[#151f89] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="font-headline text-slate-500 uppercase tracking-wider text-sm">
          Cargando fase eliminatoria...
        </p>
      </div>
    );
  }

  if (!llavesRecibidas || llavesRecibidas.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
          <FaTrophy className="text-3xl" />
        </div>
        <div>
          <h3 className="font-headline text-slate-900 text-xl uppercase tracking-wide">
            Fase Eliminatoria aún no definida
          </h3>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 font-body">
            Los cruces de playoff se programarán una vez finalizada la fase regular de este torneo.
          </p>
        </div>
      </div>
    );
  }

  const todasLasLlaves = adjuntarPartidos(llavesRecibidas, partidosHistorial).map(normalizarLlave);
  const copas = copasDe(todasLasLlaves);
  const copaActiva = copas.includes(copaElegida) ? copaElegida : copas[0];
  const hayCopas = copaActiva !== 'Unica';
  const llaves = todasLasLlaves.filter((l) => l.copa === copaActiva);

  const { fasesMap, fasesOrdenadas } = agruparPorFase(llaves);

  const esPorPenales = (llave) =>
    llave.estado_partido === 2 &&
    llave.goles_local !== null &&
    llave.goles_visitante !== null &&
    llave.goles_local === llave.goles_visitante &&
    llave.id_equipo_ganador != null;

  const campeon = campeonDeLlaves(llaves);
  const campeonNombre = campeon?.nombre ?? null;
  const campeonEsClub = campeon?.esClub ?? false;

  return (
    <div className="space-y-6">
      {hayCopas && copas.length > 1 && (
        <div className="flex justify-center">
          <div className="flex items-center gap-1.5 bg-white rounded-full p-1.5 border border-slate-200 shadow-sm">
            {copas.map((copa) => (
              <button
                key={copa}
                type="button"
                onClick={() => setCopaElegida(copa)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full font-headline uppercase text-xs sm:text-sm tracking-wider transition-all whitespace-nowrap ${
                  copa === copaActiva
                    ? 'bg-[#151f89] text-white shadow-md'
                    : 'text-slate-600 hover:text-[#151f89] hover:bg-slate-100/60'
                }`}
              >
                <FaTrophy className={copa === copaActiva ? 'text-white' : copa === 'Oro' ? 'text-amber-500' : 'text-slate-400'} />
                <span>{ETIQUETA_COPA[copa]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#151f89] flex items-center justify-center">
              <FaProjectDiagram className="text-lg" />
            </div>
            <div>
              <h3 className="font-headline text-slate-900 text-xl uppercase tracking-wide">
                {hayCopas ? ETIQUETA_COPA[copaActiva] : 'Cuadro de Eliminación Directa'}
              </h3>
              <p className="text-xs text-slate-500 font-body">
                Definición del campeonato por eliminación simple hacia la gran final.
              </p>
            </div>
          </div>

          {campeonNombre && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-amber-900 font-headline uppercase text-xs tracking-wider shadow-2xs">
              <FaTrophy className="text-amber-600 text-base" />
              <span>
                {hayCopas ? `Campeón ${ETIQUETA_COPA[copaActiva]}` : 'Campeón Oficial'}: <strong>{campeonNombre}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Diagrama Horizontal con Scroll */}
        <div className="relative overflow-x-auto pb-4">
          {/* Marca de agua del club */}
          <img
            src="/gemini-svg.svg"
            alt=""
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 opacity-5 pointer-events-none select-none z-0"
          />

          <div className="flex items-stretch min-w-max gap-8 relative z-10 py-2 px-1">
            {fasesOrdenadas.map((faseNombre) => {
              const llavesDeFase = fasesMap[faseNombre].sort(
                (a, b) => a.orden - b.orden
              );

              return (
                <div
                  key={faseNombre}
                  className="flex flex-col justify-around w-64 sm:w-72 shrink-0 gap-6"
                >
                  {/* Etiqueta de la Fase */}
                  <div className="bg-[#151f89] text-white py-2 px-3 rounded-xl text-center shadow-xs">
                    <span className="font-headline uppercase tracking-wider text-xs font-bold block">
                      {faseNombre}
                    </span>
                  </div>

                  {/* Partidos de la Fase */}
                  <div className="flex flex-col justify-around flex-1 gap-5">
                    {llavesDeFase.map((llave) => {
                      const ganadorId = ganadorDeLlave(llave);
                      const penales = esPorPenales(llave);
                      const resumen = resumenCruce(llave);
                      const detalle = detalleCruce(llave);
                      const localGano =
                        ganadorId !== null &&
                        ganadorId === Number(llave.id_equipo_local);
                      const visitGano =
                        ganadorId !== null &&
                        ganadorId === Number(llave.id_equipo_visitante);

                      return (
                        <div
                          key={llave.id_llave}
                          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-[#151f89]/60 transition-all"
                        >
                          {/* Estado */}
                          <div className="bg-slate-50 px-3 py-1 border-b border-slate-100 flex items-center justify-between text-[10px] font-headline uppercase text-slate-500">
                            <span>Partido {llave.orden}</span>
                            {llave.estado_partido === 2 ? (
                              <span className="text-emerald-700 font-bold">
                                {penales ? 'Desempate' : 'Finalizado'}
                              </span>
                            ) : llave.estado_partido === 1 ? (
                              <span className="text-amber-700 font-bold">En juego</span>
                            ) : (
                              <span className="text-slate-400">Por Jugar</span>
                            )}
                          </div>

                          {/* Local */}
                          <div
                            className={`flex items-center justify-between px-3 py-2 border-b border-slate-100 transition-colors ${
                              localGano
                                ? 'bg-emerald-50/80 font-bold text-emerald-950'
                                : 'text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                <EscudoEquipo
                                  logoUrl={llave.logo_local}
                                  esClub={llave.local_es_argentinos}
                                  nombre={llave.equipo_local_nombre || 'Por Definir'}
                                  nombreCorto={llave.nombre_corto_local}
                                  letras={1}
                                  textoClassName="text-[10px] font-bold text-slate-500 leading-none"
                                />
                              </div>
                              <span className="text-xs truncate font-title">
                                {llave.equipo_local_nombre || 'Por Definir'}
                              </span>
                              {localGano && penales && (
                                <span className="bg-amber-100 text-amber-800 text-[9px] font-headline uppercase px-1 rounded font-bold">
                                  PEN
                                </span>
                              )}
                            </div>
                            <span
                              className={`min-w-6 text-center text-xs font-headline px-1.5 py-0.5 rounded ${
                                localGano
                                  ? 'bg-emerald-200/80 text-emerald-900 font-bold'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {resumen.global ? resumen.global.local : '-'}
                            </span>
                          </div>

                          {/* Visitante */}
                          <div
                            className={`flex items-center justify-between px-3 py-2 transition-colors ${
                              visitGano
                                ? 'bg-emerald-50/80 font-bold text-emerald-950'
                                : 'text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                <EscudoEquipo
                                  logoUrl={llave.logo_visitante}
                                  esClub={llave.visitante_es_argentinos}
                                  nombre={llave.equipo_visitante_nombre || 'Por Definir'}
                                  nombreCorto={llave.nombre_corto_visitante}
                                  letras={1}
                                  textoClassName="text-[10px] font-bold text-slate-500 leading-none"
                                />
                              </div>
                              <span className="text-xs truncate font-title">
                                {llave.equipo_visitante_nombre || 'Por Definir'}
                              </span>
                              {visitGano && penales && (
                                <span className="bg-amber-100 text-amber-800 text-[9px] font-headline uppercase px-1 rounded font-bold">
                                  PEN
                                </span>
                              )}
                            </div>
                            <span
                              className={`min-w-6 text-center text-xs font-headline px-1.5 py-0.5 rounded ${
                                visitGano
                                  ? 'bg-emerald-200/80 text-emerald-900 font-bold'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {resumen.global ? resumen.global.visitante : '-'}
                            </span>
                          </div>

                          {detalle && (
                            <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50 text-[10px] font-title text-slate-600">
                              {detalle}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Columna de Campeón */}
            <div className="flex flex-col justify-center items-center w-56 shrink-0 text-center pl-4 border-l border-slate-200/80">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 border-2 border-amber-300 text-amber-600 flex items-center justify-center shadow-md mb-3">
                <FaTrophy className="text-3xl" />
              </div>
              <span className="font-headline uppercase tracking-widest text-xs text-amber-800 font-bold block">
                {hayCopas ? `CAMPEÓN ${ETIQUETA_COPA[copaActiva]}` : 'CAMPEÓN DEL TORNEO'}
              </span>
              <h4 className="font-headline text-lg text-slate-900 uppercase tracking-wide mt-1 flex items-center justify-center gap-1.5">
                {/* Junto al nombre solo va un escudo real: las iniciales repetirían el nombre */}
                {campeon && (campeon.logo || campeonEsClub) && (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                    <EscudoEquipo
                      logoUrl={campeon.logo}
                      esClub={campeonEsClub}
                      nombre={campeonNombre}
                      nombreCorto={campeon.nombreCorto}
                      letras={1}
                      textoClassName="text-[10px] font-bold text-slate-500 leading-none"
                    />
                  </span>
                )}
                <span>{campeonNombre || 'Por Definir'}</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-title block mt-1">
                {campeonNombre
                  ? '¡Consagrado en la Liga Futsal AFA!'
                  : 'Aguardando el resultado de la gran Final'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
