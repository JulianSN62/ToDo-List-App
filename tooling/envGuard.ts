// Controles de seguridad sobre las variables de entorno públicas (VITE_*).
// Todo lo que empieza con VITE_ termina dentro del bundle que descarga cualquier visitante,
// así que nunca puede contener claves secretas.

const SECRET_NAME_PATTERN = /(SECRET|SERVICE_ROLE|PASSWORD|PRIVATE)/i;

function decodeJwtRole(value: string): string | null {
  const parts = value.split('.');
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
      role?: unknown;
    };
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

// Devuelve la lista de problemas encontrados. Vacía si todo está bien.
export function findSecretsInPublicEnv(env: Record<string, string>): string[] {
  const problems: string[] = [];
  for (const [name, rawValue] of Object.entries(env)) {
    if (!name.startsWith('VITE_')) continue;
    const value = rawValue.trim();
    if (SECRET_NAME_PATTERN.test(name)) {
      problems.push(`${name}: el nombre sugiere un secreto y las variables VITE_ son públicas.`);
    }
    if (value.startsWith('sb_secret_')) {
      problems.push(`${name}: contiene una clave secreta de Supabase (sb_secret_...).`);
    }
    if (decodeJwtRole(value) === 'service_role') {
      problems.push(`${name}: contiene una clave service_role de Supabase.`);
    }
  }
  return problems;
}

export function assertNoSecretsInPublicEnv(env: Record<string, string>): void {
  const problems = findSecretsInPublicEnv(env);
  if (problems.length > 0) {
    throw new Error(
      `Build cancelado: se detectaron secretos en variables públicas.\n- ${problems.join('\n- ')}`,
    );
  }
}
