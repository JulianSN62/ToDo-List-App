import { ChevronDown, Star, Tag as TagIcon, X } from 'lucide-react';
import { useState } from 'react';
import { useTags } from '@/data';
import { es } from '@/i18n/es';
import { cn } from '@/lib/cn';
import type { TaskFilters } from '@/lib/taskFilters';
import { ColorDot } from '@/ui/color-swatch-picker';
import { FilterChip } from '@/ui/filter-chip';
import { TagPickerSheet } from '../tags/TagPickerSheet';

// Chips de filtro: "Solo prioritarias" y una etiqueta. Cada pantalla decide qué mostrar.
export function TaskFilterBar({
  filters,
  onChange,
  onClear,
  showPriority = true,
  className,
}: {
  filters: TaskFilters;
  onChange: (filters: Partial<TaskFilters>) => void;
  /** Si se indica, aparece "Quitar filtros" mientras haya alguno activo. */
  onClear?: () => void;
  showPriority?: boolean;
  className?: string;
}) {
  const { tags, byId } = useTags();
  const [picking, setPicking] = useState(false);
  const selectedTag = filters.tagId ? (byId.get(filters.tagId) ?? null) : null;
  const active = filters.priorityOnly || filters.tagId !== null;

  return (
    <div
      role="group"
      aria-label={es.filters.label}
      className={cn('flex flex-wrap items-center gap-2', className)}
    >
      {showPriority ? (
        <FilterChip
          active={filters.priorityOnly}
          aria-pressed={filters.priorityOnly}
          onClick={() => onChange({ priorityOnly: !filters.priorityOnly })}
        >
          <Star aria-hidden className={filters.priorityOnly ? 'fill-current' : undefined} />
          {es.filters.priorityOnly}
        </FilterChip>
      ) : null}
      {tags.length > 0 || selectedTag ? (
        <FilterChip
          active={selectedTag !== null}
          aria-haspopup="dialog"
          aria-label={
            selectedTag ? `${es.tags.filterTitle}: ${selectedTag.name}` : es.tags.filterTitle
          }
          onClick={() => setPicking(true)}
        >
          {selectedTag ? <ColorDot color={selectedTag.color} /> : <TagIcon aria-hidden />}
          <span className="max-w-40 truncate">
            {selectedTag ? selectedTag.name : es.tags.filter}
          </span>
          <ChevronDown aria-hidden />
        </FilterChip>
      ) : null}
      {onClear && active ? (
        <button
          type="button"
          onClick={onClear}
          className="relative inline-flex h-8 items-center gap-1 rounded-full px-2 text-body-sm text-muted after:absolute after:inset-x-0 after:-inset-y-2 hover:text-fg [&_svg]:size-4"
        >
          <X aria-hidden />
          {es.filters.clear}
        </button>
      ) : null}
      <TagPickerSheet
        open={picking}
        onOpenChange={setPicking}
        title={es.tags.filterTitle}
        mode="single"
        selectedId={filters.tagId}
        onSelect={(tagId) => onChange({ tagId })}
      />
    </div>
  );
}
