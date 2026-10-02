import { Link2, Lock, Paperclip, Pencil, Plus, X } from 'lucide-react';
import { useId, type KeyboardEvent } from 'react';
import { es } from '@/i18n/es';
import { linkDisplayText } from '@/lib/links';
import type { LinkDraft, LinkEditorDraft } from '@/lib/taskForm';
import { LIMITS } from '@/lib/validation';
import { Button, IconButton } from '@/ui/button';
import { Input } from '@/ui/input';
import { openExternalLink } from './openLink';

// Campo "Adjuntos" de la ventana de tarea: links (agregar, editar, quitar).
// Los archivos y fotos llegan en la Fase 9. El link en edición lo maneja la ventana,
// para no perderlo si se guarda la tarea sin tocar "Listo".
export function LinksField({
  links,
  draft,
  error,
  onDraftChange,
  onCommitDraft,
  onRemove,
}: {
  links: LinkDraft[];
  draft: LinkEditorDraft | null;
  error: string | null;
  onDraftChange: (draft: LinkEditorDraft | null) => void;
  onCommitDraft: () => void;
  onRemove: (key: string) => void;
}) {
  const id = useId();

  // Enter agrega el link sin enviar la ventana (Ctrl/Cmd + Enter sigue guardando la tarea).
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      onCommitDraft();
    }
  }

  const editor = draft ? (
    <div className="flex flex-col gap-3 rounded-sm border border-line p-3">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-url`} className="text-caption text-muted">
          {es.links.urlLabel}
        </label>
        <Input
          id={`${id}-url`}
          autoFocus
          type="url"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="done"
          maxLength={LIMITS.linkUrl}
          placeholder={es.links.urlPlaceholder}
          invalid={error !== null}
          aria-describedby={error ? `${id}-error` : undefined}
          value={draft.url}
          onChange={(event) => onDraftChange({ ...draft, url: event.target.value })}
          onKeyDown={handleKeyDown}
        />
        {error ? (
          <p id={`${id}-error`} role="alert" className="text-caption text-danger">
            {error}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-label`} className="text-caption text-muted">
          {es.links.labelLabel}
        </label>
        <Input
          id={`${id}-label`}
          autoComplete="off"
          enterKeyHint="done"
          maxLength={LIMITS.linkLabel}
          placeholder={es.links.labelPlaceholder}
          value={draft.label}
          onChange={(event) => onDraftChange({ ...draft, label: event.target.value })}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => onDraftChange(null)}>
          {es.common.cancel}
        </Button>
        <Button size="sm" onClick={onCommitDraft}>
          {es.links.save}
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-2 text-body-sm text-muted [&_svg]:size-5">
        <Paperclip aria-hidden />
        {es.tasks.attachments}
      </span>

      {links.length > 0 ? (
        <ul className="flex flex-col">
          {links.map((link) => {
            if (draft?.key === link.key) return <li key={link.key}>{editor}</li>;
            const text = linkDisplayText({ url: link.url, label: link.label.trim() || null });
            return (
              <li key={link.key} className="flex min-h-12 min-w-0 items-center gap-1">
                <Link2 aria-hidden className="size-4 shrink-0 text-muted" />
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={es.links.open(text)}
                  onClick={(event) => openExternalLink(event, link.url)}
                  className="min-w-0 flex-1 truncate px-1 text-body-sm text-brand hover:underline"
                >
                  {text}
                </a>
                <IconButton
                  size="iconSm"
                  aria-label={es.links.edit(text)}
                  onClick={() => onDraftChange({ key: link.key, url: link.url, label: link.label })}
                >
                  <Pencil />
                </IconButton>
                <IconButton
                  size="iconSm"
                  aria-label={es.links.remove(text)}
                  onClick={() => onRemove(link.key)}
                >
                  <X />
                </IconButton>
              </li>
            );
          })}
        </ul>
      ) : null}

      {draft?.key === null ? editor : null}

      <div className="flex flex-wrap items-center gap-2">
        {draft === null ? (
          <Button
            variant="secondary"
            size="sm"
            aria-label={es.links.addLabel}
            onClick={() => onDraftChange({ key: null, url: '', label: '' })}
          >
            <Plus />
            {es.links.add}
          </Button>
        ) : null}
        <span className="flex items-center gap-2 text-caption text-muted">
          <Lock aria-hidden className="size-4" />
          {es.links.fileComingSoon}
        </span>
      </div>
    </div>
  );
}
