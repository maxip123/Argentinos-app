import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import ClubShield from '../components/ui/ClubShield';
import MatchCard from '../components/matches/MatchCard';
import SwitchSoloClub from '../components/ui/SwitchSoloClub';
import { FaFutbol, FaChevronRight, FaChevronLeft, FaMapMarkerAlt, FaUsers } from 'react-icons/fa';

const MAX_ATAJOS = 9;

// Partidos por página del carrusel: 6 en pantalla grande (3 arriba y 3 abajo), 2 en tablet y 1 en celular
const porPaginaSegunAncho = () => {
  if (window.matchMedia('(min-width: 1024px)').matches) return 6;
  if (window.matchMedia('(min-width: 640px)').matches) return 2;
  return 1;
};

function usePorPagina() {
  const [porPagina, setPorPagina] = useState(porPaginaSegunAncho);
  useEffect(() => {
    const consultas = ['(min-width: 1024px)', '(min-width: 640px)'].map((q) => window.matchMedia(q));
    const actualizar = () => setPorPagina(porPaginaSegunAncho());
    consultas.forEach((c) => c.addEventListener('change', actualizar));
    return () => consultas.forEach((c) => c.removeEventListener('change', actualizar));
  }, []);
  return porPagina;
}

function FlechaCarrusel({ direccion, visible, onClick }) {
  const Icono = direccion === 'izq' ? FaChevronLeft : FaChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direccion === 'izq' ? 'Ver partidos anteriores' : 'Ver más partidos'}
      className={`hidden sm:flex absolute top-1/2 -translate-y-1/2 z-10 w-11 h-11 items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-[#151f89] hover:bg-[#151f89] hover:text-white transition-all ${
        direccion === 'izq' ? '-left-5' : '-right-5'
      } ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <Icono />
    </button>
  );
}

function AtajosCarrusel({ total, activa, onIr }) {
  if (total <= 1) return null;
  // Con muchas páginas se muestra una ventana de atajos alrededor de la página actual
  const desde = Math.min(Math.max(activa - Math.floor(MAX_ATAJOS / 2), 0), Math.max(total - MAX_ATAJOS, 0));
  const indices = Array.from({ length: Math.min(total, MAX_ATAJOS) }, (_, i) => desde + i);

  return (
    <nav aria-label="Páginas de próximos partidos" className="mt-3 flex items-center justify-center gap-1">
      {indices.map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onIr(i)}
          aria-label={`Ir a la página ${i + 1} de ${total}`}
          aria-current={i === activa ? 'true' : undefined}
          className="p-1.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#151f89]"
        >
          <span
            className={`block h-2 rounded-full transition-all ${
              i === activa ? 'w-6 bg-[#151f89]' : 'w-2 bg-slate-300 hover:bg-[#303a9f]/60'
            }`}
          />
        </button>
      ))}
      {total > MAX_ATAJOS && (
        <span className="ml-2 text-xs text-slate-500 font-title tabular-nums">
          {activa + 1}/{total}
        </span>
      )}
    </nav>
  );
}

function CarruselPartidos({ partidos }) {
  const pistaRef = useRef(null);
  const porPagina = usePorPagina();
  const [activa, setActiva] = useState(0);

  const paginas = [];
  for (let i = 0; i < partidos.length; i += porPagina) paginas.push(partidos.slice(i, i + porPagina));

  // Distancia entre el borde de una página y el punto donde encaja al deslizar
  const separacion = (pista, pagina) =>
    pagina.getBoundingClientRect().left -
    pista.getBoundingClientRect().left -
    (parseFloat(getComputedStyle(pista).scrollPaddingLeft) || 0);

  useEffect(() => {
    const pista = pistaRef.current;
    if (!pista) return undefined;
    pista.scrollTo({ left: 0 });
    setActiva(0);
    const actualizar = () => {
      let cercana = 0;
      [...pista.children].forEach((pagina, i) => {
        if (Math.abs(separacion(pista, pagina)) < Math.abs(separacion(pista, pista.children[cercana]))) cercana = i;
      });
      setActiva(cercana);
    };
    pista.addEventListener('scroll', actualizar, { passive: true });
    return () => pista.removeEventListener('scroll', actualizar);
  }, [partidos, porPagina]);

  const irA = (indice) => {
    const pista = pistaRef.current;
    const pagina = pista?.children[indice];
    if (!pagina) return;
    setActiva(indice);
    pista.scrollTo({ left: pista.scrollLeft + separacion(pista, pagina), behavior: 'smooth' });
  };

  return (
    <>
      <div className="relative">
        <FlechaCarrusel direccion="izq" visible={activa > 0} onClick={() => irA(activa - 1)} />
        <div
          ref={pistaRef}
          className="flex items-start gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-3 -mx-4 px-4 scroll-px-4 sm:mx-0 sm:px-0 sm:scroll-px-0"
        >
          {paginas.map((pagina, i) => (
            <div
              key={pagina[0].id_partido}
              aria-label={`Página ${i + 1} de ${paginas.length}`}
              className="snap-start shrink-0 w-[85%] sm:w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
            >
              {pagina.map((partido) => (
                <div key={partido.id_partido} className="flex *:w-full">
                  <MatchCard partido={partido} />
                </div>
              ))}
            </div>
          ))}
        </div>
        <FlechaCarrusel direccion="der" visible={activa < paginas.length - 1} onClick={() => irA(activa + 1)} />
      </div>
      <AtajosCarrusel total={paginas.length} activa={activa} onIr={irA} />
    </>
  );
}

export default function HomePage() {
  const [proximosPartidos, setProximosPartidos] = useState([]);
  const [cargandoPartidos, setCargandoPartidos] = useState(true);
  const [soloClub, setSoloClub] = useState(false);

  const partidosVisibles = soloClub ? proximosPartidos.filter((p) => p.juega_argentinos) : proximosPartidos;

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
        {/* Foto de fondo con degradado oscuro para que el texto se lea */}
        <img
          src="/hero-futsal.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-[center_35%] z-0"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-black/70 z-0"></div>

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

            <SwitchSoloClub activo={soloClub} onChange={setSoloClub} />
          </div>

          {cargandoPartidos ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`${i === 0 ? '' : i === 1 ? 'hidden sm:block' : 'hidden lg:block'} h-72 bg-white rounded-2xl animate-pulse border border-slate-200`}
                ></div>
              ))}
            </div>
          ) : partidosVisibles.length > 0 ? (
            <>
              <CarruselPartidos partidos={partidosVisibles} />
              <p className="mt-2 text-xs text-slate-500 font-title">
                {partidosVisibles.length} {partidosVisibles.length === 1 ? 'partido programado' : 'partidos programados'}
                <span className="sm:hidden"> · Deslizá para ver más</span>
              </p>
            </>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm">
              <p className="font-headline text-slate-700 text-lg uppercase">
                {soloClub
                  ? 'Argentinos del Norte no tiene partidos programados'
                  : 'No hay partidos programados en los próximos días'}
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
                  <span>Av. Benjamín Aráoz 650, San Miguel de Tucumán (Estadio Eva Duarte de Perón)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <FaUsers className="text-[#151f89] shrink-0" />
                  <span>Escuelita infantil, inferiores, Primera y Reserva</span>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-3">
                <Link
                  to="/sobre-nosotros"
                  className="inline-block bg-[#151f89] text-white hover:bg-[#303a9f] px-6 py-2.5 rounded-xl font-headline uppercase text-sm tracking-wider shadow-sm transition-all"
                >
                  Conocer más del Club
                </Link>
                <a
                  href="https://maps.google.com/?q=Club+Argentinos+del+Norte+Estadio+Eva+Duarte+de+Peron"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-headline uppercase text-sm tracking-wider transition-all"
                >
                  <FaMapMarkerAlt className="text-[#151f89]" />
                  <span>Cómo llegar</span>
                </a>
              </div>
            </div>

            {/* Mapa Interactivo Google Maps */}
            <div className="w-full h-[360px] sm:h-[400px] rounded-2xl overflow-hidden shadow-md border border-slate-200 relative bg-slate-100">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3560.1653482774364!2d-65.19078922456312!3d-26.83469272669381!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94225eaa33af6109%3A0x8638433955585b2a!2sClub%20Argentinos%20del%20Norte-Estadio%20Eva%20Duarte%20de%20Peron!5e0!3m2!1ses-419!2sar!4v1792091316794!5m2!1ses-419!2sar"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                title="Club Argentinos del Norte - Estadio Eva Duarte de Perón"
                className="w-full h-full"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
