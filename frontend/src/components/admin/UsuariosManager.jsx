import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useAuthStore } from '../../stores/authStore';
import {
  FaUserShield,
  FaUserPlus,
  FaUserEdit,
  FaTrash,
  FaKey,
  FaSearch,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaTimes,
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
  FaEnvelope,
  FaPhone,
  FaSyncAlt,
  FaIdBadge,
} from 'react-icons/fa';

const ROLES_SISTEMA = [
  { valor: 'Superadmin', label: 'Superadministrador', color: 'bg-red-50 text-[#991b1b] border-red-200' },
  { valor: 'Administrador', label: 'Administrador General', color: 'bg-blue-50 text-[#151f89] border-blue-200' },
  { valor: 'Tesorero', label: 'Tesorero / Finanzas', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { valor: 'Planillero', label: 'Planillero de Partidos', color: 'bg-slate-100 text-slate-700 border-slate-300' },
];

function RoleBadge({ rol }) {
  const cfg = ROLES_SISTEMA.find(r => r.valor === rol) || {
    label: rol || 'Usuario',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg.color}`}>
      <FaShieldAlt className="text-[9px]" />
      {cfg.label}
    </span>
  );
}

export default function UsuariosManager({ divisiones = [] }) {
  const { usuario: usuarioActual } = useAuthStore();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('activos'); // 'activos' | 'inactivos' | 'todos'
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Modales
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [usuarioResetClave, setUsuarioResetClave] = useState(null);

  // Formulario Nuevo Usuario
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre_completo: '',
    email: '',
    contrasena: '',
    rol: 'Administrador',
    telefono: '',
    id_division_asignada: '',
  });
  const [verClaveNueva, setVerClaveNueva] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState('');

  // Formulario Reset Clave
  const [nuevaClave, setNuevaClave] = useState('');
  const [verClaveReset, setVerClaveReset] = useState(false);

  const mostrarAviso = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };

  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    try {
      const res = await api.get('/auth/usuarios');
      setUsuarios(res.data.data || []);
    } catch (err) {
      console.error('[UsuariosManager] Error al cargar usuarios:', err);
      mostrarAviso('error', 'Error al cargar usuarios: ' + (err.response?.data?.mensaje || err.message));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  // Crear Usuario
  const handleCrear = async (e) => {
    e.preventDefault();
    if (!nuevoUsuario.nombre_completo.trim() || !nuevoUsuario.email.trim() || !nuevoUsuario.contrasena) {
      setErrorModal('Nombre, correo electrónico y contraseña son obligatorios.');
      return;
    }
    if (nuevoUsuario.contrasena.length < 6) {
      setErrorModal('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setGuardando(true);
    setErrorModal('');
    try {
      await api.post('/auth/registro', {
        nombre_completo: nuevoUsuario.nombre_completo.trim(),
        email: nuevoUsuario.email.toLowerCase().trim(),
        contrasena: nuevoUsuario.contrasena,
        rol: nuevoUsuario.rol,
        telefono: nuevoUsuario.telefono.trim() || null,
        id_division_asignada: nuevoUsuario.id_division_asignada ? Number(nuevoUsuario.id_division_asignada) : null,
      });

      mostrarAviso('exito', `Usuario ${nuevoUsuario.nombre_completo} creado correctamente.`);
      setMostrarCrear(false);
      setNuevoUsuario({
        nombre_completo: '',
        email: '',
        contrasena: '',
        rol: 'Administrador',
        telefono: '',
        id_division_asignada: '',
      });
      cargarUsuarios();
    } catch (err) {
      setErrorModal(err.response?.data?.mensaje || 'Error al registrar usuario.');
    } finally {
      setGuardando(false);
    }
  };

  // Guardar Edición
  const handleEditar = async (e) => {
    e.preventDefault();
    if (!usuarioEditando) return;
    setGuardando(true);
    setErrorModal('');
    try {
      await api.put(`/auth/usuarios/${usuarioEditando.id_perfil}`, {
        nombre_completo: usuarioEditando.nombre_completo.trim(),
        rol: usuarioEditando.rol,
        telefono: usuarioEditando.telefono?.trim() || null,
        id_division_asignada: usuarioEditando.id_division_asignada ? Number(usuarioEditando.id_division_asignada) : null,
        activo: usuarioEditando.activo,
      });

      mostrarAviso('exito', 'Usuario actualizado correctamente.');
      setUsuarioEditando(null);
      cargarUsuarios();
    } catch (err) {
      setErrorModal(err.response?.data?.mensaje || 'Error al actualizar usuario.');
    } finally {
      setGuardando(false);
    }
  };

  // Resetear Contraseña
  const handleResetearClave = async (e) => {
    e.preventDefault();
    if (!usuarioResetClave) return;
    if (!nuevaClave || nuevaClave.length < 6) {
      setErrorModal('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setGuardando(true);
    setErrorModal('');
    try {
      await api.put(`/auth/usuarios/${usuarioResetClave.id_perfil}`, {
        contrasena: nuevaClave,
      });
      mostrarAviso('exito', `Contraseña restablecida con éxito para ${usuarioResetClave.nombre_completo}.`);
      setUsuarioResetClave(null);
      setNuevaClave('');
    } catch (err) {
      setErrorModal(err.response?.data?.mensaje || 'Error al restablecer la contraseña.');
    } finally {
      setGuardando(false);
    }
  };

  // Baja lógica o reactivación
  const handleToggleEstado = async (u) => {
    const accion = u.activo ? 'desactivar' : 'reactivar';
    if (!window.confirm(`¿Confirmás ${accion} al usuario ${u.nombre_completo}?`)) return;

    try {
      await api.put(`/auth/usuarios/${u.id_perfil}`, {
        activo: !u.activo,
      });
      mostrarAviso('exito', `Usuario ${u.nombre_completo} ${u.activo ? 'desactivado' : 'reactivado'} correctamente.`);
      cargarUsuarios();
    } catch (err) {
      mostrarAviso('error', err.response?.data?.mensaje || 'Error al cambiar estado.');
    }
  };

  // Filtrado de usuarios
  const usuariosFiltrados = usuarios.filter(u => {
    if (filtroEstado === 'activos' && !u.activo) return false;
    if (filtroEstado === 'inactivos' && u.activo) return false;
    if (filtroRol && u.rol !== filtroRol) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      const matchNombre = u.nombre_completo?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      if (!matchNombre && !matchEmail) return false;
    }
    return true;
  });

  const totalSuperadmins = usuarios.filter(u => u.rol === 'Superadmin' && u.activo).length;
  const totalAdmins = usuarios.filter(u => (u.rol === 'Administrador' || u.rol === 'Tesorero' || u.rol === 'Planillero') && u.activo).length;
  const totalInactivos = usuarios.filter(u => !u.activo).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ─── Encabezado Principal ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-[#1e1b4b] text-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              <span className="text-[11px] font-mono tracking-widest text-slate-300 uppercase font-bold">Seguridad y Accesos</span>
            </div>
            <h1 className="font-headline text-2xl uppercase tracking-wide mt-0.5 flex items-center gap-2">
              <FaUserShield className="text-[#FF9C67]" />
              Gestión de Usuarios y Administradores
            </h1>
            <p className="text-xs text-slate-300 font-title mt-0.5">
              Control centralizado de credenciales, roles institucionales y permisos del sistema oficial.
            </p>
          </div>

          <button
            onClick={() => {
              setMostrarCrear(true);
              setErrorModal('');
            }}
            className="flex items-center justify-center gap-2 bg-[#991b1b] hover:bg-[#7f1d1d] text-white px-5 py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider transition-all shadow-sm hover:scale-102"
          >
            <FaUserPlus /> <span>Nuevo Administrador</span>
          </button>
        </div>

        {/* Métricas rápidas de usuarios */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 p-4 bg-slate-50/70 border-b border-slate-200 text-xs">
          <div className="p-3">
            <span className="text-slate-500 font-title block">Total Usuarios</span>
            <strong className="font-headline text-xl text-slate-900">{usuarios.length}</strong>
          </div>
          <div className="p-3">
            <span className="text-red-700 font-title block">Superadmins</span>
            <strong className="font-headline text-xl text-[#991b1b]">{totalSuperadmins}</strong>
          </div>
          <div className="p-3">
            <span className="text-blue-700 font-title block">Admins & Staff</span>
            <strong className="font-headline text-xl text-[#151f89]">{totalAdmins}</strong>
          </div>
          <div className="p-3">
            <span className="text-slate-400 font-title block">Inactivos / Bajas</span>
            <strong className="font-headline text-xl text-slate-500">{totalInactivos}</strong>
          </div>
        </div>

        {/* Notificaciones */}
        {mensaje.texto && (
          <div className={`p-4 text-xs font-bold border-b ${
            mensaje.tipo === 'exito' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {mensaje.texto}
          </div>
        )}

        {/* Barra de Filtros y Búsqueda */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3.5 top-3 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Buscar por Nombre, Apellido o Email..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30"
            />
          </div>

          <select
            value={filtroRol}
            onChange={e => setFiltroRol(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="">Todos los roles</option>
            {ROLES_SISTEMA.map(r => (
              <option key={r.valor} value={r.valor}>{r.label}</option>
            ))}
          </select>

          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="activos">Solo Activos</option>
            <option value="inactivos">Solo Inactivos</option>
            <option value="todos">Todos los estados</option>
          </select>

          <button
            onClick={cargarUsuarios}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-700 text-xs font-title font-bold transition-colors shrink-0"
          >
            <FaSyncAlt className={cargando ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>
        </div>
      </div>

      {/* ─── Listado de Usuarios: Mobile Cards & Desktop Table ─────────────── */}
      <div className="space-y-3">
        {/* Vista Móvil: Cards */}
        <div className="block md:hidden space-y-3">
          {cargando ? (
            <div className="p-8 text-center text-slate-400 font-title text-xs">Cargando directorio de usuarios...</div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-title text-xs bg-white rounded-2xl border border-slate-200">
              No se encontraron usuarios con estos filtros.
            </div>
          ) : (
            usuariosFiltrados.map(u => (
              <div
                key={u.id_perfil}
                className={`bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3 ${!u.activo ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-headline text-sm flex items-center justify-center shrink-0">
                      {u.nombre_completo?.[0] || 'U'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-tight">{u.nombre_completo}</h4>
                      <span className="text-[11px] text-slate-400 font-mono block mt-0.5">{u.email}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                    u.activo
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <RoleBadge rol={u.rol} />
                  {u.nombre_division && (
                    <span className="text-[11px] text-slate-500 font-title bg-slate-100 px-2 py-0.5 rounded-md">
                      {u.nombre_division}
                    </span>
                  )}
                </div>

                {u.telefono && (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <FaPhone className="text-slate-400" />
                    <span>{u.telefono}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setUsuarioResetClave(u);
                      setNuevaClave('');
                      setErrorModal('');
                    }}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"
                    title="Restablecer contraseña"
                  >
                    <FaKey className="text-xs" /> Clave
                  </button>
                  <button
                    onClick={() => {
                      setUsuarioEditando(u);
                      setErrorModal('');
                    }}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"
                    title="Editar usuario"
                  >
                    <FaUserEdit className="text-xs" /> Editar
                  </button>
                  {usuarioActual?.id !== u.id_perfil && (
                    <button
                      onClick={() => handleToggleEstado(u)}
                      className={`p-2 rounded-xl text-xs font-bold transition-colors ${
                        u.activo ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                      title={u.activo ? 'Desactivar usuario' : 'Reactivar usuario'}
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Vista Desktop: Tabla */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {cargando ? (
            <div className="p-12 text-center text-slate-400 font-title text-sm">Cargando directorio de usuarios...</div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-title text-sm">No se encontraron usuarios en el sistema.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-headline text-[11px] text-slate-500 uppercase tracking-wider">
                    <th className="p-3.5">Usuario / Nombre</th>
                    <th className="p-3.5">Correo Electrónico</th>
                    <th className="p-3.5">Rol Institucional</th>
                    <th className="p-3.5">División Asignada</th>
                    <th className="p-3.5">Teléfono</th>
                    <th className="p-3.5 text-center">Estado</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-title text-xs">
                  {usuariosFiltrados.map(u => (
                    <tr key={u.id_perfil} className={`hover:bg-slate-50/80 transition-colors ${!u.activo ? 'opacity-60' : ''}`}>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-headline text-xs flex items-center justify-center shrink-0">
                            {u.nombre_completo?.[0] || 'U'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-sm block">{u.nombre_completo}</span>
                            {usuarioActual?.id === u.id_perfil && (
                              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">
                                (Tu Cuenta Actual)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">{u.email}</td>
                      <td className="p-3.5"><RoleBadge rol={u.rol} /></td>
                      <td className="p-3.5">
                        {u.nombre_division ? (
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                            {u.nombre_division}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Global (Todas)</span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">{u.telefono || '—'}</td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.activo
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setUsuarioResetClave(u);
                              setNuevaClave('');
                              setErrorModal('');
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Restablecer contraseña"
                          >
                            <FaKey className="text-xs" />
                          </button>
                          <button
                            onClick={() => {
                              setUsuarioEditando(u);
                              setErrorModal('');
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Editar usuario"
                          >
                            <FaUserEdit className="text-xs" />
                          </button>
                          {usuarioActual?.id !== u.id_perfil && (
                            <button
                              onClick={() => handleToggleEstado(u)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                u.activo ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={u.activo ? 'Desactivar usuario' : 'Reactivar usuario'}
                            >
                              <FaTrash className="text-xs" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modal: Crear Nuevo Usuario ───────────────────────────────────── */}
      {mostrarCrear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-gradient-to-r from-slate-900 to-[#1e1b4b] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300 font-bold">Seguridad Oficial</span>
                <h3 className="font-headline text-lg sm:text-xl uppercase tracking-wide">Alta de Usuario / Administrador</h3>
              </div>
              <button onClick={() => setMostrarCrear(false)} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleCrear} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {errorModal && (
                <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200 flex items-center gap-2">
                  <FaExclamationCircle className="shrink-0" /> {errorModal}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Nombre Completo *</label>
                <input
                  type="text" required
                  placeholder="ej. Juan Pérez, María Gómez..."
                  value={nuevoUsuario.nombre_completo}
                  onChange={e => setNuevoUsuario({ ...nuevoUsuario, nombre_completo: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Correo Electrónico *</label>
                <input
                  type="email" required
                  placeholder="usuario@clubargentinos.com.ar"
                  value={nuevoUsuario.email}
                  onChange={e => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Contraseña Provisoria *</label>
                <div className="relative">
                  <input
                    type={verClaveNueva ? 'text' : 'password'}
                    required minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={nuevoUsuario.contrasena}
                    onChange={e => setNuevoUsuario({ ...nuevoUsuario, contrasena: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-10 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#991b1b]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setVerClaveNueva(!verClaveNueva)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {verClaveNueva ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Rol en Sistema *</label>
                  <select
                    value={nuevoUsuario.rol}
                    onChange={e => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    {ROLES_SISTEMA.map(r => (
                      <option key={r.valor} value={r.valor}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Teléfono</label>
                  <input
                    type="tel"
                    placeholder="ej. 381 456 7890"
                    value={nuevoUsuario.telefono}
                    onChange={e => setNuevoUsuario({ ...nuevoUsuario, telefono: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">División Asignada (Opcional)</label>
                <select
                  value={nuevoUsuario.id_division_asignada}
                  onChange={e => setNuevoUsuario({ ...nuevoUsuario, id_division_asignada: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none"
                >
                  <option value="">Acceso a Todas las Divisiones (Sin restricción)</option>
                  {divisiones.map(d => (
                    <option key={d.id_division} value={d.id_division}>
                      {d.nombre_division} ({d.temporada})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2 shrink-0 border-t border-slate-100">
                <button
                  type="submit" disabled={guardando}
                  className="flex-1 bg-[#991b1b] hover:bg-[#7f1d1d] disabled:opacity-50 text-white py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider transition-colors shadow-sm"
                >
                  {guardando ? 'Creando Usuario...' : 'Crear Usuario'}
                </button>
                <button
                  type="button" onClick={() => setMostrarCrear(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-title font-bold text-xs text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Editar Usuario ────────────────────────────────────────── */}
      {usuarioEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300 font-bold">Edición de Cuenta</span>
                <h3 className="font-headline text-lg sm:text-xl uppercase tracking-wide">Editar Usuario</h3>
                <p className="text-xs text-slate-300 font-mono mt-0.5 truncate">{usuarioEditando.email}</p>
              </div>
              <button onClick={() => setUsuarioEditando(null)} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleEditar} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {errorModal && (
                <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200">{errorModal}</div>
              )}

              <div>
                <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Nombre Completo *</label>
                <input
                  type="text" required
                  value={usuarioEditando.nombre_completo}
                  onChange={e => setUsuarioEditando({ ...usuarioEditando, nombre_completo: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Rol</label>
                  <select
                    value={usuarioEditando.rol}
                    onChange={e => setUsuarioEditando({ ...usuarioEditando, rol: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    {ROLES_SISTEMA.map(r => (
                      <option key={r.valor} value={r.valor}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={usuarioEditando.telefono || ''}
                    onChange={e => setUsuarioEditando({ ...usuarioEditando, telefono: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">División Asignada</label>
                <select
                  value={usuarioEditando.id_division_asignada || ''}
                  onChange={e => setUsuarioEditando({ ...usuarioEditando, id_division_asignada: e.target.value || null })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none"
                >
                  <option value="">Acceso a Todas las Divisiones (Sin restricción)</option>
                  {divisiones.map(d => (
                    <option key={d.id_division} value={d.id_division}>
                      {d.nombre_division} ({d.temporada})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl">
                  <input
                    type="checkbox"
                    checked={usuarioEditando.activo}
                    onChange={e => setUsuarioEditando({ ...usuarioEditando, activo: e.target.checked })}
                    className="rounded text-[#991b1b] focus:ring-[#991b1b] h-4 w-4"
                  />
                  <span className="text-xs font-title font-bold text-slate-800 uppercase">
                    Usuario Habilitado para Iniciar Sesión (Activo)
                  </span>
                </label>
              </div>

              <div className="flex gap-2 pt-2 shrink-0 border-t border-slate-100">
                <button
                  type="submit" disabled={guardando}
                  className="flex-1 bg-slate-900 hover:bg-black disabled:opacity-50 text-white py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider transition-colors shadow-sm"
                >
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button
                  type="button" onClick={() => setUsuarioEditando(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-title font-bold text-xs text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Restablecer Contraseña ────────────────────────────────── */}
      {usuarioResetClave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-amber-600 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FaKey />
                <div>
                  <h3 className="font-headline text-lg uppercase tracking-wide">Restablecer Contraseña</h3>
                  <p className="text-xs text-amber-100 font-medium truncate max-w-[240px]">{usuarioResetClave.nombre_completo}</p>
                </div>
              </div>
              <button onClick={() => setUsuarioResetClave(null)} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleResetearClave} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {errorModal && (
                <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200">{errorModal}</div>
              )}

              <p className="text-xs text-slate-600 font-body">
                Ingresá la nueva contraseña para <strong>{usuarioResetClave.nombre_completo}</strong> ({usuarioResetClave.email}).
              </p>

              <div>
                <label className="block text-[11px] font-title font-bold text-slate-700 uppercase mb-1">Nueva Contraseña *</label>
                <div className="relative">
                  <input
                    type={verClaveReset ? 'text' : 'password'}
                    required minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={nuevaClave}
                    onChange={e => setNuevaClave(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-10 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => setVerClaveReset(!verClaveReset)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {verClaveReset ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2 shrink-0 border-t border-slate-100">
                <button
                  type="submit" disabled={guardando || !nuevaClave}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-headline uppercase text-xs tracking-wider transition-colors shadow-sm"
                >
                  {guardando ? 'Actualizando...' : 'Confirmar Nueva Clave'}
                </button>
                <button
                  type="button" onClick={() => setUsuarioResetClave(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-title font-bold text-xs text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
