import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RetentionSetting } from './RetentionSetting';

const updateRetentionDays = vi.fn<(days: number) => Promise<void>>();
let stored: { completedRetentionDays: number } | null = null;

vi.mock('@/data', () => ({
  settingsRepo: { updateRetentionDays: (days: number) => updateRetentionDays(days) },
  useStoredSettings: () => stored,
}));

vi.mock('@/ui/toast', () => ({ showErrorToast: vi.fn() }));

const minus = () => screen.getByRole('button', { name: 'Un día menos' });
const plus = () => screen.getByRole('button', { name: 'Un día más' });
const value = () => screen.getByRole('status').textContent;

describe('retención de completadas', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    updateRetentionDays.mockReset();
    updateRetentionDays.mockResolvedValue();
    stored = { completedRetentionDays: 7 };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra el valor guardado y lo cambia al instante', () => {
    render(<RetentionSetting />);
    expect(value()).toBe('7 días');
    fireEvent.click(plus());
    fireEvent.click(plus());
    expect(value()).toBe('9 días');
    expect(updateRetentionDays).not.toHaveBeenCalled();
  });

  it('guarda una sola vez después de la pausa', async () => {
    render(<RetentionSetting />);
    fireEvent.click(minus());
    fireEvent.click(minus());
    fireEvent.click(minus());
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(updateRetentionDays).toHaveBeenCalledTimes(1);
    expect(updateRetentionDays).toHaveBeenCalledWith(4);
  });

  it('respeta los límites de 1 y 90 días', () => {
    stored = { completedRetentionDays: 1 };
    const { unmount } = render(<RetentionSetting />);
    expect(minus()).toBeDisabled();
    expect(value()).toBe('1 día');
    unmount();

    stored = { completedRetentionDays: 90 };
    render(<RetentionSetting />);
    expect(plus()).toBeDisabled();
  });

  it('si se sale antes de la pausa, guarda igual', () => {
    const { unmount } = render(<RetentionSetting />);
    fireEvent.click(plus());
    unmount();
    expect(updateRetentionDays).toHaveBeenCalledWith(8);
  });

  it('antes de la primera sincronización no se puede cambiar', () => {
    stored = null;
    render(<RetentionSetting />);
    expect(minus()).toBeDisabled();
    expect(plus()).toBeDisabled();
    expect(screen.getByText(/cuando termine la primera sincronización/)).toBeInTheDocument();
  });
});
