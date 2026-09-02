import { hashPassword } from '../shared/security/password';

/* Este método imprime un hash bcrypt para pegarlo en el seed SQL o en Lightsail. */
async function main() {
  const password = process.argv[2] ?? 'Demo1234!';
  const hash = await hashPassword(password);
  console.log(hash);
}

void main();
