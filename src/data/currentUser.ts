import { storage } from '@/platform';
import type { CurrentUser } from './types';

// Último usuario conocido en este dispositivo. Permite abrir la app sin conexión
// aunque el access token haya vencido (se renueva solo al volver internet).

const KNOWN_USER_KEY = 'todo.knownUser';

let currentUser: CurrentUser | null = null;

export function setCurrentUser(user: CurrentUser | null): void {
  currentUser = user;
}

export function getCurrentUser(): CurrentUser | null {
  return currentUser;
}

// Los repositorios necesitan el dueño de cada fila nueva.
export function requireUserId(): string {
  if (!currentUser) {
    throw new Error('No hay una sesión iniciada');
  }
  return currentUser.id;
}

export async function loadKnownUser(): Promise<CurrentUser | null> {
  const raw = await storage.getItem(KNOWN_USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CurrentUser>;
    if (typeof parsed.id === 'string' && typeof parsed.email === 'string') {
      return { id: parsed.id, email: parsed.email };
    }
  } catch {
    // Valor corrupto: se descarta.
  }
  return null;
}

export async function saveKnownUser(user: CurrentUser): Promise<void> {
  await storage.setItem(KNOWN_USER_KEY, JSON.stringify(user));
}

export async function clearKnownUser(): Promise<void> {
  await storage.removeItem(KNOWN_USER_KEY);
}
