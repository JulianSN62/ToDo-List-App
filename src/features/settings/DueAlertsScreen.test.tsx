import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { es } from '@/i18n/es';
import { DueAlertsScreen } from './DueAlertsScreen';

interface StoredAlerts {
  dueAlertsEnabled: boolean;
  dueAlertOffsets: number[];
  dueAlertTime: string;
}

const updateDueAlerts = vi.fn<(patch: Partial<StoredAlerts>) => Promise<void>>();
let stored: StoredAlerts | null = null;

vi.mock('@/data', () => ({
  DEFAULT_SETTINGS: { dueAlertsEnabled: true, dueAlertOffsets: [1, 0], dueAlertTime: '09:00' },
  settingsRepo: {
    updateDueAlerts: (patch: Partial<StoredAlerts>) => updateDueAlerts(patch),
  },
  useStoredSettings: () => stored,
}));

vi.mock('@/platform', () => ({ platform: { isNative: false, isAndroid: false } }));
vi.mock('@/ui/toast', () => ({ showErrorToast: vi.fn() }));

function renderScreen() {
  return render(
    <MemoryRouter>
      <DueAlertsScreen />
    </MemoryRouter>,
  );
}

const toggle = () => screen.getByRole('switch', { name: es.dueAlerts.enable });
const day = (days: number) => screen.getByRole('checkbox', { name: es.dueAlerts.offset(days) });
const timeInput = () => screen.getByLabelText(es.dueAlerts.time);

describe('Ajustes → Alertas de vencimiento', () => {
  beforeEach(() => {
    updateDueAlerts.mockReset();
    updateDueAlerts.mockResolvedValue();
    stored = { dueAlertsEnabled: true, dueAlertOffsets: [1, 0], dueAlertTime: '09:00' };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra lo guardado y la nota de Android en web', () => {
    renderScreen();
    expect(toggle()).toBeChecked();
    expect(day(0)).toBeChecked();
    expect(day(1)).toBeChecked();
    expect(day(2)).not.toBeChecked();
    expect(day(7)).not.toBeChecked();
    expect(timeInput()).toHaveValue('09:00');
    expect(screen.getByText(es.dueAlerts.androidOnly)).toBeInTheDocument();
  });

  it('al desactivarlas guarda y deshabilita los días y la hora', () => {
    renderScreen();
    fireEvent.click(toggle());
    expect(updateDueAlerts).toHaveBeenCalledWith({ dueAlertsEnabled: false });
    expect(toggle()).not.toBeChecked();
    expect(day(2)).toBeDisabled();
    expect(timeInput()).toBeDisabled();
  });

  it('marcar un día guarda la lista completa, de mayor a menor', () => {
    renderScreen();
    fireEvent.click(day(7));
    expect(updateDueAlerts).toHaveBeenCalledWith({ dueAlertOffsets: [7, 1, 0] });
    expect(day(7)).toBeChecked();
  });

  it('dos cambios seguidos no se pisan', () => {
    renderScreen();
    fireEvent.click(day(2));
    fireEvent.click(day(3));
    expect(updateDueAlerts).toHaveBeenLastCalledWith({ dueAlertOffsets: [3, 2, 1, 0] });
  });

  it('el último día marcado no se puede desmarcar', () => {
    stored = { dueAlertsEnabled: true, dueAlertOffsets: [0], dueAlertTime: '09:00' };
    renderScreen();
    expect(day(0)).toBeChecked();
    expect(day(0)).toBeDisabled();
    expect(day(1)).toBeEnabled();
    expect(screen.getByText(es.dueAlerts.keepOne)).toBeInTheDocument();
  });

  it('la hora se guarda una sola vez tras la pausa y solo si es válida', async () => {
    vi.useFakeTimers();
    renderScreen();
    fireEvent.change(timeInput(), { target: { value: '10:30' } });
    fireEvent.change(timeInput(), { target: { value: '' } });
    fireEvent.change(timeInput(), { target: { value: '10:45' } });
    expect(updateDueAlerts).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(updateDueAlerts).toHaveBeenCalledTimes(1);
    expect(updateDueAlerts).toHaveBeenCalledWith({ dueAlertTime: '10:45' });
  });

  it('antes de la primera sincronización no se puede cambiar', () => {
    stored = null;
    renderScreen();
    expect(toggle()).toBeDisabled();
    expect(day(0)).toBeDisabled();
    expect(day(7)).toBeDisabled();
    expect(timeInput()).toBeDisabled();
    expect(screen.getByText(es.dueAlerts.unavailable)).toBeInTheDocument();
  });
});
