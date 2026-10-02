import { Plus, Tag as TagIcon } from 'lucide-react';
import { useState } from 'react';
import { useTags } from '@/data';
import { es } from '@/i18n/es';
import { Button } from '@/ui/button';
import { TagChip } from '@/ui/tag-chip';
import { TagPickerSheet } from './TagPickerSheet';

// Campo "Etiquetas" de la ventana de tarea: chips elegidos y selector para agregar o crear.
// Los cambios se guardan junto con el resto de la tarea.
export function TagsField({
  tagIds,
  onChange,
}: {
  tagIds: string[];
  onChange: (tagIds: string[]) => void;
}) {
  const { tags, byId } = useTags();
  const [picking, setPicking] = useState(false);
  // Se muestran en orden alfabético; se ignoran las que se eliminaron mientras tanto.
  const selected = tags.filter((tag) => tagIds.includes(tag.id));

  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-2 text-body-sm text-muted [&_svg]:size-5">
        <TagIcon aria-hidden />
        {es.tags.title}
      </span>
      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label={es.tags.title}>
          {selected.map((tag) => (
            <li key={tag.id} className="max-w-full">
              <TagChip
                name={tag.name}
                color={tag.color}
                removeLabel={es.tags.remove(tag.name)}
                onRemove={() => onChange(tagIds.filter((id) => id !== tag.id))}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <div>
        <Button variant="secondary" size="sm" onClick={() => setPicking(true)}>
          <Plus />
          {selected.length > 0 ? es.tags.editTags : es.tags.addTag}
        </Button>
      </div>
      <TagPickerSheet
        open={picking}
        onOpenChange={setPicking}
        title={es.tags.title}
        mode="multiple"
        selectedIds={tagIds.filter((id) => byId.has(id))}
        onChange={onChange}
      />
    </div>
  );
}
