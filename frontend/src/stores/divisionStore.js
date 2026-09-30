import { create } from 'zustand';
import api from '../api/axios';

export const useDivisionStore = create((set, get) => ({
  divisiones: [],
  divisionActivaId: null,
  cargando: false,
  error: null,

  cargarDivisiones: async (forzar = false) => {
    // Si ya están cargadas y no se fuerza, no repetir
    if (!forzar && get().divisiones.length > 0) return get().divisiones;

    set({ cargando: true, error: null });
    try {
      const res = await api.get('/divisiones');
      const list = res.data.data || [];
      const activoId = get().divisionActivaId || (list[0]?.id_division ?? null);

      set({
        divisiones: list,
        divisionActivaId: activoId,
        cargando: false,
      });
      return list;
    } catch (err) {
      console.error('Error al cargar divisiones:', err);
      set({ cargando: false, error: 'No se pudieron cargar las divisiones.' });
      return [];
    }
  },

  setDivisionActivaId: (id) => {
    set({ divisionActivaId: Number(id) });
  },

  obtenerDivisionActiva: () => {
    const { divisiones, divisionActivaId } = get();
    return divisiones.find((d) => Number(d.id_division) === Number(divisionActivaId)) || divisiones[0] || null;
  },
}));
