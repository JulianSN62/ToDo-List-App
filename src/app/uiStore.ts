import { create } from 'zustand';
import type { ColorToken } from '@/lib/colors';
import { NO_TASK_FILTERS, type TaskFilters } from '@/lib/taskFilters';

// Estado de interfaz compartido entre componentes (nunca datos de negocio).

export type FolderFormRequest =
  | { mode: 'create'; parentId: string | null }
  | { mode: 'edit'; folderId: string; name: string; color: ColorToken | null };

interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  /** Carpeta abierta en la columna central (para resaltarla en la barra lateral). */
  activeFolderId: string | null;
  setActiveFolderId: (folderId: string | null) => void;

  /** Ventana de nueva tarea. Los datos se conservan al cerrar (animación de salida). */
  taskCreate: { folderId: string } | null;
  taskCreateOpen: boolean;
  /** Cambia en cada apertura para reiniciar el formulario. */
  taskCreateKey: number;
  openTaskCreate: (folderId: string) => void;
  closeTaskCreate: () => void;

  /** Tareas desplegadas en la lista (solo durante la sesión). */
  expandedTaskIds: ReadonlySet<string>;
  toggleTaskExpanded: (taskId: string) => void;

  /** Filtros de la vista de carpeta. Se mantienen al navegar durante la sesión. */
  folderFilters: TaskFilters;
  setFolderFilters: (filters: Partial<TaskFilters>) => void;
  clearFolderFilters: () => void;

  /** Vista Hoy: "Solo prioritarias". */
  todayPriorityOnly: boolean;
  setTodayPriorityOnly: (value: boolean) => void;

  /** Acción del botón "+" de la pantalla actual (la usa el atajo N). null = no hay. */
  newItemAction: (() => void) | null;
  setNewItemAction: (action: (() => void) | null) => void;

  /** Búsqueda como ventana flotante en desktop (atajos / y Ctrl+K). */
  searchOverlayOpen: boolean;
  setSearchOverlayOpen: (open: boolean) => void;

  /** Búsqueda global: se conserva al volver desde una carpeta. */
  searchQuery: string;
  searchTagId: string | null;
  setSearchQuery: (query: string) => void;
  setSearchTagId: (tagId: string | null) => void;

  /** Formulario de crear/editar carpeta. Los datos se conservan al cerrar (animación de salida). */
  folderForm: FolderFormRequest | null;
  folderFormOpen: boolean;
  /** Cambia en cada apertura para reiniciar el formulario. */
  folderFormKey: number;
  openFolderForm: (request: FolderFormRequest) => void;
  closeFolderForm: () => void;
}

const SIDEBAR_KEY = 'todo.sidebarCollapsed';

function readSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_KEY) === '1';
  } catch {
    return false;
  }
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: typeof window === 'undefined' ? false : readSidebarCollapsed(),
  toggleSidebar: () =>
    set((state) => {
      const next = !state.sidebarCollapsed;
      try {
        window.localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      } catch {
        // Preferencia no persistente: no es crítico.
      }
      return { sidebarCollapsed: next };
    }),

  activeFolderId: null,
  setActiveFolderId: (activeFolderId) => set({ activeFolderId }),

  taskCreate: null,
  taskCreateOpen: false,
  taskCreateKey: 0,
  openTaskCreate: (folderId) =>
    set((state) => ({
      taskCreate: { folderId },
      taskCreateOpen: true,
      taskCreateKey: state.taskCreateKey + 1,
    })),
  closeTaskCreate: () => set({ taskCreateOpen: false }),

  expandedTaskIds: new Set<string>(),
  toggleTaskExpanded: (taskId) =>
    set((state) => {
      const next = new Set(state.expandedTaskIds);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return { expandedTaskIds: next };
    }),

  folderFilters: NO_TASK_FILTERS,
  setFolderFilters: (filters) =>
    set((state) => ({ folderFilters: { ...state.folderFilters, ...filters } })),
  clearFolderFilters: () => set({ folderFilters: NO_TASK_FILTERS }),

  todayPriorityOnly: false,
  setTodayPriorityOnly: (todayPriorityOnly) => set({ todayPriorityOnly }),

  newItemAction: null,
  setNewItemAction: (newItemAction) => set({ newItemAction }),

  searchOverlayOpen: false,
  setSearchOverlayOpen: (searchOverlayOpen) => set({ searchOverlayOpen }),

  searchQuery: '',
  searchTagId: null,
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchTagId: (searchTagId) => set({ searchTagId }),

  folderForm: null,
  folderFormOpen: false,
  folderFormKey: 0,
  openFolderForm: (folderForm) =>
    set((state) => ({ folderForm, folderFormOpen: true, folderFormKey: state.folderFormKey + 1 })),
  closeFolderForm: () => set({ folderFormOpen: false }),
}));
