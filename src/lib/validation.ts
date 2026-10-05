import { z } from 'zod';
import { isValidLocalDate } from './dates';

// Límites de texto. Deben coincidir con los CHECK de la migración SQL:
// si el servidor rechaza un dato por un límite, ese cambio se descarta.
export const LIMITS = {
  folderName: 100,
  taskTitle: 200,
  taskDescription: 10000,
  tagName: 50,
  linkUrl: 2048,
  linkLabel: 200,
  fileName: 255,
  mimeType: 255,
  reminderMessage: 200,
} as const;

export const folderNameSchema = z.string().trim().min(1).max(LIMITS.folderName);
export const taskTitleSchema = z.string().trim().min(1).max(LIMITS.taskTitle);
export const taskDescriptionSchema = z.string().max(LIMITS.taskDescription);
export const tagNameSchema = z.string().trim().min(1).max(LIMITS.tagName);
export const localDateSchema = z.string().refine(isValidLocalDate);

// Normaliza un título: recorta espacios y lo valida. null si no es válido.
export function normalizeTitle(raw: string): string | null {
  const result = taskTitleSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function normalizeFolderName(raw: string): string | null {
  const result = folderNameSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function normalizeTagName(raw: string): string | null {
  const result = tagNameSchema.safeParse(raw);
  return result.success ? result.data : null;
}

// Descripción: vacía se guarda como null; se recorta al límite.
export function normalizeDescription(raw: string): string | null {
  const value = raw.replace(/\s+$/, '');
  if (value.trim().length === 0) return null;
  return value.slice(0, LIMITS.taskDescription);
}

const EMAIL_SCHEMA = z.email();

export function isValidEmail(value: string): boolean {
  return EMAIL_SCHEMA.safeParse(value.trim()).success;
}

// Código de inicio de sesión: exactamente "length" dígitos.
export function isValidOtp(value: string, length: number): boolean {
  return value.length === length && /^\d+$/.test(value);
}
