import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import TournamentPage from './pages/TournamentPage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import { useAuthStore } from './stores/authStore';

function RutaProtegida({ children }) {
  const { estaAutenticado, token } = useAuthStore();
  const autenticado = Boolean(token && estaAutenticado());

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  const { verificarSesion, logout } = useAuthStore();

  useEffect(() => {
    verificarSesion();

    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [verificarSesion, logout]);

  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-[#f5f2fc] text-[#1b1b21] font-body selection:bg-[#303a9f] selection:text-white">
        <Navbar />
        <div className="flex-1 flex flex-col">
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/" element={<HomePage />} />
            <Route path="/masculino" element={<TournamentPage generoForzado="Masculino" />} />
            <Route path="/femenino" element={<TournamentPage generoForzado="Femenino" />} />
            <Route path="/torneo" element={<TournamentPage />} />
            <Route path="/sobre-nosotros" element={<AboutPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Rutas Privadas / Administración protegida */}
            <Route
              path="/admin"
              element={
                <RutaProtegida>
                  <AdminPage />
                </RutaProtegida>
              }
            />

            {/* Redirección por defecto */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
