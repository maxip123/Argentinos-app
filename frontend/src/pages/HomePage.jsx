import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import ClubShield from '../components/ui/ClubShield';
import MatchCard from '../components/matches/MatchCard';
import { FaFutbol, FaChevronRight, FaMapMarkerAlt, FaUsers } from 'react-icons/fa';

export default function HomePage() {
  const [proximosPartidos, setProximosPartidos] = useState([]);
  const [cargandoPartidos, setCargandoPartidos] = useState(true);

  useEffect(() => {
    // Cargar Próximos Partidos
    api
      .get('/partidos/proximos')
      .then((res) => {
        setProximosPartidos(res.data.data || []);
      })
      .catch((err) => console.error('Error cargando partidos:', err))
      .finally(() => setCargandoPartidos(false));
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f2fc]">
      {/* ─── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#151f89] text-white py-16 lg:py-24 border-b border-[#303a9f]">
        {/* Background Overlay & Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0e1666]/90 via-[#151f89] to-[#151f89] z-0"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#303a9f]/30 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          <div className="mb-6 transform hover:scale-105 transition-transform">
            <ClubShield className="w-24 h-28 sm:w-28 sm:h-32" />
          </div>

          <span className="font-headline tracking-[0.25em] text-[#a7aeff] uppercase text-xs sm:text-sm font-bold mb-2">
            LIGA FUTSAL AFA TUCUMÁN
          </span>

          <h1 className="font-headline text-4xl sm:text-6xl lg:text-7xl uppercase tracking-wider mb-4 leading-none text-white drop-shadow-md">
            Argentinos del Norte
          </h1>

          <p className="font-body text-base sm:text-xl text-white/80 max-w-2xl mb-8 leading-relaxed font-normal">
            La pasión, la agilidad y la disciplina del Futsal profesional. Seguí las posiciones,
            goleadores, fixture y estadísticas de todos nuestros planteles.
          </p>

          {/* Botones de acceso rápido a ramas */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/masculino"
              className="bg-white text-[#151f89] hover:bg-[#efecf6] px-8 py-3.5 rounded-full font-headline text-base sm:text-lg uppercase tracking-wider shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <FaFutbol />
              <span>Futsal Masculino</span>
            </Link>

            <Link
              to="/femenino"
              className="bg-[#303a9f] text-white hover:bg-[#303a9f]/90 border border-white/20 px-8 py-3.5 rounded-full font-headline text-base sm:text-lg uppercase tracking-wider shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <FaFutbol />
              <span>Futsal Femenino</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Contenedor Principal ─────────────────────────────────────────── */}
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 flex-1 w-full">
        {/* Sección: Próximos Partidos */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#151f89] font-headline uppercase text-sm tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#151f89]"></span>
                <span>Fixture Oficial</span>
              </div>
              <h2 className="font-headline text-2xl sm:text-3xl text-slate-900 uppercase tracking-wide mt-1">
                Próximos Partidos
              </h2>
            </div>

            <Link
              to="/masculino"
              className="inline-flex items-center gap-1.5 text-sm font-title font-bold text-[#151f89] hover:text-[#303a9f] transition-colors"
            >
              <span>Ver fixture completo</span>
              <FaChevronRight className="text-xs" />
            </Link>
          </div>

          {cargandoPartidos ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-white rounded-2xl animate-pulse border border-slate-200"></div>
              ))}
            </div>
          ) : proximosPartidos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {proximosPartidos.slice(0, 6).map((partido) => (
                <MatchCard key={partido.id_partido} partido={partido} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm">
              <p className="font-headline text-slate-700 text-lg uppercase">
                No hay partidos programados en los próximos días
              </p>
            </div>
          )}
        </section>


        {/* Sección: Sede y Predio Central */}
        <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-8 sm:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <span className="font-headline text-xs uppercase tracking-widest text-[#151f89] bg-blue-50 px-3 py-1 rounded-full font-bold">
                Nuestra Casa
              </span>
              <h2 className="font-headline text-3xl sm:text-4xl text-slate-900 uppercase tracking-wide leading-tight">
                Predio Central Argentinos del Norte
              </h2>
              <p className="font-body text-slate-600 leading-relaxed text-sm sm:text-base">
                Nuestras canchas reglamentarias de Futsal cuentan con superficie de piso flotante, vestuarios
                completos, iluminación profesional y tribunas para acompañar al Sagrado en cada fecha.
              </p>

              <div className="space-y-2 pt-2 text-sm font-title text-slate-700">
                <div className="flex items-center gap-2.5">
                  <FaMapMarkerAlt className="text-[#151f89] shrink-0" />
                  <span>Av. Benjamín Aráoz 650, San Miguel de Tucumán</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <FaUsers className="text-[#151f89] shrink-0" />
                  <span>Escuelita infantil, inferiores, Primera y Reserva</span>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  to="/sobre-nosotros"
                  className="inline-block bg-[#151f89] text-white hover:bg-[#303a9f] px-6 py-2.5 rounded-xl font-headline uppercase text-sm tracking-wider shadow-sm transition-all"
                >
                  Conocer más del Club
                </Link>
              </div>
            </div>

            {/* Tarjeta de Ubicación / Google Maps Link */}
            <div className="bg-[#151f89] text-white p-8 rounded-2xl flex flex-col justify-between shadow-inner relative overflow-hidden">
              <div className="space-y-2">
                <ClubShield className="w-12 h-14" />
                <h3 className="font-headline text-2xl uppercase tracking-wider pt-2">
                  Vení a alentar al club
                </h3>
                <p className="text-white/80 text-xs sm:text-sm font-body">
                  Entrada libre para socios con cuota al día. Viví la verdadera fiesta del futsal tucumano.
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-white/20 flex items-center justify-between">
                <span className="font-title text-xs tracking-wider uppercase text-white/70">
                  Ubicación Estratégica
                </span>
                <a
                  href="https://maps.google.com/?q=Argentinos+del+Norte+Tucuman"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white text-[#151f89] hover:bg-white/90 text-xs font-bold font-title px-4 py-2 rounded-lg uppercase tracking-wider transition-colors"
                >
                  Abrir Mapa
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
