import { File as FileIcon, FileText, Image as ImageIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fileRepo, FileFetchError, useOnline, wakeFileSync, type FileFetchErrorKind } from '@/data';
import { es } from '@/i18n/es';
import { cn } from '@/lib/cn';
import { fileKind, formatFileSize } from '@/lib/files';
import { errorMeta, logger } from '@/lib/logger';
import { files } from '@/platform';
import { Button, IconButton } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { showErrorToast } from '@/ui/toast';
import { BlobImage } from './BlobImage';
import type { FileListItem } from './fileItems';
import { ImageViewer, type ViewedImage } from './ImageViewer';
import { useStoredFile } from './useStoredFile';

// Lista de archivos adjuntos: miniatura o ícono, nombre, tamaño y estado de la subida.
// Tocar uno lo abre según el tipo: fotos en un visor, PDF en otra pestaña, el resto se
// descarga. Las fotos que no están en el dispositivo se bajan solas (con conexión) para
// mostrar la miniatura; los demás archivos, recién al abrirlos.

const FETCH_ERRORS: Record<FileFetchErrorKind, string> = {
  offline: es.files.offline,
  notUploadedYet: es.files.notUploadedYet,
  failed: es.files.openError,
};

function statusText(item: FileListItem, online: boolean): string | null {
  switch (item.status) {
    case 'loading':
      return null;
    case 'draft':
      return es.files.status.draft;
    case 'pending':
      return online ? es.files.status.pending : es.files.status.pendingOffline;
    case 'uploading':
      return es.files.status.uploading;
    case 'failed':
      return es.files.status.failed;
    case 'remote':
    case 'uploaded':
      // Si no está en el dispositivo, abrirlo necesita conexión.
      return item.cached ? null : es.files.status.remote;
  }
}

function FileItem({
  item,
  online,
  busy,
  onOpen,
  onRemove,
}: {
  item: FileListItem;
  online: boolean;
  busy: boolean;
  onOpen: () => void;
  onRemove?: () => void;
}) {
  const kind = fileKind(item.mimeType, item.name);
  const isImage = kind === 'image';
  const needsDownload =
    isImage &&
    item.id !== null &&
    !item.cached &&
    (item.status === 'remote' || item.status === 'uploaded');

  // Miniatura: las fotos se bajan solas cuando se muestra la tarea.
  useEffect(() => {
    if (!needsDownload || !online || item.id === null) return;
    void fileRepo.getFile(item.id).catch(() => undefined);
  }, [needsDownload, online, item.id]);

  const stored = useStoredFile(item.id, isImage && item.cached);
  const preview = isImage ? (item.data ?? stored) : null;
  const status =
    busy && !item.cached && !item.data ? es.files.downloading : statusText(item, online);
  const Icon = kind === 'image' ? ImageIcon : kind === 'pdf' ? FileText : FileIcon;

  return (
    <li className="flex min-h-14 min-w-0 items-center gap-1">
      <button
        type="button"
        onClick={onOpen}
        aria-label={es.files.open(item.name)}
        className="-ml-1 flex min-w-0 flex-1 items-center gap-3 rounded-sm py-1 pr-1 pl-1 text-left hover:bg-app"
      >
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-line bg-app text-muted">
          {busy ? (
            <Spinner />
          ) : preview ? (
            <BlobImage blob={preview} alt="" className="size-full object-cover" />
          ) : (
            <Icon aria-hidden className="size-5" />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body-sm text-fg">{item.name}</span>
          <span className="truncate text-caption text-muted">
            {formatFileSize(item.size)}
            {status ? (
              <>
                {' · '}
                <span className={cn(item.status === 'failed' && 'text-danger')}>{status}</span>
              </>
            ) : null}
          </span>
        </span>
      </button>
      {item.status === 'failed' && item.id !== null ? (
        <Button
          variant="ghost"
          size="sm"
          aria-label={es.files.retryLabel(item.name)}
          onClick={() => {
            if (item.id === null) return;
            void fileRepo
              .retryUpload(item.id)
              .then(wakeFileSync)
              .catch((error: unknown) => {
                logger.error('No se pudo reintentar la subida', errorMeta(error));
                showErrorToast();
              });
          }}
        >
          {es.files.retry}
        </Button>
      ) : null}
      {onRemove ? (
        <IconButton size="iconSm" aria-label={es.files.remove(item.name)} onClick={onRemove}>
          <X />
        </IconButton>
      ) : null}
    </li>
  );
}

export function FileList({
  items,
  onRemove,
  className,
}: {
  items: readonly FileListItem[];
  /** Sin esta función la lista es solo para ver. */
  onRemove?: (key: string) => void;
  className?: string;
}) {
  const online = useOnline();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ image: ViewedImage; open: boolean } | null>(null);

  async function open(item: FileListItem) {
    if (busyKey !== null) return;
    setBusyKey(item.key);
    try {
      const data = item.data ?? (item.id ? await fileRepo.getFile(item.id) : null);
      if (!data) return;
      const file = { name: item.name, mimeType: item.mimeType, data };
      const kind = fileKind(item.mimeType, item.name);
      if (kind === 'image') setViewer({ image: file, open: true });
      else if (kind === 'pdf') await files.openPdf(file);
      else await files.saveFile(file);
    } catch (error) {
      if (error instanceof FileFetchError) {
        showErrorToast(FETCH_ERRORS[error.kind]);
      } else {
        logger.warn('No se pudo abrir un archivo', errorMeta(error));
        showErrorToast(es.files.openError);
      }
    } finally {
      setBusyKey(null);
    }
  }

  if (items.length === 0) return null;
  return (
    <>
      <ul aria-label={es.files.list} className={cn('flex w-full flex-col', className)}>
        {items.map((item) => (
          <FileItem
            key={item.key}
            item={item}
            online={online}
            busy={busyKey === item.key}
            onOpen={() => void open(item)}
            onRemove={onRemove ? () => onRemove(item.key) : undefined}
          />
        ))}
      </ul>
      <ImageViewer
        open={viewer?.open ?? false}
        image={viewer?.image ?? null}
        onClose={() => setViewer((current) => (current ? { ...current, open: false } : null))}
      />
    </>
  );
}
