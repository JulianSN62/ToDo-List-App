import { Link2, Paperclip, Pencil, Plus, X } from 'lucide-react';
import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { es } from '@/i18n/es';
import { formatFileSize, MAX_FILE_BYTES } from '@/lib/files';
import { newId } from '@/lib/ids';
import { linkDisplayText } from '@/lib/links';
import { errorMeta, logger } from '@/lib/logger';
import type { FileDraft, LinkDraft, LinkEditorDraft } from '@/lib/taskForm';
import { LIMITS } from '@/lib/validation';
import { files as fileService } from '@/platform';
import { Button, IconButton } from '@/ui/button';
import { Input } from '@/ui/input';
import { Spinner } from '@/ui/spinner';
import type { FileListItem } from './fileItems';
import { FileList } from './FileList';
import { openExternalLink } from './openLink';
import { prepareFile } from './prepareFiles';

// Campo "Adjuntos" de la ventana de tarea: links (agregar, editar, quitar) y archivos
// (elegir varios, quitar). Todo se guarda al tocar "Guardar"/"Crear". El link en edición
// lo maneja la ventana, para no perderlo si se guarda la tarea sin tocar "Listo".
export function AttachmentsField({
  links,
  draft,
  error,
  onDraftChange,
  onCommitDraft,
  onRemove,
  files,
  onAddFiles,
  onRemoveFile,
  onBusyChange,
}: {
  links: LinkDraft[];
  draft: LinkEditorDraft | null;
  error: string | null;
  onDraftChange: (draft: LinkEditorDraft | null) => void;
  onCommitDraft: () => void;
  onRemove: (key: string) => void;
  files: FileListItem[];
  onAddFiles: (files: FileDraft[]) => void;
  onRemoveFile: (key: string) => void;
  /** true mientras se preparan archivos (no se debería guardar todavía). */
  onBusyChange?: (busy: boolean) => void;
}) {
  const id = useId();
  const [preparing, setPreparing] = useState(false);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  useEffect(() => {
    onBusyChange?.(preparing);
  }, [preparing, onBusyChange]);

  // Elige archivos, comprime las fotos y descarta los que superan el límite.
  async function pickFiles() {
    const picked = await fileService.pickFiles({ multiple: true });
    if (picked.length === 0) return;
    setPreparing(true);
    setFileErrors([]);
    try {
      const added: FileDraft[] = [];
      const errors: string[] = [];
      for (const file of picked) {
        const result = await prepareFile(file);
        if (result.ok) {
          added.push({ key: newId(), id: null, ...result.file });
        } else {
          errors.push(
            es.files.tooLarge(
              result.name,
              formatFileSize(result.size),
              formatFileSize(MAX_FILE_BYTES),
            ),
          );
        }
      }
      if (added.length > 0) onAddFiles(added);
      setFileErrors(errors);
    } catch (caught) {
      logger.warn('No se pudieron preparar los archivos', errorMeta(caught));
      setFileErrors([es.files.saveError]);
    } finally {
      setPreparing(false);
    }
  }

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

      <FileList items={files} onRemove={onRemoveFile} />

      {fileErrors.length > 0 ? (
        <div role="alert" className="flex flex-col gap-1 text-caption text-danger">
          {fileErrors.map((message, index) => (
            <p key={index}>{message}</p>
          ))}
        </div>
      ) : null}

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
        <Button
          variant="secondary"
          size="sm"
          aria-label={es.files.addLabel}
          disabled={preparing}
          onClick={() => void pickFiles()}
        >
          {preparing ? <Spinner /> : <Plus />}
          {preparing ? es.files.preparing : es.files.add}
        </Button>
      </div>
    </div>
  );
}
