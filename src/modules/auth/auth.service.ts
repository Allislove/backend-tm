import { AppError } from '../../shared/http/app-error';
import { signAccessToken } from '../../shared/security/jwt';
import { verifyPassword } from '../../shared/security/password';
import { findUserByEmail, findUserById, updateLastLoginAt, type UserRow } from './auth.repository';

/* Este método arma el perfil público del usuario sin incluir el hash de contraseña. */
function toPublicUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: `${user.firstName} ${user.lastName}`.trim(),
    role: user.roleCode,
    roleName: user.roleName,
    isActive: user.isActive
  };
}

export const authService = {
  /* Este método valida credenciales, emite un JWT y actualiza el último acceso. */
  async login(input: { email: string; password: string }) {
    const user = await findUserByEmail(input.email);

    if (!user || !user.isActive || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AppError(401, 'invalid_credentials', 'Correo o contraseña incorrectos.');
    }

    await updateLastLoginAt(user.id);

    return {
      item: toPublicUser(user),
      accessToken: signAccessToken({
        sub: user.id,
        email: user.email,
        role: user.roleCode
      })
    };
  },

  /* Este método devuelve el perfil del usuario autenticado a partir del JWT. */
  async me(userId: string) {
    const user = await findUserById(userId);

    if (!user || !user.isActive) {
      throw new AppError(401, 'unauthenticated', 'La sesión ya no es válida.');
    }

    return { item: toPublicUser(user) };
  }
};
