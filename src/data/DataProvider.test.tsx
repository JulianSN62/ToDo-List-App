import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataProvider } from './DataProvider';

// La base real (PowerSync en WASM) no corre en jsdom: se reemplaza por un doble.
const getDb = vi.fn();
vi.mock('./db', () => ({ getDb: () => getDb() }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
  errorMeta: () => ({}),
}));

function renderProvider() {
  return render(
    <DataProvider errorFallback={<p>no se pudo abrir</p>}>
      <p>app</p>
    </DataProvider>,
  );
}

describe('DataProvider', () => {
  beforeEach(() => {
    getDb.mockReset();
  });

  it('muestra la app cuando la base abre', async () => {
    getDb.mockReturnValue({ init: () => Promise.resolve() });
    renderProvider();
    expect(screen.getByText('app')).toBeInTheDocument();
    await Promise.resolve();
    expect(screen.queryByText('no se pudo abrir')).not.toBeInTheDocument();
  });

  it('muestra el aviso si la base no se puede abrir', async () => {
    getDb.mockReturnValue({ init: () => Promise.reject(new Error('IndexedDB bloqueada')) });
    renderProvider();
    expect(await screen.findByText('no se pudo abrir')).toBeInTheDocument();
    expect(screen.queryByText('app')).not.toBeInTheDocument();
  });

  it('muestra el aviso si la base ni siquiera se puede crear', () => {
    getDb.mockImplementation(() => {
      throw new Error('sin Worker');
    });
    renderProvider();
    expect(screen.getByText('no se pudo abrir')).toBeInTheDocument();
  });
});
