import { sortByPosition } from './ordering';

// Utilidades del árbol de carpetas (profundidad ilimitada).

export interface TreeNode {
  id: string;
  parentId: string | null;
  position: string;
}

export type ChildrenMap<T extends TreeNode> = Map<string | null, T[]>;

// Agrupa las carpetas por carpeta padre, cada grupo ordenado por posición.
export function buildChildrenMap<T extends TreeNode>(nodes: readonly T[]): ChildrenMap<T> {
  const ids = new Set(nodes.map((node) => node.id));
  const map: ChildrenMap<T> = new Map();
  for (const node of nodes) {
    // Si el padre no existe (por ejemplo, no se sincronizó todavía) se muestra en la raíz
    const parent = node.parentId !== null && ids.has(node.parentId) ? node.parentId : null;
    const list = map.get(parent);
    if (list) list.push(node);
    else map.set(parent, [node]);
  }
  for (const [key, list] of map) {
    map.set(key, sortByPosition(list));
  }
  return map;
}

export function indexById<T extends TreeNode>(nodes: readonly T[]): Map<string, T> {
  return new Map(nodes.map((node) => [node.id, node]));
}

// Ruta desde la raíz hasta la carpeta (incluida). Protegida contra ciclos.
export function getPath<T extends TreeNode>(id: string, byId: Map<string, T>): T[] {
  const path: T[] = [];
  const visited = new Set<string>();
  let current = byId.get(id);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current);
    current = current.parentId !== null ? byId.get(current.parentId) : undefined;
  }
  return path;
}

// Todos los descendientes de una carpeta (sin incluirla).
export function getDescendantIds<T extends TreeNode>(
  id: string,
  children: ChildrenMap<T>,
): Set<string> {
  const result = new Set<string>();
  const stack = [...(children.get(id) ?? [])];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || result.has(node.id)) continue;
    result.add(node.id);
    stack.push(...(children.get(node.id) ?? []));
  }
  return result;
}

// Una carpeta no puede moverse dentro de sí misma ni de sus descendientes.
export function canMoveFolder<T extends TreeNode>(
  folderId: string,
  newParentId: string | null,
  children: ChildrenMap<T>,
): boolean {
  if (newParentId === null) return true;
  if (newParentId === folderId) return false;
  return !getDescendantIds(folderId, children).has(newParentId);
}

export interface FolderCounts {
  pending: number;
  overdue: number;
}

// Suma recursiva: cada carpeta cuenta sus tareas pendientes y las de todas sus subcarpetas.
export function computeRecursiveCounts<T extends TreeNode>(
  children: ChildrenMap<T>,
  direct: ReadonlyMap<string, FolderCounts>,
): Map<string, FolderCounts> {
  const totals = new Map<string, FolderCounts>();
  const visiting = new Set<string>();

  const visit = (node: T): FolderCounts => {
    const cached = totals.get(node.id);
    if (cached) return cached;
    if (visiting.has(node.id)) return { pending: 0, overdue: 0 };
    visiting.add(node.id);
    const own = direct.get(node.id) ?? { pending: 0, overdue: 0 };
    const sum = { pending: own.pending, overdue: own.overdue };
    for (const child of children.get(node.id) ?? []) {
      const childTotals = visit(child);
      sum.pending += childTotals.pending;
      sum.overdue += childTotals.overdue;
    }
    visiting.delete(node.id);
    totals.set(node.id, sum);
    return sum;
  };

  for (const list of children.values()) {
    for (const node of list) visit(node);
  }
  return totals;
}

export interface FlatTreeItem<T> {
  node: T;
  depth: number;
}

// Aplana el árbol en orden de visualización (para selectores y la barra lateral).
export function flattenTree<T extends TreeNode>(
  children: ChildrenMap<T>,
  options: { collapsedIds?: ReadonlySet<string> } = {},
): FlatTreeItem<T>[] {
  const result: FlatTreeItem<T>[] = [];
  const visited = new Set<string>();
  const walk = (parentId: string | null, depth: number) => {
    for (const node of children.get(parentId) ?? []) {
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      result.push({ node, depth });
      if (!options.collapsedIds?.has(node.id)) walk(node.id, depth + 1);
    }
  };
  walk(null, 0);
  return result;
}

// Posición de cada carpeta en el orden de visualización del árbol
// (para ordenar listas que mezclan tareas de varias carpetas).
export function folderOrderIndex<T extends TreeNode>(
  children: ChildrenMap<T>,
): Map<string, number> {
  return new Map(flattenTree(children).map((item, index) => [item.node.id, index]));
}

// Ruta legible "Cliente X › Proyecto". Con "relativeTo" se omiten esa carpeta y sus
// ancestros (ruta relativa); si la carpeta es la misma, devuelve texto vacío.
export function formatPath<T extends TreeNode & { name: string }>(
  id: string,
  byId: Map<string, T>,
  relativeTo: string | null = null,
): string {
  const path = getPath(id, byId);
  const start = relativeTo === null ? 0 : path.findIndex((node) => node.id === relativeTo) + 1;
  return path
    .slice(start)
    .map((node) => node.name)
    .join(' › ');
}

export type PathItem<T> = { kind: 'segment'; node: T } | { kind: 'ellipsis' };

// Breadcrumb abreviado: primer nivel + "…" + últimos dos niveles cuando la ruta es larga.
export function abbreviatePath<T>(path: readonly T[], maxSegments = 3): PathItem<T>[] {
  if (path.length <= maxSegments) {
    return path.map((node) => ({ kind: 'segment', node }));
  }
  const first = path[0] as T;
  const lastTwo = path.slice(-2);
  return [
    { kind: 'segment', node: first },
    { kind: 'ellipsis' },
    ...lastTwo.map((node): PathItem<T> => ({ kind: 'segment', node })),
  ];
}
