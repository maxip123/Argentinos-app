import React from 'react';
import MatchCard from '../matches/MatchCard';

export default function FixtureList({ partidos = [], cargando = false }) {
  if (cargando) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
        <div className="w-10 h-10 border-4 border-[#151f89] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="font-title text-slate-500 font-semibold uppercase tracking-wider text-sm">
          Cargando partidos de la división...
        </p>
      </div>
    );
  }

  if (!partidos || partidos.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
        <p className="font-headline text-slate-700 text-lg uppercase tracking-wide">
          No hay partidos programados
        </p>
        <p className="text-slate-500 text-sm mt-1 font-body">
          Próximamente se publicará el calendario de fechas para esta categoría.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {partidos.map((partido) => (
        <MatchCard key={partido.id_partido} partido={partido} />
      ))}
    </div>
  );
}
