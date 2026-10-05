import { Search, SearchX, X } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { useToday } from '@/app/hooks/useToday';
import { useUiStore } from '@/app/uiStore';
import {
  useAllTasks,
  useAttachmentCounts,
  useReminderCounts,
  useFolderTree,
  useSettings,
  useTaskTagIndex,
  type Tag,
  type Task,
} from '@/data';
import { es } from '@/i18n/es';
import { cn } from '@/lib/cn';
import { buildSearchIndex, searchTasks } from '@/lib/search';
import { formatPath } from '@/lib/tree';
import { IconButton } from '@/ui/button';
import { EmptyState } from '@/ui/empty-state';
import { Input } from '@/ui/input';
import { TagChip } from '@/ui/tag-chip';
import { useDebouncedValue } from '@/ui/useDebouncedValue';
import { GlobalTaskList } from '../tasks/GlobalTaskList';
import { TaskFilterBar } from '../tasks/TaskFilterBar';
import { useGlobalTaskSheet } from '../tasks/useGlobalTaskSheet';

// Búsqueda global sobre la base local (funciona sin conexión): título, descripción y
// etiquetas, sin distinguir mayúsculas ni tildes. Se puede filtrar por etiqueta.
// La usan la pantalla Buscar y la ventana flotante de desktop (Ctrl+K o "/").
// El texto y la etiqueta se comparten entre las dos y se conservan durante la sesión.

const SEARCH_DEBOUNCE_MS = 150;

export function SearchPanel({
  variant,
  onNavigate,
}: {
  variant: 'screen' | 'overlay';
  /** Se llama antes de ir a una carpeta (la ventana flotante se cierra). */
  onNavigate?: () => void;
}) {
  const today = useToday();
  const settings = useSettings();
  const tree = useFolderTree();
  const { tasks } = useAllTasks();
  const tagIndex = useTaskTagIndex();
  const attachmentCounts = useAttachmentCounts();
  const reminderCounts = useReminderCounts();
  const query = useUiStore((state) => state.searchQuery);
  const setQuery = useUiStore((state) => state.setSearchQuery);
  const storedTagId = useUiStore((state) => state.searchTagId);
  const setTagId = useUiStore((state) => state.setSearchTagId);
  const clearFolderFilters = useUiStore((state) => state.clearFolderFilters);
  const globalSheet = useGlobalTaskSheet({ onNavigate });
  const inputRef = useRef<HTMLInputElement>(null);

  // Si la etiqueta elegida se eliminó, deja de filtrar.
  const tagId = storedTagId !== null && tagIndex.tagsById.has(storedTagId) ? storedTagId : null;
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  const index = useMemo(
    () =>
      buildSearchIndex(
        tasks.filter((task) => tree.byId.has(task.folderId)),
        tagIndex.tagsByTask,
      ),
    [tasks, tree.byId, tagIndex.tagsByTask],
  );
  const results = useMemo(
    () => searchTasks(index, debouncedQuery, { tagId }),
    [index, debouncedQuery, tagId],
  );
  const matchedTagsByTask = useMemo(
    () => new Map<string, Tag[]>(results.map((result) => [result.task.id, result.matchedTags])),
    [results],
  );

  const hasCriteria = debouncedQuery.trim() !== '' || tagId !== null;

  const goToFolder = (task: Task) => {
    clearFolderFilters();
    globalSheet.goToFolder(task);
  };

  function clearQuery() {
    setQuery('');
    inputRef.current?.focus();
  }

  return (
    <>
      <div
        className={cn(
          'flex flex-col gap-3 border-b border-line py-3',
          variant === 'overlay' ? 'px-4 md:px-6' : 'px-4',
        )}
      >
        <div className="relative" role="search">
          <Input
            ref={inputRef}
            type="search"
            icon={<Search />}
            autoFocus
            autoComplete="off"
            enterKeyHint="search"
            placeholder={es.search.placeholder}
            aria-label={es.search.placeholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pr-12 [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <IconButton
              size="iconSm"
              aria-label={es.search.clear}
              onClick={clearQuery}
              className="absolute top-1 right-1"
            >
              <X />
            </IconButton>
          ) : null}
        </div>
        <TaskFilterBar
          filters={{ priorityOnly: false, tagId }}
          onChange={(change) => {
            if (change.tagId !== undefined) setTagId(change.tagId);
          }}
          onClear={() => setTagId(null)}
          showPriority={false}
        />
      </div>

      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto',
          variant === 'overlay' ? 'pb-4' : 'pb-28 md:pb-8',
        )}
      >
        <p aria-live="polite" className="sr-only">
          {hasCriteria ? es.search.resultsCount(results.length) : ''}
        </p>
        {!hasCriteria ? (
          <EmptyState icon={<Search />} title={es.search.hintTitle} hint={es.search.hintBody} />
        ) : results.length === 0 ? (
          <EmptyState
            icon={<SearchX />}
            title={
              debouncedQuery.trim()
                ? es.search.noResults(debouncedQuery.trim())
                : es.search.noResultsTag
            }
            hint={debouncedQuery.trim() ? es.search.noResultsHint : undefined}
          />
        ) : (
          <GlobalTaskList
            tasks={results.map((result) => result.task)}
            today={today}
            retentionDays={settings.completedRetentionDays}
            tagsByTask={tagIndex.tagsByTask}
            attachmentCounts={attachmentCounts}
            reminderCounts={reminderCounts}
            subtitleFor={(task) => (
              <>
                <span className="min-w-0 truncate">{formatPath(task.folderId, tree.byId)}</span>
                {(matchedTagsByTask.get(task.id) ?? []).map((tag) => (
                  <TagChip
                    key={tag.id}
                    name={tag.name}
                    color={tag.color}
                    size="sm"
                    className="h-5"
                  />
                ))}
              </>
            )}
            onOpen={globalSheet.open}
            onGoToFolder={goToFolder}
          />
        )}
      </div>

      {globalSheet.sheet}
    </>
  );
}
