import { format } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import { es } from '@/i18n/es';

// Fechas límite (due_date): cadena YYYY-MM-DD interpretada como día local, sin zona horaria.
// Instantes (done_at, created_at...): ISO 8601 en UTC, se muestran en hora local.

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface LocalDateParts {
  year: number;
  month: number; // 1-12
  day: number;
}

export function parseLocalDate(value: string): LocalDateParts | null {
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function isValidLocalDate(value: string): boolean {
  return parseLocalDate(value) !== null;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

// Día de hoy (local del dispositivo) como YYYY-MM-DD.
export function todayLocalDate(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Suma días a una fecha YYYY-MM-DD (aritmética en UTC para evitar problemas de horario de verano).
export function addDaysToLocalDate(value: string, days: number): string {
  const parts = parseLocalDate(value);
  if (!parts) throw new Error('Fecha inválida');
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

// Diferencia en días de calendario: a - b.
export function diffInLocalDays(a: string, b: string): number {
  const pa = parseLocalDate(a);
  const pb = parseLocalDate(b);
  if (!pa || !pb) throw new Error('Fecha inválida');
  const ta = Date.UTC(pa.year, pa.month - 1, pa.day);
  const tb = Date.UTC(pb.year, pb.month - 1, pb.day);
  return Math.round((ta - tb) / DAY_MS);
}

// Próximo lunes (atajo "Próxima semana").
export function nextWeekLocalDate(today: string): string {
  const parts = parseLocalDate(today);
  if (!parts) throw new Error('Fecha inválida');
  const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay(); // 0 = domingo
  const daysUntilMonday = (8 - weekday) % 7 || 7;
  return addDaysToLocalDate(today, daysUntilMonday);
}

export type DueTone = 'overdue' | 'today' | 'normal';

export interface DueLabel {
  label: string;
  tone: DueTone;
}

// Etiqueta relativa de una fecha límite: Hoy, Mañana, Ayer, Vencida hace N días o la fecha corta.
export function relativeDueLabel(dueDate: string, today: string): DueLabel {
  const diff = diffInLocalDays(dueDate, today);
  if (diff === 0) return { label: es.dates.today, tone: 'today' };
  if (diff === 1) return { label: es.dates.tomorrow, tone: 'normal' };
  if (diff === -1) return { label: es.dates.yesterday, tone: 'overdue' };
  if (diff < -1) return { label: es.dates.overdueDays(-diff), tone: 'overdue' };
  const parts = parseLocalDate(dueDate);
  const todayParts = parseLocalDate(today);
  if (!parts || !todayParts) return { label: dueDate, tone: 'normal' };
  const date = new Date(parts.year, parts.month - 1, parts.day);
  const pattern = parts.year === todayParts.year ? 'EEE d MMM' : 'd MMM yyyy';
  return { label: format(date, pattern, { locale: esLocale }), tone: 'normal' };
}

// Fecha larga: "jueves 3 de octubre" (con el año si no es el actual).
export function formatLongDate(value: string, today: string): string {
  const parts = parseLocalDate(value);
  const todayParts = parseLocalDate(today);
  if (!parts || !todayParts) return value;
  const date = new Date(parts.year, parts.month - 1, parts.day);
  const pattern =
    parts.year === todayParts.year ? "EEEE d 'de' MMMM" : "EEEE d 'de' MMMM 'de' yyyy";
  return format(date, pattern, { locale: esLocale });
}

// Fecha y hora de un recordatorio en hora local: "Hoy 18:30", "Mañana 09:00",
// "sáb 10 oct 09:00" (con el año si no es el actual).
export function formatInstantShort(value: string, now: Date = new Date()): string {
  const date = parseInstant(value);
  if (!date) return value;
  const time = format(date, 'HH:mm');
  const diff = diffInLocalDays(todayLocalDate(date), todayLocalDate(now));
  if (diff === 0) return es.dates.atTime(es.dates.today, time);
  if (diff === 1) return es.dates.atTime(es.dates.tomorrow, time);
  const pattern = date.getFullYear() === now.getFullYear() ? 'EEE d MMM' : 'd MMM yyyy';
  return es.dates.atTime(format(date, pattern, { locale: esLocale }), time);
}

export function isOverdue(dueDate: string | null, today: string): boolean {
  if (!dueDate) return false;
  return diffInLocalDays(dueDate, today) < 0;
}

// Instante actual en ISO 8601 UTC.
export function nowIso(): string {
  return new Date().toISOString();
}

// Parsea instantes en ISO ("2026-10-01T12:00:00.000Z") o con espacio
// ("2026-10-01 12:00:00Z", "2026-10-01 12:00:00+00"), como puede enviarlos la sincronización.
export function parseInstant(value: string | null | undefined): Date | null {
  if (!value) return null;
  let normalized = value.trim().replace(' ', 'T');
  // Offsets cortos de Postgres (+00, -03) a formato ISO (+00:00)
  normalized = normalized.replace(/([+-]\d{2})$/, '$1:00');
  // Sin zona horaria: se asume UTC
  if (!/(Z|[+-]\d{2}:\d{2})$/i.test(normalized)) {
    normalized = `${normalized}Z`;
  }
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}
