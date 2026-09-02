import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/* Este método genera el hash bcrypt de una contraseña en texto plano. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/* Este método compara una contraseña en texto plano contra el hash almacenado. */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
