import { useId, useState, type FormEvent } from 'react';
import { tagRepo, TagNameTakenError, useTags, type Tag } from '@/data';
import { es } from '@/i18n/es';
import type { ColorToken } from '@/lib/colors';
import { errorMeta, logger } from '@/lib/logger';
import { findTagByName, pickTagColor } from '@/lib/tags';
import { LIMITS, normalizeTagName } from '@/lib/validation';
import { Button } from '@/ui/button';
import { ColorSwatchPicker } from '@/ui/color-swatch-picker';
import { Input } from '@/ui/input';
import { Sheet } from '@/ui/sheet';
import { showErrorToast } from '@/ui/toast';

// Crear o editar una etiqueta: nombre obligatorio (único sin distinguir mayúsculas) y color.

export type TagFormRequest = { mode: 'create' } | { mode: 'edit'; tag: Tag };

function TagForm({ request, onClose }: { request: TagFormRequest; onClose: () => void }) {
  const id = useId();
  const { tags } = useTags();
  const [name, setName] = useState(request.mode === 'edit' ? request.tag.name : '');
  const [color, setColor] = useState<ColorToken | null>(() =>
    request.mode === 'edit' ? request.tag.color : pickTagColor(tags.map((tag) => tag.color)),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function validate(): string | null {
    if (!name.trim()) return es.tags.nameRequired;
    const normalized = normalizeTagName(name);
    if (!normalized) return es.tags.nameTooLong(LIMITS.tagName);
    const exceptId = request.mode === 'edit' ? request.tag.id : undefined;
    if (findTagByName(tags, normalized, exceptId)) return es.tags.nameTaken;
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    try {
      if (request.mode === 'edit') await tagRepo.update(request.tag.id, { name, color });
      else await tagRepo.create({ name, color });
      onClose();
    } catch (caught) {
      if (caught instanceof TagNameTakenError) {
        setError(es.tags.nameTaken);
      } else {
        logger.error('No se pudo guardar la etiqueta', errorMeta(caught));
        showErrorToast();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-name`} className="text-body-sm text-muted">
          {es.tags.nameLabel}
        </label>
        <Input
          id={`${id}-name`}
          autoFocus
          autoComplete="off"
          maxLength={LIMITS.tagName}
          placeholder={es.tags.namePlaceholder}
          invalid={error !== null}
          aria-describedby={error ? `${id}-error` : undefined}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
        />
        {error ? (
          <p id={`${id}-error`} role="alert" className="text-caption text-danger">
            {error}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-body-sm text-muted">{es.tags.colorLabel}</span>
        <ColorSwatchPicker value={color} onChange={setColor} label={es.tags.colorLabel} />
      </div>
      <div className="flex gap-2 md:justify-end">
        <Button variant="secondary" className="flex-1 md:flex-none" onClick={onClose}>
          {es.common.cancel}
        </Button>
        <Button type="submit" className="flex-1 md:flex-none" disabled={saving}>
          {request.mode === 'edit' ? es.common.save : es.common.create}
        </Button>
      </div>
    </form>
  );
}

export function TagFormSheet({
  request,
  open,
  formKey,
  onClose,
}: {
  request: TagFormRequest | null;
  open: boolean;
  /** Cambia en cada apertura para reiniciar el formulario. */
  formKey: number;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={request?.mode === 'edit' ? es.tags.editTag : es.tags.newTag}
    >
      {request ? <TagForm key={formKey} request={request} onClose={onClose} /> : null}
    </Sheet>
  );
}
