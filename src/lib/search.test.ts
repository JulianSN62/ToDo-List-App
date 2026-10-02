import { describe, expect, it } from 'vitest';
import { buildSearchIndex, searchTasks, type SearchableTask } from './search';

function task(id: string, title: string, extra: Partial<SearchableTask> = {}): SearchableTask {
  return { id, title, description: null, isDone: false, isPriority: false, ...extra };
}

const urgente = { id: 'tag-urgente', name: 'Urgente' };
const facultad = { id: 'tag-facu', name: 'Facultad' };

const tasks = [
  task('t1', 'Revisar contrato con el cliente', { description: 'Cláusula de rescisión' }),
  task('t2', 'Entregar práctico de Programación', { isPriority: true }),
  task('t3', 'Factura de marzo', { isDone: true }),
  task('t4', 'Llamar a Martín', { description: 'Preguntar por el contrato' }),
  task('t5', 'Comprar pan'),
];

const tagsByTask = new Map([
  ['t1', [urgente]],
  ['t2', [facultad, urgente]],
  ['t5', [facultad]],
]);

const index = buildSearchIndex(tasks, tagsByTask);
const ids = (query: string, tagId?: string | null) =>
  searchTasks(index, query, { tagId }).map((result) => result.task.id);

describe('búsqueda global', () => {
  it('sin texto ni etiqueta no devuelve resultados', () => {
    expect(ids('')).toEqual([]);
    expect(ids('   ')).toEqual([]);
  });

  it('ignora mayúsculas y tildes', () => {
    expect(ids('PROGRAMACION')).toEqual(['t2']);
    expect(ids('martin')).toEqual(['t4']);
    expect(ids('clausula')).toEqual(['t1']);
  });

  it('busca en título, descripción y etiquetas', () => {
    expect(ids('contrato')).toEqual(['t1', 't4']);
    expect(ids('urgente')).toEqual(['t2', 't1']);
  });

  it('todas las palabras tienen que aparecer, en cualquier campo', () => {
    expect(ids('contrato cliente')).toEqual(['t1']);
    expect(ids('pan facultad')).toEqual(['t5']);
    expect(ids('pan urgente')).toEqual([]);
  });

  it('ordena: pendientes primero, prioritarias arriba, después alfabético', () => {
    expect(ids('a')).toEqual(['t2', 't5', 't4', 't1', 't3']);
  });

  it('las que coinciden en el título van antes que las que coinciden en otro campo', () => {
    expect(ids('contrato')[0]).toBe('t1');
  });

  it('filtra por etiqueta, con o sin texto', () => {
    expect(ids('', facultad.id)).toEqual(['t2', 't5']);
    expect(ids('pan', facultad.id)).toEqual(['t5']);
    expect(ids('contrato', facultad.id)).toEqual([]);
  });

  it('informa las etiquetas que coinciden', () => {
    const [result] = searchTasks(index, 'urg', { tagId: null });
    expect(result?.matchedTags).toEqual([urgente]);
    const [filtered] = searchTasks(index, 'pan', { tagId: facultad.id });
    expect(filtered?.matchedTags).toEqual([facultad]);
    const [plain] = searchTasks(index, 'factura');
    expect(plain?.matchedTags).toEqual([]);
  });
});
