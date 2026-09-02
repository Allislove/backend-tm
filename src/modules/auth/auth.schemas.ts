import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('El correo no es válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.')
});
