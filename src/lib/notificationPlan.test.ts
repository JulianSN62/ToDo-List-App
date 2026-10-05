import { describe, expect, it } from 'vitest';
import {
  MAX_SCHEDULED,
  TEST_NOTIFICATION_ID,
  buildDesiredNotifications,
  notificationChannels,
  planReconcile,
  type NotificationSources,
  type NotificationTaskSource,
  type PlannedNotification,
  type RegistryEntry,
} from './notificationPlan';

const local = (year: number, month: number, day: number, hours = 0, minutes = 0) =>
  new Date(year, month - 1, day, hours, minutes);
const iso = (...args: Parameters<typeof local>) => local(...args).toISOString();

// Sábado 4 de octubre de 2026, 12:00 (hora local).
const NOW = local(2026, 10, 4, 12, 0);

const ALERTS_ON = { enabled: true, offsets: [1, 0], time: '09:00' };

function task(patch: Partial<NotificationTaskSource> & { id: string }): NotificationTaskSource {
  return {
    folderId: 'child',
    title: `Tarea ${patch.id}`,
    description: null,
    dueDate: null,
    isDone: false,
    isPinned: false,
    ...patch,
  };
}

function sources(patch: Partial<NotificationSources> = {}): NotificationSources {
  return {
    tasks: [],
    folders: [
      { id: 'root', parentId: null, name: 'Casa' },
      { id: 'child', parentId: 'root', name: 'Compras' },
    ],
    reminders: [],
    dueAlerts: ALERTS_ON,
    ...patch,
  };
}

describe('conjunto deseado', () => {
  it('avisos de vencimiento: solo futuros, con el título según los días y la ruta', () => {
    const desired = buildDesiredNotifications(
      sources({ tasks: [task({ id: 'a', title: 'Pagar luz', dueDate: '2026-10-05' })] }),
      NOW,
    );
    // El aviso de "1 día antes" (sábado 9:00) ya pasó: queda solo el del mismo día.
    expect(desired.map((item) => [item.key, item.fireAt, item.title, item.body])).toEqual([
      [
        `due:a:${iso(2026, 10, 5, 9)}`,
        iso(2026, 10, 5, 9),
        'Vence hoy: Pagar luz',
        'Casa › Compras',
      ],
    ]);
  });

  it('describe cada aviso según la anticipación', () => {
    const desired = buildDesiredNotifications(
      sources({
        tasks: [task({ id: 'a', title: 'Pagar luz', dueDate: '2026-10-08' })],
        dueAlerts: { enabled: true, offsets: [3, 1, 0], time: '09:00' },
      }),
      NOW,
    );
    expect(desired.map((item) => [item.title, item.body, item.channel])).toEqual([
      ['Vence en 3 días: Pagar luz', 'Casa › Compras', 'due_alerts'],
      ['Vence mañana: Pagar luz', 'Casa › Compras', 'due_alerts'],
      ['Vence hoy: Pagar luz', 'Casa › Compras', 'due_alerts'],
    ]);
  });

  it('sin alertas activas, completadas o sin fecha: no hay avisos de vencimiento', () => {
    const tasks = [
      task({ id: 'a', dueDate: '2026-10-08' }),
      task({ id: 'b', dueDate: '2026-10-08', isDone: true }),
      task({ id: 'c' }),
    ];
    expect(buildDesiredNotifications(sources({ tasks }), NOW).map((i) => i.refId)).toEqual([
      'a',
      'a',
    ]);
    expect(
      buildDesiredNotifications(
        sources({ tasks, dueAlerts: { ...ALERTS_ON, enabled: false } }),
        NOW,
      ),
    ).toEqual([]);
  });

  it('recordatorios: fechas futuras, también de tareas completadas, con mensaje o título', () => {
    const desired = buildDesiredNotifications(
      sources({
        tasks: [task({ id: 'a', title: 'Llamar', isDone: true })],
        reminders: [
          { timeId: 't1', taskId: 'a', message: 'Al banco', fireAt: iso(2026, 10, 5, 10) },
          { timeId: 't2', taskId: 'a', message: null, fireAt: '2026-10-06 13:00:00+00' },
          { timeId: 't3', taskId: 'a', message: null, fireAt: iso(2026, 10, 4, 11) },
          { timeId: 't4', taskId: 'borrada', message: null, fireAt: iso(2026, 10, 5) },
        ],
      }),
      NOW,
    );
    expect(desired.map((item) => [item.key, item.title, item.body, item.channel])).toEqual([
      [`reminder:t1:${iso(2026, 10, 5, 10)}`, 'Al banco', 'Llamar · Casa › Compras', 'reminders'],
      ['reminder:t2:2026-10-06T13:00:00.000Z', 'Llamar', 'Casa › Compras', 'reminders'],
    ]);
  });

  it('ancladas: se muestran enseguida, con la fecha límite, la descripción o la ruta', () => {
    const desired = buildDesiredNotifications(
      sources({
        dueAlerts: { ...ALERTS_ON, enabled: false },
        tasks: [
          task({ id: 'a', isPinned: true, dueDate: '2026-10-10' }),
          task({ id: 'b', isPinned: true, description: '  Leche,\n pan  ' }),
          task({ id: 'c', isPinned: true }),
          task({ id: 'd', isPinned: true, isDone: true }),
        ],
      }),
      NOW,
    );
    expect(desired.map((item) => [item.key, item.fireAt, item.body, item.channel])).toEqual([
      ['pin:a:', null, 'Vence el sábado 10 de octubre', 'pinned'],
      ['pin:b:', null, 'Leche, pan', 'pinned'],
      ['pin:c:', null, 'Casa › Compras', 'pinned'],
    ]);
  });

  it('respeta la ventana de 60 días y el máximo, con las ancladas primero', () => {
    const reminders = Array.from({ length: MAX_SCHEDULED + 10 }, (_, index) => ({
      timeId: `t${index}`,
      taskId: 'a',
      message: null,
      fireAt: new Date(NOW.getTime() + (index + 1) * 60_000).toISOString(),
    }));
    reminders.push({ timeId: 'lejos', taskId: 'a', message: null, fireAt: iso(2026, 12, 10) });
    const desired = buildDesiredNotifications(
      sources({ tasks: [task({ id: 'a', isPinned: true })], reminders }),
      NOW,
    );
    expect(desired).toHaveLength(MAX_SCHEDULED);
    expect(desired[0]?.kind).toBe('pin');
    expect(desired[1]?.refId).toBe('t0');
    expect(desired.some((item) => item.refId === 'lejos')).toBe(false);
  });

  it('define los tres canales del spec', () => {
    expect(notificationChannels().map((channel) => [channel.id, channel.importance])).toEqual([
      ['due_alerts', 4],
      ['reminders', 4],
      ['pinned', 2],
      ['default', 3],
    ]);
  });
});

function item(key: string, patch: Partial<PlannedNotification> = {}): PlannedNotification {
  const [kind, refId] = key.split(':') as [PlannedNotification['kind'], string];
  return {
    key,
    kind,
    refId,
    taskId: refId,
    fireAt: kind === 'pin' ? null : iso(2026, 10, 5, 9),
    title: 'Título',
    body: 'Cuerpo',
    channel: kind === 'pin' ? 'pinned' : kind === 'due' ? 'due_alerts' : 'reminders',
    signature: 'firma',
    ...patch,
  };
}

function entry(planned: PlannedNotification, notifId: number): RegistryEntry {
  return {
    key: planned.key,
    notifId,
    kind: planned.kind,
    refId: planned.refId,
    taskId: planned.taskId,
    fireAt: planned.fireAt,
    signature: planned.signature,
  };
}

const active = (scheduled: number[], visible: number[] = []) => ({
  scheduledIds: new Set(scheduled),
  visibleIds: new Set(visible),
});

describe('reconciliar', () => {
  it('programa lo nuevo con los menores IDs libres; las ancladas van aparte', () => {
    const plan = planReconcile([item('due:a:1'), item('pin:b:')], [], active([1], [2]), NOW);
    // 1 está programado y 2 visible (aunque no sean de la app): no se reutilizan.
    expect(plan.schedule.map((s) => [s.id, s.item.key])).toEqual([[3, 'due:a:1']]);
    expect(plan.pinned.map((s) => [s.id, s.item.key])).toEqual([[4, 'pin:b:']]);
    // El 1 está programado pero no figura en el registro: se cancela.
    expect(plan.cancel).toEqual([1]);
    expect(plan.registry.map((e) => [e.key, e.notifId])).toEqual([
      ['due:a:1', 3],
      ['pin:b:', 4],
    ]);
  });

  it('lo que no cambió no se reprograma y conserva su ID; las ancladas se informan siempre', () => {
    const due = item('due:a:1');
    const pin = item('pin:b:');
    const plan = planReconcile([due, pin], [entry(due, 7), entry(pin, 8)], active([7], [8]), NOW);
    expect(plan.schedule).toEqual([]);
    expect(plan.cancel).toEqual([]);
    expect(plan.pinned.map((s) => s.id)).toEqual([8]);
    expect(plan.registry.map((e) => e.notifId)).toEqual([7, 8]);
  });

  it('reprograma con el mismo ID lo que cambió de contenido', () => {
    const due = item('due:a:1');
    const plan = planReconcile([{ ...due, signature: 'otra' }], [entry(due, 7)], active([7]), NOW);
    expect(plan.schedule.map((s) => s.id)).toEqual([7]);
    expect(plan.registry[0]?.signature).toBe('otra');
  });

  it('reprograma una alarma perdida', () => {
    const due = item('due:a:1');
    const plan = planReconcile([due], [entry(due, 4)], active([]), NOW);
    expect(plan.schedule.map((s) => s.id)).toEqual([4]);
  });

  it('al abrir la app reprograma todas las que tienen fecha', () => {
    const pin = item('pin:b:');
    const due = item('due:a:1');
    const plan = planReconcile([pin, due], [entry(pin, 3), entry(due, 4)], active([4], [3]), NOW, {
      rescheduleAll: true,
    });
    expect(plan.schedule.map((s) => s.id)).toEqual([4]);
    expect(plan.pinned.map((s) => s.id)).toEqual([3]);
  });

  it('cancela lo que ya no corresponde; las ya disparadas quedan en la barra', () => {
    const future = item('due:a:1');
    const fired = item('reminder:t:1', { fireAt: iso(2026, 10, 4, 11) });
    const pin = item('pin:b:');
    const plan = planReconcile(
      [],
      [entry(future, 1), entry(fired, 2), entry(pin, 3)],
      active([1], [2, 3]),
      NOW,
    );
    // La anclada no se cancela acá: no está en "pinned" y el plugin propio la quita.
    expect(plan.cancel).toEqual([1]);
    expect(plan.pinned).toEqual([]);
    expect(plan.registry).toEqual([]);
    expect(plan.schedule).toEqual([]);
  });

  it('no cancela la notificación de prueba ni reutiliza su ID', () => {
    const plan = planReconcile([item('due:a:1')], [], active([TEST_NOTIFICATION_ID]), NOW);
    expect(plan.cancel).toEqual([]);
    expect(plan.schedule[0]?.id).toBe(1);
  });

  it('un registro con claves o IDs repetidos se corrige', () => {
    const due = item('due:a:1');
    const other = item('due:b:1');
    const plan = planReconcile(
      [due, other],
      [entry(due, 1), entry(due, 2), { ...entry(other, 1) }],
      active([1, 2]),
      NOW,
    );
    expect(plan.registry.map((e) => [e.key, e.notifId])).toEqual([
      ['due:a:1', 1],
      ['due:b:1', 3],
    ]);
    // El 1 sigue en uso: solo se cancela la copia repetida.
    expect(plan.cancel).toEqual([2]);
  });
});
