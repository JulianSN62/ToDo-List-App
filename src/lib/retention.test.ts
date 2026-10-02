import { describe, expect, it } from 'vitest';
import {
  clampRetentionDays,
  daysUntilPurge,
  isRetentionExpired,
  isSoftDeleteExpired,
} from './retention';

const now = new Date('2026-10-10T12:00:00Z');

describe('retención de completadas', () => {
  it('limita los días entre 1 y 90', () => {
    expect(clampRetentionDays(0)).toBe(1);
    expect(clampRetentionDays(200)).toBe(90);
    expect(clampRetentionDays(Number.NaN)).toBe(7);
  });

  it('calcula los días que faltan para borrar', () => {
    expect(daysUntilPurge('2026-10-10T12:00:00Z', 7, now)).toBe(7);
    expect(daysUntilPurge('2026-10-05T12:00:00Z', 7, now)).toBe(2);
    expect(daysUntilPurge('2026-09-01T12:00:00Z', 7, now)).toBe(0);
  });

  it('detecta completadas vencidas por retención', () => {
    expect(isRetentionExpired('2026-10-03T11:00:00Z', 7, now)).toBe(true);
    expect(isRetentionExpired('2026-10-04T12:00:00Z', 7, now)).toBe(false);
    expect(isRetentionExpired(null, 7, now)).toBe(false);
  });

  it('detecta eliminados lógicos con más de 30 días', () => {
    expect(isSoftDeleteExpired('2026-09-01T00:00:00Z', now)).toBe(true);
    expect(isSoftDeleteExpired('2026-10-01T00:00:00Z', now)).toBe(false);
  });
});
