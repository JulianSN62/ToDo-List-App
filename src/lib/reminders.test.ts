import { describe, expect, it } from 'vitest';
import {
  MAX_REMINDER_TIMES,
  defaultReminderRow,
  diffReminders,
  hasReminderChanges,
  instantToRow,
  normalizeInstant,
  remindersToCreate,
  rowToInstant,
  sameReminders,
  upcomingTimes,
  validateReminderDraft,
  type ReminderDraft,
  type ReminderTimeRow,
} from './reminders';
import { LIMITS } from './validation';

// Instante local: las fechas se eligen en la hora del dispositivo.
const local = (year: number, month: number, day: number, hours = 0, minutes = 0) =>
  new Date(year, month - 1, day, hours, minutes);
const iso = (...args: Parameters<typeof local>) => local(...args).toISOString();
const row = (key: string, date: string, time: string): ReminderTimeRow => ({ key, date, time });

const NOW = local(2026, 10, 4, 12, 0);

describe('filas de fecha y hora', () => {
  it('convierte fecha y hora locales en un instante', () => {
    expect(rowToInstant(row('a', '2026-10-05', '09:30'))?.toISOString()).toBe(
      iso(2026, 10, 5, 9, 30),
    );
    expect(rowToInstant(row('a', '2026-10-05', ''))).toBeNull();
    expect(rowToInstant(row('a', '2026-02-30', '09:00'))).toBeNull();
    expect(rowToInstant(row('a', '2026-10-05', '25:00'))).toBeNull();
  });

  it('una fila nueva propone la próxima hora en punto', () => {
    expect(defaultReminderRow('k', local(2026, 10, 4, 14, 37))).toEqual(
      row('k', '2026-10-04', '15:00'),
    );
    expect(defaultReminderRow('k', local(2026, 10, 4, 23, 20))).toEqual(
      row('k', '2026-10-05', '00:00'),
    );
  });

  it('muestra un instante guardado en la hora local', () => {
    expect(instantToRow('k', iso(2026, 10, 5, 9, 5))).toEqual(row('k', '2026-10-05', '09:05'));
    expect(instantToRow('k', 'no es una fecha')).toEqual(row('k', '', ''));
  });

  it('normaliza el formato que devuelve la sincronización', () => {
    expect(normalizeInstant('2026-10-05 12:00:00+00')).toBe('2026-10-05T12:00:00.000Z');
    expect(normalizeInstant('basura')).toBeNull();
  });
});

describe('validar la ventana del recordatorio', () => {
  it('acepta fechas futuras, sin repetidas y ordenadas', () => {
    const result = validateReminderDraft(
      '  Llamar  ',
      [
        row('b', '2026-10-06', '10:00'),
        row('a', '2026-10-05', '09:00'),
        row('c', '2026-10-06', '10:00'),
        row('d', '', ''),
      ],
      [],
      NOW,
    );
    expect(result).toEqual({
      ok: true,
      message: 'Llamar',
      times: [
        { id: null, fireAt: iso(2026, 10, 5, 9) },
        { id: null, fireAt: iso(2026, 10, 6, 10) },
      ],
    });
  });

  it('el mensaje vacío se guarda como null', () => {
    const result = validateReminderDraft('   ', [row('a', '2026-10-05', '09:00')], [], NOW);
    expect(result.ok && result.message).toBeNull();
  });

  it('rechaza fechas pasadas o incompletas, marcando la fila', () => {
    const result = validateReminderDraft(
      '',
      [
        row('past', '2026-10-04', '11:59'),
        row('now', '2026-10-04', '12:00'),
        row('half', '2026-10-05', ''),
        row('ok', '2026-10-05', '09:00'),
      ],
      [],
      NOW,
    );
    expect(result).toEqual({
      ok: false,
      error: null,
      rows: { past: 'past', now: 'past', half: 'incomplete' },
    });
  });

  it('pide al menos una fecha', () => {
    expect(validateReminderDraft('Hola', [row('a', '', '')], [], NOW)).toEqual({
      ok: false,
      error: 'noTimes',
      rows: {},
    });
  });

  it('limita la cantidad de fechas y el largo del mensaje', () => {
    const rows = Array.from({ length: MAX_REMINDER_TIMES + 1 }, (_, index) =>
      row(`r${index}`, '2026-10-05', `${String(index + 8).padStart(2, '0')}:00`),
    );
    expect(validateReminderDraft('', rows, [], NOW)).toMatchObject({ ok: false, error: 'tooMany' });
    expect(
      validateReminderDraft(
        'x'.repeat(LIMITS.reminderMessage + 1),
        [row('a', '2026-10-05', '09:00')],
        [],
        NOW,
      ),
    ).toMatchObject({ ok: false, error: 'messageTooLong' });
  });

  it('las fechas guardadas que no cambiaron conservan su id aunque ya hayan pasado', () => {
    const saved = [
      { id: 't1', fireAt: '2026-10-04 13:00:00+00' },
      { id: 't2', fireAt: iso(2026, 10, 4, 11) },
    ];
    const result = validateReminderDraft(
      '',
      [instantToRow('a', saved[0]!.fireAt), instantToRow('b', saved[1]!.fireAt)],
      saved,
      NOW,
    );
    expect(result).toEqual({
      ok: true,
      message: null,
      times: [
        { id: 't2', fireAt: iso(2026, 10, 4, 11) },
        { id: 't1', fireAt: '2026-10-04T13:00:00.000Z' },
      ].sort((a, b) => a.fireAt.localeCompare(b.fireAt)),
    });
  });
});

describe('fechas próximas', () => {
  it('quita las que pasaron y ordena', () => {
    const times = [
      { fireAt: iso(2026, 10, 6) },
      { fireAt: iso(2026, 10, 4, 11) },
      { fireAt: '2026-10-05 00:00:00+00' },
    ];
    expect(upcomingTimes(times, NOW).map((time) => time.fireAt)).toEqual([
      '2026-10-05 00:00:00+00',
      iso(2026, 10, 6),
    ]);
  });
});

describe('cambios de los recordatorios de la ventana', () => {
  const saved: ReminderDraft = {
    key: 'r1',
    id: 'r1',
    message: 'Llamar',
    times: [
      { id: 't1', fireAt: iso(2026, 10, 5, 9) },
      { id: 't2', fireAt: iso(2026, 10, 6, 9) },
    ],
  };

  it('sin cambios no hay nada para guardar', () => {
    const changes = diffReminders([saved], [{ ...saved }]);
    expect(hasReminderChanges(changes)).toBe(false);
    expect(sameReminders([saved], [{ ...saved }])).toBe(true);
  });

  it('agrega, cambia y quita', () => {
    const fresh: ReminderDraft = {
      key: 'n1',
      id: null,
      message: '',
      times: [{ id: null, fireAt: iso(2026, 10, 7, 8) }],
    };
    const edited: ReminderDraft = {
      ...saved,
      message: 'Llamar al banco',
      times: [saved.times[1]!, { id: null, fireAt: iso(2026, 10, 8, 9) }],
    };
    const other: ReminderDraft = { ...saved, key: 'r2', id: 'r2' };

    const changes = diffReminders([saved, other], [edited, fresh]);
    expect(changes).toEqual({
      add: [{ message: null, fireAts: [iso(2026, 10, 7, 8)] }],
      update: [
        {
          id: 'r1',
          message: 'Llamar al banco',
          addFireAts: [iso(2026, 10, 8, 9)],
          removeTimeIds: ['t1'],
        },
      ],
      remove: ['r2'],
    });
    expect(sameReminders([saved, other], [edited, fresh])).toBe(false);
  });

  it('al crear la tarea solo se guardan los recordatorios con fechas', () => {
    expect(
      remindersToCreate([
        { key: 'a', id: null, message: ' Hola ', times: [{ id: null, fireAt: 'x' }] },
        { key: 'b', id: null, message: '', times: [] },
      ]),
    ).toEqual([{ message: 'Hola', fireAts: ['x'] }]);
  });
});
