import { FolderOpen, ListFilter, ListTodo, Plus } from 'lucide-react';
import { useEffect, useMemo, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Fab } from '@/app/Fab';
import { ShortcutsHelp } from '@/app/ShortcutsHelp';
import { useToday } from '@/app/hooks/useToday';
import { useUiStore } from '@/app/uiStore';
import {
  folderRepo,
  useAttachmentCounts,
  useFolderCounts,
  useFolderTasks,
  useFolderTree,
  usePendingTasks,
  useSettings,
  useTaskTagIndex,
  type Folder,
  type Task,
} from '@/data';
import { es } from '@/i18n/es';
import { errorMeta, logger } from '@/lib/logger';
import { keyForDrop } from '@/lib/ordering';
import { filterTasks, hasActiveFilters } from '@/lib/taskFilters';
import { compareAcrossFolders } from '@/lib/taskOrder';
import { folderOrderIndex, formatPath, getDescendantIds, getPath } from '@/lib/tree';
import { ActionMenu } from '@/ui/action-menu';
import { useBackHandler } from '@/ui/backStack';
import { Button } from '@/ui/button';
import { EmptyState } from '@/ui/empty-state';
import { ScreenHeader, ScreenTitle } from '@/ui/screen-header';
import { SortableList } from '@/ui/sortable-list';
import { showErrorToast } from '@/ui/toast';
import { useIsSidebarLayout } from '@/ui/useMediaQuery';
import { SyncIndicator } from '../sync/SyncIndicator';
import { GlobalTaskList } from '../tasks/GlobalTaskList';
import { TaskFilterBar } from '../tasks/TaskFilterBar';
import { EditTaskSheet } from '../tasks/TaskFormSheet';
import { TaskList } from '../tasks/TaskList';
import { useGlobalTaskSheet } from '../tasks/useGlobalTaskSheet';
import { useTaskActions } from '../tasks/useTaskActions';
import { useTaskNavigation } from '../tasks/useTaskNavigation';
import { FolderBreadcrumb } from './FolderBreadcrumb';
import { FolderRow } from './FolderRow';
import { useFolderActions } from './useFolderActions';

// Vista de carpeta: subcarpetas arriba y tareas abajo. En la raíz solo hay carpetas.
// Crear y editar tareas se hace en una ventana; la ruta /task/:id abre la de edición.
// Con filtros activos ("Solo prioritarias", etiqueta) se listan las pendientes que
// coinciden en la carpeta y todas sus subcarpetas (en la raíz, en todas).

function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex h-10 items-center justify-between px-4">
      <h2 className="text-caption font-semibold tracking-wide text-muted uppercase">{title}</h2>
      {action}
    </div>
  );
}

export function FolderScreen({
  folderId: folderIdProp,
  selectedTaskId = null,
}: {
  folderId?: string | null;
  selectedTaskId?: string | null;
}) {
  const params = useParams();
  const folderId = folderIdProp !== undefined ? folderIdProp : (params.folderId ?? null);
  const navigate = useNavigate();
  const isSidebarLayout = useIsSidebarLayout();
  const today = useToday();
  const settings = useSettings();
  const tree = useFolderTree();
  const counts = useFolderCounts(tree.children, today);
  const { tasks, isLoading: tasksLoading } = useFolderTasks(folderId);
  const { tasks: pendingTasks } = usePendingTasks();
  const tagIndex = useTaskTagIndex();
  const attachmentCounts = useAttachmentCounts();
  const folderActions = useFolderActions();
  const taskActions = useTaskActions();
  const globalSheet = useGlobalTaskSheet();
  const openFolderForm = useUiStore((state) => state.openFolderForm);
  const openTaskCreate = useUiStore((state) => state.openTaskCreate);
  const setActiveFolderId = useUiStore((state) => state.setActiveFolderId);
  const setNewItemAction = useUiStore((state) => state.setNewItemAction);
  const storedFilters = useUiStore((state) => state.folderFilters);
  const setFolderFilters = useUiStore((state) => state.setFolderFilters);
  const clearFolderFilters = useUiStore((state) => state.clearFolderFilters);

  const folder: Folder | null = folderId ? (tree.byId.get(folderId) ?? null) : null;
  const subfolders = tree.children.get(folderId) ?? [];
  const path = folderId ? getPath(folderId, tree.byId) : [];

  // Si la etiqueta del filtro se eliminó, ese filtro deja de aplicarse.
  const filters = useMemo(
    () => ({
      priorityOnly: storedFilters.priorityOnly,
      tagId:
        storedFilters.tagId !== null && tagIndex.tagsById.has(storedFilters.tagId)
          ? storedFilters.tagId
          : null,
    }),
    [storedFilters, tagIndex.tagsById],
  );
  const filtering = hasActiveFilters(filters);

  // Pendientes de la carpeta y sus subcarpetas que cumplen los filtros, en el orden del árbol.
  const filteredTasks = useMemo(() => {
    if (!filtering) return [];
    const scope = folderId
      ? new Set([folderId, ...getDescendantIds(folderId, tree.children)])
      : null;
    const order = folderOrderIndex(tree.children);
    const inScope = pendingTasks.filter(
      (task) => tree.byId.has(task.folderId) && (scope === null || scope.has(task.folderId)),
    );
    return filterTasks(inScope, filters, tagIndex.tagsByTask).sort((a, b) =>
      compareAcrossFolders(a, b, order),
    );
  }, [filtering, folderId, tree, pendingTasks, filters, tagIndex.tagsByTask]);

  useEffect(() => {
    setActiveFolderId(folderId);
    return () => setActiveFolderId(null);
  }, [folderId, setActiveFolderId]);

  // Atajo N (desktop): lo mismo que el botón "+" de esta pantalla.
  const folderExists = folder !== null;
  useEffect(() => {
    if (folderId !== null && !folderExists) return;
    setNewItemAction(() =>
      folderId ? openTaskCreate(folderId) : openFolderForm({ mode: 'create', parentId: null }),
    );
    return () => setNewItemAction(null);
  }, [folderId, folderExists, openTaskCreate, openFolderForm, setNewItemAction]);

  const { closeTask } = useTaskNavigation();
  const goUp = () => navigate(folder?.parentId ? `/f/${folder.parentId}` : '/');
  const closeDetail = () => closeTask(folderId);

  // Botón atrás de Android dentro de una carpeta: sube un nivel.
  useBackHandler(folderId !== null, goUp);

  function reorderFolders(activeId: string, overId: string) {
    const key = keyForDrop(subfolders, activeId, overId);
    if (!key) return;
    void folderRepo.setPosition(activeId, key).catch((error: unknown) => {
      logger.error('No se pudo reordenar la carpeta', errorMeta(error));
      showErrorToast();
    });
  }

  // Carpeta inexistente o eliminada
  if (folderId && !folder && !tree.isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <ScreenHeader onBack={() => navigate('/')}>
          <ScreenTitle>{es.nav.folders}</ScreenTitle>
        </ScreenHeader>
        <EmptyState icon={<FolderOpen />} title={es.folders.notFound}>
          <Button variant="secondary" onClick={() => navigate('/')}>
            {es.folders.goToRoot}
          </Button>
        </EmptyState>
      </div>
    );
  }

  const isRoot = folderId === null;
  const hasNoTasks = !tasksLoading && tasks.length === 0;
  // Los filtros se ofrecen solo si hay pendientes en el alcance (en la raíz, en cualquier carpeta).
  const showRootFilters = isRoot && (filtering || pendingTasks.length > 0);
  const showFolderFilters =
    filtering || !hasNoTasks || (folderId !== null && (counts.get(folderId)?.pending ?? 0) > 0);

  function createInHere() {
    if (folderId) openTaskCreate(folderId);
    else openFolderForm({ mode: 'create', parentId: null });
  }

  const headerActions = (
    <>
      <SyncIndicator variant={isSidebarLayout ? 'full' : 'compact'} className="mr-1 max-w-48" />
      <ShortcutsHelp />
      {isSidebarLayout ? (
        <Button size="sm" onClick={createInHere}>
          <Plus />
          {isRoot ? es.folders.newFolder : es.tasks.newTask}
        </Button>
      ) : null}
      {folder ? (
        <ActionMenu label={es.folders.folderMenu} items={folderActions.actionsFor(folder)} />
      ) : null}
    </>
  );

  const subfolderList = (
    <SortableList
      items={subfolders}
      onReorder={reorderFolders}
      renderItem={(item, handle) => (
        <FolderRow
          folder={item}
          counts={counts.get(item.id)}
          handle={handle}
          actions={folderActions.actionsFor(item)}
        />
      )}
    />
  );

  const filterBar = (
    <TaskFilterBar
      filters={filters}
      onChange={setFolderFilters}
      onClear={clearFolderFilters}
      className="px-4 pb-2"
    />
  );

  // Tareas filtradas (lista plana con la carpeta de cada una).
  const filteredSection = (
    <>
      <p className="px-4 pb-2 text-caption text-muted">
        {isRoot ? es.filters.scopeRoot : es.filters.scopeFolder}
      </p>
      {filteredTasks.length > 0 ? (
        <GlobalTaskList
          tasks={filteredTasks}
          today={today}
          retentionDays={settings.completedRetentionDays}
          tagsByTask={tagIndex.tagsByTask}
          attachmentCounts={attachmentCounts}
          subtitleFor={(task: Task) =>
            task.folderId === folderId ? null : (
              <span className="truncate">{formatPath(task.folderId, tree.byId, folderId)}</span>
            )
          }
          onOpen={globalSheet.open}
          onGoToFolder={(task) => {
            clearFolderFilters();
            globalSheet.goToFolder(task);
          }}
        />
      ) : (
        <EmptyState icon={<ListFilter />} title={es.filters.noResults}>
          <Button variant="secondary" onClick={clearFolderFilters}>
            {es.filters.clear}
          </Button>
        </EmptyState>
      )}
    </>
  );

  return (
    <div className="flex min-h-0 flex-1">
      <section className="flex min-w-0 flex-1 flex-col">
        <ScreenHeader onBack={isRoot ? undefined : goUp} actions={headerActions}>
          {isRoot ? <ScreenTitle>{es.nav.folders}</ScreenTitle> : <FolderBreadcrumb path={path} />}
        </ScreenHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pb-28 md:pb-8">
          {isRoot ? (
            <>
              {showRootFilters ? <div className="pt-3">{filterBar}</div> : null}
              {filtering ? (
                <div className="mb-6">
                  <SectionHeader title={es.filters.sectionTitle} />
                  {filteredSection}
                </div>
              ) : null}
              {subfolders.length > 0 ? (
                <div className="pt-2">
                  {filtering ? <SectionHeader title={es.nav.folders} /> : null}
                  {subfolderList}
                </div>
              ) : tree.isLoading ? null : (
                <EmptyState
                  icon={<FolderOpen />}
                  title={es.folders.rootEmptyTitle}
                  hint={isSidebarLayout ? undefined : es.folders.rootEmptyHint}
                />
              )}
            </>
          ) : (
            <>
              <div className="pt-2">
                <SectionHeader
                  title={es.folders.sectionSubfolders}
                  action={
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={es.folders.addSubfolderLabel}
                      onClick={() => openFolderForm({ mode: 'create', parentId: folderId })}
                    >
                      <Plus />
                      {es.folders.addSubfolder}
                    </Button>
                  }
                />
                {subfolderList}
              </div>

              <div className="mt-6">
                <SectionHeader
                  title={filtering ? es.filters.sectionTitle : es.folders.sectionTasks}
                />
                {showFolderFilters ? filterBar : null}
                {filtering ? (
                  filteredSection
                ) : hasNoTasks ? (
                  <EmptyState
                    icon={<ListTodo />}
                    title={es.folders.emptyTitle}
                    hint={isSidebarLayout ? es.folders.emptyHintDesktop : es.folders.emptyHint}
                  />
                ) : (
                  <TaskList
                    tasks={tasks}
                    today={today}
                    retentionDays={settings.completedRetentionDays}
                    selectedTaskId={selectedTaskId}
                    tagsByTask={tagIndex.tagsByTask}
                    attachmentCounts={attachmentCounts}
                    actionsFor={taskActions.actionsFor}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <EditTaskSheet taskId={selectedTaskId} onClose={closeDetail} />
      {globalSheet.sheet}

      {!isSidebarLayout ? (
        <Fab
          label={isRoot ? es.folders.createFolderFab : es.folders.createTaskFab}
          onClick={createInHere}
        />
      ) : null}

      {folderActions.dialogs}
      {taskActions.dialogs}
    </div>
  );
}
