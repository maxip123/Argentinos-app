import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import ClubShield from '../ui/ClubShield';
import { FaBars, FaTimes, FaUserShield, FaSignOutAlt, FaSignInAlt } from 'react-icons/fa';

export default function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, estaAutenticado, logout } = useAuthStore();
  const autenticado = estaAutenticado();

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuAbierto(false);
  };

  const navLinks = [
    { nombre: 'Inicio', path: '/' },
    { nombre: 'Masculino', path: '/masculino' },
    { nombre: 'Femenino', path: '/femenino' },
    { nombre: 'Historial', path: '/historial' },
    { nombre: 'Sobre Nosotros', path: '/sobre-nosotros' },
  ];

  const esRutaActiva = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="w-full sticky top-0 z-50 bg-[#151f89] border-b border-[#303a9f] shadow-md">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand / Logo */}
        <Link
          to="/"
          className="flex items-center gap-3 transition-opacity hover:opacity-95"
          onClick={() => setMenuAbierto(false)}
        >
          <ClubShield className="w-11 h-12" showText={true} />
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-4 lg:gap-8">
          {navLinks.map((link) => {
            const activo = esRutaActiva(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`font-headline uppercase tracking-wider text-base transition-colors relative py-1 ${
                  activo
                    ? 'text-white border-b-2 border-[#FF9C67]'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                {link.nombre}
              </Link>
            );
          })}
        </div>

        {/* Desktop Right Actions (Auth & Admin) */}
        <div className="hidden md:flex items-center gap-4">
          {autenticado ? (
            <div className="flex items-center gap-3">
              <Link
                to="/admin"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-headline text-sm uppercase tracking-wider transition-all shadow-sm ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-[#FF9C67] text-[#151f89]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <FaUserShield className="text-base" />
                <span>Admin</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
                title="Cerrar sesión"
              >
                <FaSignOutAlt />
                <span>Salir</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="bg-white text-[#151f89] hover:bg-[#efecf6] px-5 py-2 rounded-lg font-headline uppercase tracking-wider text-sm font-bold shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              Iniciar Sesión
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none"
            aria-label="Menú principal"
          >
            {menuAbierto ? <FaTimes className="text-2xl" /> : <FaBars className="text-2xl" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {menuAbierto && (
        <div className="md:hidden bg-[#0e1666] border-b border-[#303a9f] px-4 pt-3 pb-6 space-y-3 animate-fadeIn">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMenuAbierto(false)}
              className={`block px-4 py-3 rounded-lg font-headline uppercase tracking-wider text-base ${
                esRutaActiva(link.path)
                  ? 'bg-[#303a9f] text-white border-l-4 border-[#FF9C67]'
                  : 'text-white/80 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.nombre}
            </Link>
          ))}

          <div className="pt-4 border-t border-white/10">
            {autenticado ? (
              <div className="space-y-2">
                <div className="px-4 py-1 text-xs text-white/60 font-medium">
                  Conectado como <strong className="text-white">{usuario?.nombre || usuario?.email}</strong> ({usuario?.rol})
                </div>
                <Link
                  to="/admin"
                  onClick={() => setMenuAbierto(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#FF9C67] text-[#151f89] font-headline uppercase text-base"
                >
                  <FaUserShield />
                  <span>Panel de Administración</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-300 hover:bg-white/5 font-medium text-sm"
                >
                  <FaSignOutAlt />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMenuAbierto(false)}
                className="w-full flex items-center justify-center gap-2 bg-white text-[#151f89] py-3 rounded-lg font-headline uppercase tracking-wider text-base font-bold shadow-md"
              >
                <FaSignInAlt />
                <span>Iniciar Sesión</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
