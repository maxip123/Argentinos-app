import React from 'react';
import { Link } from 'react-router-dom';
import ClubShield from '../ui/ClubShield';
import { FaMapMarkerAlt, FaEnvelope, FaFutbol, FaShieldAlt } from 'react-icons/fa';

export default function Footer() {
  return (
    <footer className="w-full bg-[#0B111D] text-white border-t border-slate-800">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Columna 1: Identidad */}
          <div className="space-y-4 md:col-span-2">
            <ClubShield className="w-12 h-14" showText={true} />
            <p className="text-slate-400 text-sm max-w-md font-body leading-relaxed">
              Club Atlético Argentinos del Norte. Pasión, disciplina y formación deportiva en la Liga Futsal AFA Tucumán.
              Compromiso y gloria en cada cancha.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 pt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Temporada Oficial 2026</span>
            </div>
          </div>

          {/* Columna 2: Torneos y Ramas */}
          <div className="space-y-3">
            <h4 className="font-headline text-lg uppercase tracking-wider text-white border-b border-slate-700 pb-2">
              Disciplinas
            </h4>
            <ul className="space-y-2 text-sm text-slate-300 font-body">
              <li>
                <Link to="/masculino" className="hover:text-[#FF9C67] transition-colors flex items-center gap-2">
                  <FaFutbol className="text-xs text-[#303a9f]" />
                  <span>Futsal Masculino</span>
                </Link>
              </li>
              <li>
                <Link to="/femenino" className="hover:text-[#FF9C67] transition-colors flex items-center gap-2">
                  <FaFutbol className="text-xs text-[#303a9f]" />
                  <span>Futsal Femenino</span>
                </Link>
              </li>
              <li>
                <Link to="/sobre-nosotros" className="hover:text-[#FF9C67] transition-colors flex items-center gap-2">
                  <FaShieldAlt className="text-xs text-[#303a9f]" />
                  <span>Sobre el Club</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Sede Central */}
          <div className="space-y-3">
            <h4 className="font-headline text-lg uppercase tracking-wider text-white border-b border-slate-700 pb-2">
              Predio y Contacto
            </h4>
            <div className="space-y-3 text-sm text-slate-300 font-body">
              <div className="flex items-start gap-2.5">
                <FaMapMarkerAlt className="text-[#FF9C67] text-base shrink-0 mt-0.5" />
                <span>Av. Benjamín Aráoz 650, San Miguel de Tucumán, Tucumán</span>
              </div>
              <div className="flex items-center gap-2.5">
                <FaEnvelope className="text-[#FF9C67] text-sm shrink-0" />
                <span>contacto@argentinosdelnorte.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-body gap-4">
          <p>© {new Date().getFullYear()} Club Atlético Argentinos del Norte. Todos los derechos reservados.</p>
          <p className="flex items-center gap-1">
            Sistema Oficial desarrollado para la Liga Futsal AFA
          </p>
        </div>
      </div>
    </footer>
  );
}
