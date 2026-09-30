import { create } from 'zustand';
import api from '../api/axios';

export const useAuthStore = create((set, get) => ({
  usuario: JSON.parse(localStorage.getItem('usuario') || 'null'),
  token: localStorage.getItem('token') || null,
  cargando: false,
  error: null,

  estaAutenticado: () => !!get().token,
  esAdmin: () => {
    const rol = get().usuario?.rol;
    return rol === 'Superadmin' || rol === 'Administrador';
  },
  esTesorero: () => {
    const rol = get().usuario?.rol;
    return rol === 'Superadmin' || rol === 'Administrador' || rol === 'Tesorero';
  },

  login: async (email, contrasena) => {
    set({ cargando: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, contrasena });
      const { token, usuario } = response.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));

      set({ token, usuario, cargando: false, error: null });
      return { ok: true, usuario };
    } catch (err) {
      console.error('[authStore] Error en login:', err);
      let mensaje = 'Error al iniciar sesión.';
      if (!err.response) {
        mensaje = `No se pudo conectar con el servidor backend (${api.defaults.baseURL || 'puerto 4000'}). Verifique que el backend esté corriendo.`;
      } else if (err.response.data?.mensaje) {
        mensaje = err.response.data.mensaje;
      } else if (err.response.data?.errores) {
        mensaje = err.response.data.errores.map((e) => e.mensaje).join('. ');
      }
      set({ cargando: false, error: mensaje });
      return { ok: false, error: mensaje };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    set({ token: null, usuario: null, error: null });
  },

  verificarSesion: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ token: null, usuario: null });
      return;
    }
    try {
      const res = await api.get('/auth/perfil');
      const usuario = res.data.data;
      localStorage.setItem('usuario', JSON.stringify(usuario));
      set({ usuario, token });
    } catch (err) {
      console.warn('Sesión no válida o expirada:', err.message);
      get().logout();
    }
  },
}));
