import { CalendarDays, ChevronDown, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useToday } from '@/app/hooks/useToday';
import { ShortcutsHelp } from '@/app/ShortcutsHelp';
import { useUiStore } from '@/app/uiStore';
import {
  useAttachmentCounts,
  useDueTasks,
  useFolderTree,
  useSettings,
  useTaskTagIndex,
  type Task,
} from '@/data';
import { es } from '@/i18n/es';
import { cn } from '@/lib/cn';
import { groupByDue, type DueGroupKey } from '@/lib/dueGroups';
import { folderOrderIndex, formatPath } from '@/lib/tree';
import { Button } from '@/ui/button';
import { EmptyState } from '@/ui/empty-state';
import { FilterChip } from '@/ui/filter-chip';
import { ScreenHeader, ScreenTitle } from '@/ui/screen-header';
import { SyncIndicator } from '../sync/SyncIndicator';
import { GlobalTaskList } from '../tasks/GlobalTaskList';
import { useGlobalTaskSheet } from '../tasks/useGlobalTaskSheet';

// Vista Hoy / Próximas: pendientes con fecha límite de todas las carpetas, agrupadas en
// Vencidas, Hoy, Mañana, Esta semana y Más adelante. Cada tarea muestra su carpeta.
export function TodayScreen() {
  const navigate = useNavigate();
  const today = useToday();
  const settings = useSettings();
  const tree = useFolderTree();
  const { tasks, isLoading } = useDueTasks();
  const tagIndex = useTaskTagIndex();
  const attachmentCounts = useAttachmentCounts();
  const priorityOnly = useUiStore((state) => state.todayPriorityOnly);
  const setPriorityOnly = useUiStore((state) => state.setTodayPriorityOnly);
  const clearFolderFilters = useUiStore((state) => state.clearFolderFilters);
  const globalSheet = useGlobalTaskSheet();
  const [collapsed, setCollapsed] = useState<ReadonlySet<DueGroupKey>>(() => new Set());

  // Se ignoran las tareas cuya carpeta ya no existe (por ejemplo, eliminada en otro dispositivo).
  const dueTasks = useMemo(
    () => tasks.filter((task) => tree.byId.has(task.folderId)),
    [tasks, tree.byId],
  );
  const groups = useMemo(
    () =>
      groupByDue(
        priorityOnly ? dueTasks.filter((task) => task.isPriority) : dueTasks,
        today,
        folderOrderIndex(tree.children),
      ),
    [dueTasks, priorityOnly, today, tree.children],
  );

  function toggleGroup(key: DueGroupKey) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const goToFolder = (task: Task) => {
    clearFolderFilters();
    globalSheet.goToFolder(task);
  };

  const loading = isLoading || tree.isLoading;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScreenHeader
        onBack={() => navigate('/')}
        actions={
          <>
            <FilterChip
              active={priorityOnly}
              aria-pressed={priorityOnly}
              onClick={() => setPriorityOnly(!priorityOnly)}
            >
              <Star aria-hidden className={priorityOnly ? 'fill-current' : undefined} />
              {es.filters.priorityOnly}
            </FilterChip>
            <SyncIndicator variant="compact" className="mr-2" />
            <ShortcutsHelp />
          </>
        }
      >
        <ScreenTitle>{es.today.title}</ScreenTitle>
      </ScreenHeader>

      <div className="min-h-0 flex-1 overflow-y-auto pb-28 md:pb-8">
        {loading ? null : groups.length === 0 ? (
          dueTasks.length > 0 && priorityOnly ? (
            <EmptyState icon={<Star />} title={es.today.emptyPriorityTitle}>
              <Button variant="secondary" onClick={() => setPriorityOnly(false)}>
                {es.filters.clear}
              </Button>
            </EmptyState>
          ) : (
            <EmptyState
              icon={<CalendarDays />}
              title={es.today.emptyTitle}
              hint={es.today.emptyHint}
            />
          )
        ) : (
          groups.map((group) => {
            const isCollapsed = collapsed.has(group.key);
            const label = es.today.groups[group.key];
            return (
              <section key={group.key} aria-label={label} className="pt-2">
                <h2>
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    onClick={() => toggleGroup(group.key)}
                    className={cn(
                      'flex h-10 w-full items-center gap-2 px-4 text-left text-title-sm font-semibold -outline-offset-2',
                      group.key === 'overdue' ? 'text-danger' : 'text-fg',
                    )}
                  >
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        'size-4 shrink-0 text-muted transition-transform duration-(--duration-fast)',
                        isCollapsed && '-rotate-90',
                      )}
                    />
                    {es.today.groupHeader(label, group.tasks.length)}
                  </button>
                </h2>
                {isCollapsed ? null : (
                  <GlobalTaskList
                    tasks={group.tasks}
                    today={today}
                    retentionDays={settings.completedRetentionDays}
                    tagsByTask={tagIndex.tagsByTask}
                    attachmentCounts={attachmentCounts}
                    subtitleFor={(task) => (
                      <span className="truncate">{formatPath(task.folderId, tree.byId)}</span>
                    )}
                    onOpen={globalSheet.open}
                    onGoToFolder={goToFolder}
                  />
                )}
              </section>
            );
          })
        )}
      </div>

      {globalSheet.sheet}
    </div>
  );
}
