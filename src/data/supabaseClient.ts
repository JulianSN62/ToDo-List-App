import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireEnv } from '@/config/env';
import { storage } from '@/platform';

// Clave fija del almacenamiento de sesión (permite limpiarla manualmente si hace falta).
export const AUTH_STORAGE_KEY = 'todo.auth';

let client: SupabaseClient | null = null;

// Cliente único de Supabase. Solo usa la publishable key (pública por diseño):
// la seguridad la dan las políticas RLS de la base.
export function getSupabase(): SupabaseClient {
  if (!client) {
    const env = requireEnv();
    client = createClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: {
        // Sesión persistente sin expiración forzada: el token se renueva solo en segundo plano.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: AUTH_STORAGE_KEY,
        // Web: localStorage. Android: Preferences nativas (ver src/platform).
        storage,
      },
    });
  }
  return client;
}

// Borra la sesión guardada sin pasar por la red (cierre de sesión sin conexión).
export async function clearStoredSession(): Promise<void> {
  await storage.removeItem(AUTH_STORAGE_KEY);
  await storage.removeItem(`${AUTH_STORAGE_KEY}-user`);
  await storage.removeItem(`${AUTH_STORAGE_KEY}-code-verifier`);
}
