import { Check, Plus, Search, Tag as TagIcon } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { tagRepo, TagNameTakenError, useTags, type Tag } from '@/data';
import { es } from '@/i18n/es';
import { cn } from '@/lib/cn';
import { errorMeta, logger } from '@/lib/logger';
import { findTagByName, pickTagColor } from '@/lib/tags';
import { matchesSearch } from '@/lib/text';
import { LIMITS, normalizeTagName } from '@/lib/validation';
import { Button } from '@/ui/button';
import { ColorDot } from '@/ui/color-swatch-picker';
import { Input } from '@/ui/input';
import { Sheet } from '@/ui/sheet';
import { showErrorToast } from '@/ui/toast';

// Selector de etiquetas con búsqueda.
// - "multiple": en la ventana de tarea; se marcan varias y se pueden crear nuevas al vuelo.
// - "single": para filtrar; se elige una (o "Todas") y se cierra.

type PickerProps =
  | { mode: 'multiple'; selectedIds: readonly string[]; onChange: (tagIds: string[]) => void }
  | { mode: 'single'; selectedId: string | null; onSelect: (tagId: string | null) => void };

const rowClass =
  'flex min-h-12 w-full items-center gap-3 rounded-sm px-2 text-left text-body-sm text-fg hover:bg-app';

export function TagPickerSheet({
  open,
  onOpenChange,
  title,
  ...props
}: PickerProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
}) {
  const { tags } = useTags();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(
    () => (query.trim() ? tags.filter((tag) => matchesSearch(tag.name, query)) : tags),
    [tags, query],
  );
  const newName = normalizeTagName(query);
  const canCreate = props.mode === 'multiple' && newName !== null && !findTagByName(tags, newName);

  function handleOpenChange(next: boolean) {
    if (!next) setQuery('');
    onOpenChange(next);
  }

  function toggle(tagId: string) {
    if (props.mode !== 'multiple') return;
    const selected = props.selectedIds.includes(tagId);
    props.onChange(
      selected ? props.selectedIds.filter((id) => id !== tagId) : [...props.selectedIds, tagId],
    );
  }

  function choose(tagId: string | null) {
    if (props.mode !== 'single') return;
    props.onSelect(tagId);
    handleOpenChange(false);
  }

  async function createTag() {
    if (props.mode !== 'multiple' || !newName || creating) return;
    setCreating(true);
    try {
      const id = await tagRepo.create({
        name: newName,
        color: pickTagColor(tags.map((tag) => tag.color)),
      });
      props.onChange([...props.selectedIds, id]);
      setQuery('');
    } catch (error) {
      if (error instanceof TagNameTakenError) {
        // Se creó otra con el mismo nombre (por ejemplo, desde otro dispositivo): se usa esa.
        const existing = findTagByName(tags, newName);
        if (existing && !props.selectedIds.includes(existing.id)) toggle(existing.id);
        setQuery('');
      } else {
        logger.error('No se pudo crear la etiqueta', errorMeta(error));
        showErrorToast();
      }
    } finally {
      setCreating(false);
    }
  }

  // Enter: crea la etiqueta escrita o marca la única que coincide.
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    const exact = newName ? findTagByName(tags, newName) : undefined;
    const target = exact ?? (filtered.length === 1 ? filtered[0] : undefined);
    if (target) {
      if (props.mode === 'multiple') {
        toggle(target.id);
        setQuery('');
      } else {
        choose(target.id);
      }
    } else if (canCreate) {
      void createTag();
    }
  }

  const isSelected = (tag: Tag) =>
    props.mode === 'multiple' ? props.selectedIds.includes(tag.id) : props.selectedId === tag.id;

  const showEmpty = tags.length === 0 && !query.trim();

  return (
    <Sheet
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      // Para elegir varias (y escribir con el teclado abierto) conviene el panel alto.
      size={props.mode === 'multiple' ? 'tall' : 'auto'}
      desktopWidth="sm"
      footer={
        props.mode === 'multiple' ? (
          <Button className="flex-1 md:flex-none" onClick={() => handleOpenChange(false)}>
            {es.common.done}
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        <Input
          type="search"
          icon={<Search />}
          autoComplete="off"
          enterKeyHint={props.mode === 'multiple' ? 'done' : 'search'}
          maxLength={LIMITS.tagName}
          placeholder={props.mode === 'multiple' ? es.tags.searchOrCreate : es.tags.search}
          aria-label={props.mode === 'multiple' ? es.tags.searchOrCreate : es.tags.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
        />

        {showEmpty ? (
          <div className="flex flex-col items-center gap-1 py-8 text-center text-body-sm text-muted">
            <TagIcon aria-hidden className="mb-2 size-8 stroke-[1.5]" />
            <p>{es.tags.noTagsYet}</p>
            {props.mode === 'multiple' ? <p>{es.tags.noTagsHint}</p> : null}
          </div>
        ) : null}

        <ul
          className="flex flex-col"
          aria-label={title}
          role={props.mode === 'single' ? 'listbox' : undefined}
        >
          {canCreate ? (
            <li>
              <button
                type="button"
                disabled={creating}
                className={cn(rowClass, 'text-brand')}
                onClick={() => void createTag()}
              >
                <Plus aria-hidden className="size-5 shrink-0" />
                <span className="min-w-0 truncate">{es.tags.create(newName ?? '')}</span>
              </button>
            </li>
          ) : null}

          {props.mode === 'single' && !query.trim() && tags.length > 0 ? (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={props.selectedId === null}
                className={cn(rowClass, props.selectedId === null && 'bg-brand/10 text-brand')}
                onClick={() => choose(null)}
              >
                <TagIcon aria-hidden className="size-5 shrink-0 text-muted" />
                <span className="flex-1">{es.tags.allTags}</span>
                {props.selectedId === null ? <Check aria-hidden className="size-5" /> : null}
              </button>
            </li>
          ) : null}

          {filtered.map((tag) => {
            const selected = isSelected(tag);
            return (
              <li key={tag.id}>
                <button
                  type="button"
                  role={props.mode === 'multiple' ? 'checkbox' : 'option'}
                  aria-checked={props.mode === 'multiple' ? selected : undefined}
                  aria-selected={props.mode === 'single' ? selected : undefined}
                  className={cn(rowClass, selected && 'bg-brand/10')}
                  onClick={() => (props.mode === 'multiple' ? toggle(tag.id) : choose(tag.id))}
                >
                  <ColorDot color={tag.color} />
                  <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-sm',
                      props.mode === 'multiple' && 'border border-line',
                      selected && 'border-brand bg-brand text-on-brand',
                      selected && props.mode === 'single' && 'bg-transparent text-brand',
                    )}
                  >
                    {selected ? <Check className="size-4" strokeWidth={3} /> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {query.trim() && filtered.length === 0 && !canCreate ? (
          <p className="py-4 text-center text-body-sm text-muted">{es.tags.noMatches}</p>
        ) : null}
      </div>
    </Sheet>
  );
}
