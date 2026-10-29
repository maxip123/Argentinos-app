import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import ClubShield from '../components/ui/ClubShield';
import { FaLock, FaEnvelope, FaExclamationTriangle } from 'react-icons/fa';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, cargando, error } = useAuthStore();

  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errorLocal, setErrorLocal] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorLocal('');

    if (!email.trim() || !contrasena) {
      setErrorLocal('Por favor ingrese email y contraseña.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorLocal('El formato del correo electrónico no es válido.');
      return;
    }
    if (contrasena.length < 6) {
      setErrorLocal('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const resultado = await login(email, contrasena);
    if (resultado.ok) {
      navigate('/admin');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f2fc] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8 sm:p-10">
        <div className="flex flex-col items-center text-center mb-8">
          <ClubShield className="w-16 h-20 mb-3" />
          <h1 className="font-headline text-2xl sm:text-3xl text-[#151f89] uppercase tracking-wider">
            Acceso al Sistema
          </h1>
          <p className="font-title text-slate-500 text-xs sm:text-sm uppercase tracking-wider font-semibold mt-1">
            Club Argentinos del Norte • Administración
          </p>
        </div>

        {(error || errorLocal) && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium flex items-center gap-3">
            <FaExclamationTriangle className="text-red-500 shrink-0 text-base" />
            <span>{errorLocal || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5">
          <div>
            <label className="block text-xs font-title font-bold text-slate-700 uppercase tracking-wider mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <input
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@argentinosdelnorte.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 pl-11 pr-4 text-sm font-body text-slate-900 focus:bg-white focus:outline-none focus:border-[#151f89] focus:ring-1 focus:ring-[#151f89] transition-all"
              />
              <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-title font-bold text-slate-700 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                type="password"
                required
                autoComplete="new-password"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 pl-11 pr-4 text-sm font-body text-slate-900 focus:bg-white focus:outline-none focus:border-[#151f89] focus:ring-1 focus:ring-[#151f89] transition-all"
              />
              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-[#151f89] hover:bg-[#303a9f] text-white py-3.5 rounded-xl font-headline uppercase tracking-wider text-base shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {cargando ? 'Iniciando sesión...' : 'Ingresar'}
          </button>
        </form>

      </div>
    </div>
  );
}
