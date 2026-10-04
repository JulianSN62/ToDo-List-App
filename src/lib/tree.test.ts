import { describe, expect, it } from 'vitest';
import {
  abbreviatePath,
  ancestorIds,
  buildChildrenMap,
  canMoveFolder,
  computeRecursiveCounts,
  flattenTree,
  folderOrderIndex,
  formatPath,
  getDescendantIds,
  getPath,
  indexById,
  treeKeyAction,
  visibleTreeItems,
  type TreeKeyRow,
  type TreeNode,
} from './tree';

// Árbol de ejemplo:
// uni (a0)
//   taller (a0)
// clientes (a1)
//   clienteX (a0)
//     proyecto (a0)
//       frontend (a0)
const nodes: TreeNode[] = [
  { id: 'clientes', parentId: null, position: 'a1' },
  { id: 'uni', parentId: null, position: 'a0' },
  { id: 'taller', parentId: 'uni', position: 'a0' },
  { id: 'clienteX', parentId: 'clientes', position: 'a0' },
  { id: 'proyecto', parentId: 'clienteX', position: 'a0' },
  { id: 'frontend', parentId: 'proyecto', position: 'a0' },
];

const children = buildChildrenMap(nodes);
const byId = indexById(nodes);

describe('árbol de carpetas', () => {
  it('agrupa por padre y ordena por posición', () => {
    expect(children.get(null)?.map((node) => node.id)).toEqual(['uni', 'clientes']);
    expect(children.get('clientes')?.map((node) => node.id)).toEqual(['clienteX']);
  });

  it('muestra en la raíz las carpetas cuyo padre no existe', () => {
    const orphan = buildChildrenMap([
      ...nodes,
      { id: 'huerfana', parentId: 'nada', position: 'a5' },
    ]);
    expect(orphan.get(null)?.map((node) => node.id)).toContain('huerfana');
  });

  it('calcula la ruta desde la raíz', () => {
    expect(getPath('frontend', byId).map((node) => node.id)).toEqual([
      'clientes',
      'clienteX',
      'proyecto',
      'frontend',
    ]);
  });

  it('obtiene todos los descendientes', () => {
    expect(getDescendantIds('clientes', children)).toEqual(
      new Set(['clienteX', 'proyecto', 'frontend']),
    );
    expect(getDescendantIds('frontend', children).size).toBe(0);
  });

  it('impide mover una carpeta dentro de sí misma o de sus descendientes', () => {
    expect(canMoveFolder('clienteX', 'clienteX', children)).toBe(false);
    expect(canMoveFolder('clienteX', 'frontend', children)).toBe(false);
    expect(canMoveFolder('clienteX', 'uni', children)).toBe(true);
    expect(canMoveFolder('clienteX', null, children)).toBe(true);
  });

  it('no entra en bucle si los datos tienen un ciclo', () => {
    const cyclic: TreeNode[] = [
      { id: 'a', parentId: 'b', position: 'a0' },
      { id: 'b', parentId: 'a', position: 'a0' },
    ];
    expect(getPath('a', indexById(cyclic)).length).toBe(2);
  });

  it('suma pendientes y vencidas de forma recursiva', () => {
    const direct = new Map([
      ['frontend', { pending: 2, overdue: 1 }],
      ['proyecto', { pending: 1, overdue: 0 }],
      ['taller', { pending: 3, overdue: 0 }],
    ]);
    const totals = computeRecursiveCounts(children, direct);
    expect(totals.get('clientes')).toEqual({ pending: 3, overdue: 1 });
    expect(totals.get('proyecto')).toEqual({ pending: 3, overdue: 1 });
    expect(totals.get('uni')).toEqual({ pending: 3, overdue: 0 });
  });

  it('aplana el árbol respetando las carpetas colapsadas', () => {
    expect(flattenTree(children).map((item) => `${item.depth}:${item.node.id}`)).toEqual([
      '0:uni',
      '1:taller',
      '0:clientes',
      '1:clienteX',
      '2:proyecto',
      '3:frontend',
    ]);
    expect(
      flattenTree(children, { collapsedIds: new Set(['clientes']) }).map((item) => item.node.id),
    ).toEqual(['uni', 'taller', 'clientes']);
  });
});

describe('breadcrumb abreviado', () => {
  it('no abrevia rutas cortas', () => {
    expect(abbreviatePath(['a', 'b', 'c'])).toHaveLength(3);
  });

  it('muestra primer nivel, puntos suspensivos y los últimos dos', () => {
    expect(abbreviatePath(['a', 'b', 'c', 'd', 'e'])).toEqual([
      { kind: 'segment', node: 'a' },
      { kind: 'ellipsis' },
      { kind: 'segment', node: 'd' },
      { kind: 'segment', node: 'e' },
    ]);
  });
});

describe('rutas y orden de carpetas', () => {
  const named = nodes.map((node) => ({ ...node, name: node.id.toUpperCase() }));
  const byId = indexById(named);

  it('numera las carpetas en el orden del árbol', () => {
    const order = folderOrderIndex(children);
    expect([...order.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id)).toEqual([
      'uni',
      'taller',
      'clientes',
      'clienteX',
      'proyecto',
      'frontend',
    ]);
  });

  it('arma la ruta completa o relativa a una carpeta', () => {
    expect(formatPath('proyecto', byId)).toBe('CLIENTES › CLIENTEX › PROYECTO');
    expect(formatPath('proyecto', byId, 'clientes')).toBe('CLIENTEX › PROYECTO');
    expect(formatPath('proyecto', byId, 'proyecto')).toBe('');
    expect(formatPath('proyecto', byId, 'uni')).toBe('CLIENTES › CLIENTEX › PROYECTO');
  });
});

describe('árbol plegable (selector "Mover a…")', () => {
  const children = buildChildrenMap(nodes);
  const byId = indexById(nodes);

  it('muestra solo los hijos de lo desplegado', () => {
    expect(visibleTreeItems(children, new Set()).map((item) => item.node.id)).toEqual([
      'uni',
      'clientes',
    ]);
    const items = visibleTreeItems(children, new Set(['clientes', 'clienteX']));
    expect(items.map((item) => [item.node.id, item.depth, item.expanded])).toEqual([
      ['uni', 0, false],
      ['clientes', 0, true],
      ['clienteX', 1, true],
      ['proyecto', 2, false],
    ]);
    expect(items.find((item) => item.node.id === 'proyecto')?.hasChildren).toBe(true);
    expect(items.find((item) => item.node.id === 'uni')?.hasChildren).toBe(true);
  });

  it('una carpeta sin hijas nunca figura desplegada', () => {
    const items = visibleTreeItems(children, new Set(['taller', 'uni']));
    expect(items.find((item) => item.node.id === 'taller')?.expanded).toBe(false);
  });

  it('despliega el camino hasta la carpeta actual', () => {
    expect([...ancestorIds('frontend', byId)]).toEqual(['clientes', 'clienteX', 'proyecto']);
    expect(ancestorIds('uni', byId).size).toBe(0);
    expect(ancestorIds(null, byId).size).toBe(0);
    // Con el camino desplegado, la carpeta actual queda visible.
    const items = visibleTreeItems(children, ancestorIds('frontend', byId));
    expect(items.some((item) => item.node.id === 'frontend')).toBe(true);
  });

  it('navegación con teclado', () => {
    const rows: TreeKeyRow[] = [
      { key: 'uni', parentKey: null, hasChildren: true, expanded: false },
      { key: 'clientes', parentKey: null, hasChildren: true, expanded: true },
      { key: 'clienteX', parentKey: 'clientes', hasChildren: true, expanded: false },
    ];
    expect(treeKeyAction(rows, 'uni', 'ArrowDown')).toEqual({ kind: 'focus', key: 'clientes' });
    expect(treeKeyAction(rows, 'uni', 'ArrowUp')).toBeNull();
    expect(treeKeyAction(rows, 'clienteX', 'ArrowDown')).toBeNull();
    expect(treeKeyAction(rows, 'clienteX', 'Home')).toEqual({ kind: 'focus', key: 'uni' });
    expect(treeKeyAction(rows, 'uni', 'End')).toEqual({ kind: 'focus', key: 'clienteX' });
    // Derecha: despliega; si ya está desplegada, entra al primer hijo.
    expect(treeKeyAction(rows, 'uni', 'ArrowRight')).toEqual({ kind: 'expand', key: 'uni' });
    expect(treeKeyAction(rows, 'clientes', 'ArrowRight')).toEqual({
      kind: 'focus',
      key: 'clienteX',
    });
    // Izquierda: pliega; si ya está plegada, sube al padre.
    expect(treeKeyAction(rows, 'clientes', 'ArrowLeft')).toEqual({
      kind: 'collapse',
      key: 'clientes',
    });
    expect(treeKeyAction(rows, 'clienteX', 'ArrowLeft')).toEqual({
      kind: 'focus',
      key: 'clientes',
    });
    expect(treeKeyAction(rows, 'uni', 'ArrowLeft')).toBeNull();
    expect(treeKeyAction(rows, 'uni', 'x')).toBeNull();
    expect(treeKeyAction(rows, 'nada', 'ArrowDown')).toBeNull();
  });
});
