import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useUiStore, type FolderFormRequest } from '@/app/uiStore';
import { folderRepo } from '@/data';
import { es } from '@/i18n/es';
import type { ColorToken } from '@/lib/colors';
import { errorMeta, logger } from '@/lib/logger';
import { folderNameSchema, LIMITS } from '@/lib/validation';
import { Button } from '@/ui/button';
import { ColorSwatchPicker } from '@/ui/color-swatch-picker';
import { Input } from '@/ui/input';
import { Sheet } from '@/ui/sheet';
import { showErrorToast } from '@/ui/toast';

// Crear o editar una carpeta: nombre obligatorio y color opcional.

const formSchema = z.object({ name: folderNameSchema });
type FormValues = z.infer<typeof formSchema>;

function FolderForm({ request, onClose }: { request: FolderFormRequest; onClose: () => void }) {
  const [color, setColor] = useState<ColorToken | null>(
    request.mode === 'edit' ? request.color : null,
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: { name: request.mode === 'edit' ? request.name : '' },
  });

  const onSubmit = handleSubmit(async ({ name }) => {
    try {
      if (request.mode === 'edit') {
        await folderRepo.update(request.folderId, { name, color });
      } else {
        await folderRepo.create({ parentId: request.parentId, name, color });
      }
      onClose();
    } catch (error) {
      logger.error('No se pudo guardar la carpeta', errorMeta(error));
      showErrorToast();
    }
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="folder-name" className="text-body-sm text-muted">
          {es.folders.nameLabel}
        </label>
        <Input
          id="folder-name"
          autoFocus
          autoComplete="off"
          maxLength={LIMITS.folderName}
          placeholder={es.folders.namePlaceholder}
          invalid={errors.name !== undefined}
          {...register('name')}
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-body-sm text-muted">{es.folders.colorLabel}</span>
        <ColorSwatchPicker value={color} onChange={setColor} label={es.folders.colorLabel} />
      </div>
      <div className="flex gap-2 md:justify-end">
        <Button variant="secondary" className="flex-1 md:flex-none" onClick={onClose}>
          {es.common.cancel}
        </Button>
        <Button type="submit" className="flex-1 md:flex-none" disabled={!isValid || isSubmitting}>
          {request.mode === 'edit' ? es.common.save : es.common.create}
        </Button>
      </div>
    </form>
  );
}

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
      {request ? <FolderForm key={formKey} request={request} onClose={close} /> : null}
    </Sheet>
  );
}
