import { Suspense } from 'react';
import { lazyComponent } from '@/app/lazyComponent';
import { useUiStore } from '@/app/uiStore';
import { es } from '@/i18n/es';
import { Sheet } from '@/ui/sheet';

// Ventana de crear o editar carpeta. El formulario se carga a demanda.
const FolderForm = lazyComponent(() => import('./FolderForm').then((module) => module.FolderForm));

export function FolderFormSheet() {
  const request = useUiStore((state) => state.folderForm);
  const open = useUiStore((state) => state.folderFormOpen);
  const formKey = useUiStore((state) => state.folderFormKey);
  const close = useUiStore((state) => state.closeFolderForm);

  const title =
    request?.mode === 'edit'
      ? es.folders.editFolder
      : request?.parentId
        ? es.folders.newSubfolder
        : es.folders.newFolder;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title={title}
    >
      <Suspense fallback={null}>
        {request ? <FolderForm key={formKey} request={request} onClose={close} /> : null}
      </Suspense>
    </Sheet>
  );
}
