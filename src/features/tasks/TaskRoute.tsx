import { FileQuestion } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { useTask } from '@/data';
import { es } from '@/i18n/es';
import { Button } from '@/ui/button';
import { EmptyState } from '@/ui/empty-state';
import { ScreenHeader, ScreenTitle } from '@/ui/screen-header';
import { FolderScreen } from '../folders/FolderScreen';

// Ruta /task/:taskId: muestra la carpeta de la tarea con el detalle abierto.
// También sirve como deep link (por ejemplo, desde una notificación en la Fase 8).
export function TaskRoute() {
  const { taskId = '' } = useParams();
  const navigate = useNavigate();
  const { task, isLoading } = useTask(taskId);

  if (task) return <FolderScreen folderId={task.folderId} selectedTaskId={task.id} />;
  if (isLoading) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScreenHeader onBack={() => navigate('/')}>
        <ScreenTitle>{es.nav.folders}</ScreenTitle>
      </ScreenHeader>
      <EmptyState icon={<FileQuestion />} title={es.tasks.notFound}>
        <Button variant="secondary" onClick={() => navigate('/')}>
          {es.folders.goToRoot}
        </Button>
      </EmptyState>
    </div>
  );
}
