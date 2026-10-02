import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TagFormSheet } from './TagFormSheet';

const create = vi.fn<(input: unknown) => Promise<string>>();
const update = vi.fn<(id: string, input: unknown) => Promise<void>>();

const tags = [
  { id: 'tag-u', name: 'Urgente', color: 'red' as const, createdAt: null, updatedAt: null },
  { id: 'tag-f', name: 'Facultad', color: 'blue' as const, createdAt: null, updatedAt: null },
];

vi.mock('@/data', () => ({
  tagRepo: {
    create: (input: unknown) => create(input),
    update: (id: string, input: unknown) => update(id, input),
  },
  TagNameTakenError: class extends Error {},
  useTags: () => ({ tags, byId: new Map(tags.map((tag) => [tag.id, tag])), isLoading: false }),
}));

vi.mock('@/ui/toast', () => ({ showErrorToast: vi.fn() }));

// El panel real es responsive (bottom sheet / modal); acá alcanza con su contenido.
vi.mock('@/ui/sheet', () => ({
  Sheet: ({ open, title, children }: { open: boolean; title: string; children: ReactNode }) =>
    open ? (
      <section aria-label={title}>
        <h2>{title}</h2>
        {children}
      </section>
    ) : null,
}));

function renderForm(request: Parameters<typeof TagFormSheet>[0]['request']) {
  const onClose = vi.fn();
  render(<TagFormSheet request={request} open formKey={1} onClose={onClose} />);
  return { onClose, name: screen.getByRole('textbox', { name: 'Nombre' }) };
}

describe('formulario de etiqueta', () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue('nueva');
    update.mockReset();
    update.mockResolvedValue();
  });

  it('crea una etiqueta con nombre y color', async () => {
    const user = userEvent.setup();
    const { onClose, name } = renderForm({ mode: 'create' });

    await user.type(name, 'Cliente X');
    await user.click(screen.getByRole('radio', { name: 'Violeta' }));
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith({ name: 'Cliente X', color: 'purple' });
  });

  it('no permite un nombre repetido, sin distinguir mayúsculas', async () => {
    const user = userEvent.setup();
    const { onClose, name } = renderForm({ mode: 'create' });

    await user.type(name, '  urgente ');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Ya existe una etiqueta con ese nombre.');
    expect(create).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('al renombrar puede conservar su propio nombre con otras mayúsculas', async () => {
    const user = userEvent.setup();
    const { onClose, name } = renderForm({ mode: 'edit', tag: tags[0]! });

    expect(name).toHaveValue('Urgente');
    await user.clear(name);
    await user.type(name, 'URGENTE');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith('tag-u', { name: 'URGENTE', color: 'red' });
  });

  it('pide un nombre', async () => {
    const user = userEvent.setup();
    renderForm({ mode: 'create' });

    await user.click(screen.getByRole('button', { name: 'Crear' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Escribí un nombre.');
    expect(create).not.toHaveBeenCalled();
  });
});
