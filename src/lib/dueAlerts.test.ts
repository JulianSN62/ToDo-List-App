import { describe, expect, it } from 'vitest';
import {
  DUE_ALERT_DEFAULTS,
  dueAlertFireTimes,
  isValidAlertTime,
  normalizeOffsets,
  parseOffsets,
  serializeOffsets,
  toggleOffset,
} from './dueAlerts';

// Mismos patrones que los CHECK de user_settings en la migración inicial.
const OFFSETS_CHECK = /^\[\s*(\d+\s*(,\s*\d+\s*)*)?\]$/;
const TIME_CHECK = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

// Instante local: los avisos se calculan en la hora del dispositivo.
const local = (year: number, month: number, day: number, hours = 0, minutes = 0) =>
  new Date(year, month - 1, day, hours, minutes);

describe('días de anticipación', () => {
  it('normaliza: solo valores permitidos, sin repetidos y de mayor a menor', () => {
    expect(normalizeOffsets([0, 1, 1, 7, 5, -1])).toEqual([7, 1, 0]);
    expect(normalizeOffsets([])).toEqual([]);
  });

  it('marca y desmarca sin dejar la lista vacía', () => {
    expect(toggleOffset([1, 0], 3)).toEqual([3, 1, 0]);
    expect(toggleOffset([1, 0], 1)).toEqual([0]);
    expect(toggleOffset([0], 0)).toEqual([0]);
    expect(toggleOffset([], 2)).toEqual([2]);
    expect(toggleOffset([1], 5)).toEqual([1]);
  });

  it('serializa como lo acepta la base', () => {
    expect(serializeOffsets([0, 1])).toBe('[1,0]');
    expect(serializeOffsets([7, 3, 2, 1, 0])).toBe('[7,3,2,1,0]');
    for (const value of ['[1,0]', serializeOffsets([7]), serializeOffsets([])]) {
      expect(value).toMatch(OFFSETS_CHECK);
    }
  });

  it('lee lo guardado y rechaza lo inválido', () => {
    expect(parseOffsets('[1, 0]')).toEqual([1, 0]);
    expect(parseOffsets('[0,7,0]')).toEqual([7, 0]);
    expect(parseOffsets('[]')).toEqual([]);
    expect(parseOffsets('no es json')).toBeNull();
    expect(parseOffsets('[1.5]')).toBeNull();
    expect(parseOffsets('{"a":1}')).toBeNull();
    expect(parseOffsets(null)).toBeNull();
  });

  it('los valores por defecto coinciden con la base', () => {
    expect(serializeOffsets(DUE_ALERT_DEFAULTS.offsets)).toBe('[1,0]');
    expect(DUE_ALERT_DEFAULTS.time).toMatch(TIME_CHECK);
  });
});

describe('hora del aviso', () => {
  it('acepta HH:mm de 00:00 a 23:59', () => {
    for (const value of ['00:00', '09:00', '13:45', '23:59']) {
      expect(isValidAlertTime(value)).toBe(true);
      expect(value).toMatch(TIME_CHECK);
    }
  });

  it('rechaza otros formatos', () => {
    for (const value of ['24:00', '9:00', '09:60', '09:00:00', '', 'ab:cd']) {
      expect(isValidAlertTime(value)).toBe(false);
    }
  });
});

describe('cálculo de avisos (spec 6.6)', () => {
  const settings = { enabled: true, offsets: [1, 0], time: '09:00' };

  it('un aviso por cada día de anticipación, a la hora configurada', () => {
    const now = local(2026, 10, 1, 8);
    expect(dueAlertFireTimes('2026-10-10', settings, now)).toEqual([
      local(2026, 10, 9, 9),
      local(2026, 10, 10, 9),
    ]);
  });

  it('solo los que todavía no pasaron', () => {
    expect(dueAlertFireTimes('2026-10-10', settings, local(2026, 10, 9, 9))).toEqual([
      local(2026, 10, 10, 9),
    ]);
    expect(dueAlertFireTimes('2026-10-10', settings, local(2026, 10, 10, 9, 30))).toEqual([]);
  });

  it('cruza meses y años', () => {
    const now = local(2026, 12, 1);
    expect(
      dueAlertFireTimes('2027-01-02', { enabled: true, offsets: [7, 2], time: '18:30' }, now),
    ).toEqual([local(2026, 12, 26, 18, 30), local(2026, 12, 31, 18, 30)]);
  });

  it('sin alertas activas, con una hora inválida o sin fecha válida no hay avisos', () => {
    const now = local(2026, 10, 1);
    expect(dueAlertFireTimes('2026-10-10', { ...settings, enabled: false }, now)).toEqual([]);
    expect(dueAlertFireTimes('2026-10-10', { ...settings, time: '25:00' }, now)).toEqual([]);
    expect(dueAlertFireTimes('2026-02-30', settings, now)).toEqual([]);
  });
});
