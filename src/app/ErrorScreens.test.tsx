import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { es } from '@/i18n/es';
import { AppErrorBoundary } from './ErrorScreens';

function Broken(): never {
  throw new Error('boom');
}

describe('AppErrorBoundary', () => {
  it('muestra la app si no hay errores', () => {
    render(
      <AppErrorBoundary>
        <p>app</p>
      </AppErrorBoundary>,
    );
    expect(screen.getByText('app')).toBeInTheDocument();
  });

  it('reemplaza una pantalla en blanco por un aviso con "Recargar"', () => {
    // React informa el error por consola en desarrollo: se silencia en este test.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <AppErrorBoundary>
        <Broken />
      </AppErrorBoundary>,
    );
    expect(screen.getByRole('heading', { name: es.errors.appTitle })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: es.errors.reload })).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
