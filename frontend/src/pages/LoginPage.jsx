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

    const resultado = await login(email, contrasena);
    if (resultado.ok) {
      navigate('/admin');
    }
  };

  const usarCredencialesDemo = async () => {
    setEmail('admin@argentinosdelnorte.com');
    setContrasena('admin1234');
    setErrorLocal('');
    const resultado = await login('admin@argentinosdelnorte.com', 'admin1234');
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-title font-bold text-slate-700 uppercase tracking-wider mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <input
                type="email"
                required
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

        {/* Botón de acceso de prueba */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center space-y-2">
          <p className="text-xs text-slate-500 font-body">Credenciales del sistema cargadas en la DB:</p>
          <button
            type="button"
            disabled={cargando}
            onClick={usarCredencialesDemo}
            className="w-full bg-blue-50 hover:bg-blue-100 text-[#151f89] border border-[#151f89]/20 py-2.5 px-4 rounded-xl text-xs font-title font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs active:scale-95 disabled:opacity-50"
          >
            <span>⚡ Ingresar como Superadmin (1 Clic)</span>
          </button>
          <p className="text-[11px] text-slate-400 font-mono">admin@argentinosdelnorte.com / admin1234</p>
        </div>
      </div>
    </div>
  );
}
