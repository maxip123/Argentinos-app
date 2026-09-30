import React from 'react';
import ClubShield from '../components/ui/ClubShield';
import { FaMapMarkerAlt, FaTrophy, FaUsers, FaHeart, FaShieldAlt } from 'react-icons/fa';

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f5f2fc] pb-16">
      {/* ─── Header / Hero ─────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 py-12 lg:py-16">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="flex justify-center mb-2">
            <ClubShield className="w-16 h-20" />
          </div>
          <span className="font-headline tracking-[0.25em] text-[#151f89] uppercase text-xs font-bold">
            TRADICIÓN Y GLORIA DEPORTIVA
          </span>
          <h1 className="font-headline text-4xl sm:text-5xl lg:text-6xl text-[#151f89] uppercase tracking-wider">
            Sobre Nosotros
          </h1>
          <p className="font-body text-slate-600 max-w-2xl mx-auto text-base sm:text-lg">
            Conocé la historia, los valores y la pasión que hacen de Argentinos del Norte un referente del Futsal en Tucumán.
          </p>
        </div>
      </header>

      {/* ─── Cuerpo Principal ──────────────────────────────────────────────── */}
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Historia & Identidad */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#151f89] font-headline uppercase text-sm">
              <FaShieldAlt />
              <span>Nuestra Historia</span>
            </div>
            <h2 className="font-headline text-2xl sm:text-4xl text-slate-900 uppercase tracking-wide leading-tight">
              Un Siglo de Deporte y Pasión en Tucumán
            </h2>
            <p className="font-body text-slate-600 leading-relaxed text-sm sm:text-base">
              El Club Atlético Argentinos del Norte es una de las instituciones más tradicionales y queridas
              del deporte tucumano. Con el surgimiento y profesionalización del Futsal AFA, el club conformó
              equipos altamente competitivos en ramas masculinas y femeninas, destacando por su garra,
              disciplina táctica y sentido de pertenencia.
            </p>
            <p className="font-body text-slate-600 leading-relaxed text-sm sm:text-base">
              Hoy contamos con planteles en Primera División, Reserva, divisiones juveniles y formativas,
              además de un cuerpo técnico dedicado al crecimiento integral de cada deportista.
            </p>
          </div>

          <div className="bg-[#151f89] text-white p-8 rounded-2xl space-y-6 shadow-md">
            <h3 className="font-headline text-2xl uppercase tracking-wider border-b border-white/20 pb-3">
              Valores del Sagrado
            </h3>
            <div className="space-y-4 font-body">
              <div className="flex items-start gap-3">
                <FaTrophy className="text-[#FF9C67] text-xl shrink-0 mt-1" />
                <div>
                  <h4 className="font-title font-bold text-base uppercase">Excelencia Deportiva</h4>
                  <p className="text-white/80 text-xs sm:text-sm">
                    Entrenamientos de alta intensidad y preparación táctica para competir en lo más alto de la Liga.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FaUsers className="text-[#FF9C67] text-xl shrink-0 mt-1" />
                <div>
                  <h4 className="font-title font-bold text-base uppercase">Comunidad y Formación</h4>
                  <p className="text-white/80 text-xs sm:text-sm">
                    Un espacio de contención, amistad y desarrollo para jóvenes y niños de toda la provincia.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FaHeart className="text-[#FF9C67] text-xl shrink-0 mt-1" />
                <div>
                  <h4 className="font-title font-bold text-base uppercase">Sentido de Pertenencia</h4>
                  <p className="text-white/80 text-xs sm:text-sm">
                    Amor a la camiseta y respeto por los rivales dentro y fuera del 40x20.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Predio y Contacto */}
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-[#151f89] font-headline uppercase text-sm">
            <FaMapMarkerAlt />
            <span>Instalaciones</span>
          </div>
          <h2 className="font-headline text-2xl sm:text-3xl text-slate-900 uppercase tracking-wide">
            Predio Deportivo Central
          </h2>
          <p className="font-body text-slate-600 max-w-3xl text-sm sm:text-base leading-relaxed">
            Ubicado en <strong>Av. Benjamín Aráoz 650</strong>, en San Miguel de Tucumán, el predio cuenta con
            canchas techadas de piso flotante homologadas, iluminación LED de última generación y vestuarios
            renovados para el desarrollo de torneos oficiales de la Liga Futsal AFA.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center">
              <span className="font-headline text-3xl text-[#151f89] block mb-1">40 x 20</span>
              <span className="font-title text-slate-600 text-xs uppercase font-bold">Medidas Reglamentarias</span>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center">
              <span className="font-headline text-3xl text-[#151f89] block mb-1">+200</span>
              <span className="font-title text-slate-600 text-xs uppercase font-bold">Jugadores y Jugadoras</span>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center">
              <span className="font-headline text-3xl text-[#151f89] block mb-1">100%</span>
              <span className="font-title text-slate-600 text-xs uppercase font-bold">Pasión Tucumana</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
