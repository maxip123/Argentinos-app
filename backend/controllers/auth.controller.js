const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuesta');

/**
 * POST /api/auth/login
 * Autentica a un usuario del sistema con email y contraseña.
 * Retorna un JWT firmado con los datos del perfil.
 */
const login = async (req, res) => {
  try {
    const { email, contrasena } = req.body;

    // Buscar usuario por email
    const { rows } = await query(
      `SELECT * FROM public.perfil_usuario WHERE email = $1 AND activo = TRUE LIMIT 1`,
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return respuestaError(res, 'Credenciales incorrectas.', 401);
    }

    const usuario = rows[0];

    // Verificar contraseña
    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (!contrasenaValida) {
      return respuestaError(res, 'Credenciales incorrectas.', 401);
    }

    // Generar token JWT
    const payload = {
      id: usuario.id_perfil,
      email: usuario.email,
      nombre: usuario.nombre_completo,
      rol: usuario.rol,
      id_division_asignada: usuario.id_division_asignada,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    return respuestaExito(res, { token, usuario: payload }, 'Sesión iniciada correctamente.');
  } catch (error) {
    console.error('[auth.controller] login error:', error);
    return respuestaError(res, 'Error al iniciar sesión.', 500, error.message);
  }
};

/**
 * POST /api/auth/registro
 * Crea un nuevo usuario del sistema (solo Superadmin puede llamar a este endpoint).
 */
const registro = async (req, res) => {
  try {
    const { email, contrasena, nombre_completo, rol, telefono, id_division_asignada } = req.body;

    // Verificar que el email no esté registrado
    const { rows: existente } = await query(
      `SELECT id_perfil FROM public.perfil_usuario WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (existente.length > 0) {
      return respuestaError(res, 'Ya existe un usuario registrado con ese email.', 409);
    }

    // Hashear contraseña con bcrypt (10 rondas de salt)
    const saltRounds = 10;
    const contrasena_hash = await bcrypt.hash(contrasena, saltRounds);

    const { rows } = await query(
      `INSERT INTO public.perfil_usuario
         (id_perfil, email, nombre_completo, rol, telefono, id_division_asignada, contrasena_hash)
       VALUES
         (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
       RETURNING id_perfil, email, nombre_completo, rol, telefono, id_division_asignada, activo, created_at`,
      [
        email.toLowerCase().trim(),
        nombre_completo.trim(),
        rol,
        telefono || null,
        id_division_asignada || null,
        contrasena_hash,
      ]
    );

    return respuestaExito(res, rows[0], 'Usuario creado exitosamente.', 201);
  } catch (error) {
    console.error('[auth.controller] registro error:', error);
    return respuestaError(res, 'Error al crear el usuario.', 500, error.message);
  }
};

/**
 * GET /api/auth/perfil
 * Retorna los datos del usuario autenticado a partir del JWT.
 */
const obtenerPerfil = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id_perfil, email, nombre_completo, rol, telefono, id_division_asignada, activo, created_at
       FROM public.perfil_usuario
       WHERE id_perfil = $1 AND activo = TRUE`,
      [req.usuario.id]
    );

    if (rows.length === 0) {
      return respuestaError(res, 'Usuario no encontrado.', 404);
    }

    return respuestaExito(res, rows[0], 'Perfil obtenido correctamente.');
  } catch (error) {
    console.error('[auth.controller] obtenerPerfil error:', error);
    return respuestaError(res, 'Error al obtener el perfil.', 500, error.message);
  }
};

/**
 * PUT /api/auth/cambiar-contrasena
 * Permite a un usuario autenticado cambiar su propia contraseña.
 */
const cambiarContrasena = async (req, res) => {
  try {
    const { contrasena_actual, contrasena_nueva } = req.body;

    const { rows } = await query(
      `SELECT contrasena_hash FROM public.perfil_usuario WHERE id_perfil = $1 AND activo = TRUE`,
      [req.usuario.id]
    );

    if (rows.length === 0) {
      return respuestaError(res, 'Usuario no encontrado.', 404);
    }

    const esValida = await bcrypt.compare(contrasena_actual, rows[0].contrasena_hash);
    if (!esValida) {
      return respuestaError(res, 'La contraseña actual es incorrecta.', 401);
    }

    const nueva_hash = await bcrypt.hash(contrasena_nueva, 10);

    await query(
      `UPDATE public.perfil_usuario SET contrasena_hash = $1, updated_at = NOW() WHERE id_perfil = $2`,
      [nueva_hash, req.usuario.id]
    );

    return respuestaExito(res, null, 'Contraseña actualizada correctamente.');
  } catch (error) {
    console.error('[auth.controller] cambiarContrasena error:', error);
    return respuestaError(res, 'Error al cambiar la contraseña.', 500, error.message);
  }
};

/**
 * GET /api/auth/usuarios
 * Retorna todos los usuarios del sistema (Superadmin y Admin).
 */
const obtenerUsuarios = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT u.id_perfil, u.email, u.nombre_completo, u.rol, u.telefono,
              u.id_division_asignada, u.activo, u.created_at,
              d.nombre_division, d.temporada
       FROM public.perfil_usuario u
       LEFT JOIN public.division d ON d.id_division = u.id_division_asignada
       ORDER BY u.created_at DESC`
    );
    return respuestaExito(res, rows, 'Usuarios obtenidos correctamente.');
  } catch (error) {
    console.error('[auth.controller] obtenerUsuarios error:', error);
    return respuestaError(res, 'Error al obtener usuarios.', 500, error.message);
  }
};

/**
 * PUT /api/auth/usuarios/:id
 * Actualiza los datos de un usuario o resetea su contraseña (Superadmin).
 */
const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_completo, rol, telefono, id_division_asignada, activo, contrasena } = req.body;

    const ROLES_VALIDOS = ['Superadmin', 'Administrador', 'Tesorero', 'Delegado', 'DT', 'Visor'];
    if (rol && !ROLES_VALIDOS.includes(rol)) {
      return respuestaError(res, `Rol inválido. Roles permitidos: ${ROLES_VALIDOS.join(', ')}.`, 400);
    }

    let sql = `UPDATE public.perfil_usuario SET
                 nombre_completo = COALESCE($1, nombre_completo),
                 rol = COALESCE($2, rol),
                 telefono = $3,
                 id_division_asignada = $4,
                 activo = COALESCE($5, activo),
                 updated_at = NOW()`;
    const params = [
      nombre_completo ? nombre_completo.trim() : null,
      rol || null,
      telefono !== undefined ? (telefono ? telefono.trim() : null) : null,
      id_division_asignada ? Number(id_division_asignada) : null,
      activo !== undefined ? Boolean(activo) : null,
    ];

    if (contrasena && contrasena.trim().length >= 6) {
      const hash = await bcrypt.hash(contrasena.trim(), 10);
      params.push(hash);
      sql += `, contrasena_hash = $${params.length}`;
    }

    params.push(id);
    sql += ` WHERE id_perfil = $${params.length} RETURNING id_perfil, email, nombre_completo, rol, telefono, id_division_asignada, activo, updated_at`;

    const { rows } = await query(sql, params);
    if (rows.length === 0) return respuestaError(res, 'Usuario no encontrado.', 404);

    return respuestaExito(res, rows[0], 'Usuario actualizado correctamente.');
  } catch (error) {
    console.error('[auth.controller] actualizarUsuario error:', error);
    return respuestaError(res, 'Error al actualizar usuario.', 500, error.message);
  }
};

/**
 * DELETE /api/auth/usuarios/:id
 * Desactiva / da de baja un usuario del sistema (Superadmin).
 */
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.usuario && req.usuario.id === id) {
      return respuestaError(res, 'No podés eliminar tu propia cuenta en uso.', 400);
    }

    // Desactivación lógica (soft-delete)
    const { rows } = await query(
      `UPDATE public.perfil_usuario SET activo = FALSE, updated_at = NOW() WHERE id_perfil = $1 RETURNING id_perfil, email, nombre_completo`,
      [id]
    );
    if (rows.length === 0) return respuestaError(res, 'Usuario no encontrado.', 404);

    return respuestaExito(res, rows[0], 'Usuario dado de baja correctamente.');
  } catch (error) {
    console.error('[auth.controller] eliminarUsuario error:', error);
    return respuestaError(res, 'Error al eliminar usuario.', 500, error.message);
  }
};

module.exports = {
  login,
  registro,
  obtenerPerfil,
  cambiarContrasena,
  obtenerUsuarios,
  actualizarUsuario,
  eliminarUsuario,
};
