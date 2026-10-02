import { describe, expect, it } from 'vitest';
import {
  addDaysToLocalDate,
  diffInLocalDays,
  formatLongDate,
  isOverdue,
  isValidLocalDate,
  nextWeekLocalDate,
  parseInstant,
  relativeDueLabel,
  todayLocalDate,
} from './dates';

describe('fechas locales', () => {
  it('valida fechas YYYY-MM-DD reales', () => {
    expect(isValidLocalDate('2026-10-01')).toBe(true);
    expect(isValidLocalDate('2026-02-30')).toBe(false);
    expect(isValidLocalDate('2026-1-1')).toBe(false);
    expect(isValidLocalDate('')).toBe(false);
  });

  it('obtiene el día local de hoy', () => {
    expect(todayLocalDate(new Date(2026, 9, 1, 23, 59))).toBe('2026-10-01');
    expect(todayLocalDate(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
  });

  it('suma días cruzando meses y años', () => {
    expect(addDaysToLocalDate('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDaysToLocalDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToLocalDate('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('calcula diferencias en días de calendario', () => {
    expect(diffInLocalDays('2026-10-05', '2026-10-01')).toBe(4);
    expect(diffInLocalDays('2026-09-30', '2026-10-01')).toBe(-1);
  });

  it('calcula el próximo lunes', () => {
    expect(nextWeekLocalDate('2026-10-01')).toBe('2026-10-05'); // jueves -> lunes
    expect(nextWeekLocalDate('2026-10-05')).toBe('2026-10-12'); // lunes -> lunes siguiente
    expect(nextWeekLocalDate('2026-10-04')).toBe('2026-10-05'); // domingo -> lunes
  });
});

describe('etiquetas relativas', () => {
  const today = '2026-10-01';

  it('usa Hoy, Mañana y Ayer', () => {
    expect(relativeDueLabel('2026-10-01', today)).toEqual({ label: 'Hoy', tone: 'today' });
    expect(relativeDueLabel('2026-10-02', today)).toEqual({ label: 'Mañana', tone: 'normal' });
    expect(relativeDueLabel('2026-09-30', today)).toEqual({ label: 'Ayer', tone: 'overdue' });
  });

  it('indica cuántos días lleva vencida', () => {
    expect(relativeDueLabel('2026-09-28', today)).toEqual({
      label: 'Vencida hace 3 días',
      tone: 'overdue',
    });
  });

  it('muestra la fecha corta para fechas futuras', () => {
    expect(relativeDueLabel('2026-10-10', today).tone).toBe('normal');
    expect(relativeDueLabel('2027-01-15', today).label).toContain('2027');
  });

  it('muestra la fecha larga, con el año solo si no es el actual', () => {
    expect(formatLongDate('2026-10-03', today)).toBe('sábado 3 de octubre');
    expect(formatLongDate('2027-01-15', today)).toBe('viernes 15 de enero de 2027');
  });

  it('detecta tareas vencidas', () => {
    expect(isOverdue('2026-09-30', today)).toBe(true);
    expect(isOverdue('2026-10-01', today)).toBe(false);
    expect(isOverdue(null, today)).toBe(false);
  });
});

describe('parseInstant', () => {
  it('acepta ISO 8601 y el formato con espacio', () => {
    const expected = Date.UTC(2026, 9, 1, 12, 30, 0);
    expect(parseInstant('2026-10-01T12:30:00.000Z')?.getTime()).toBe(expected);
    expect(parseInstant('2026-10-01 12:30:00Z')?.getTime()).toBe(expected);
    expect(parseInstant('2026-10-01 12:30:00+00')?.getTime()).toBe(expected);
    expect(parseInstant('2026-10-01 09:30:00-03:00')?.getTime()).toBe(expected);
    expect(parseInstant('2026-10-01 12:30:00')?.getTime()).toBe(expected);
  });

  it('devuelve null para valores vacíos o inválidos', () => {
    expect(parseInstant(null)).toBeNull();
    expect(parseInstant('')).toBeNull();
    expect(parseInstant('no es fecha')).toBeNull();
  });
});
