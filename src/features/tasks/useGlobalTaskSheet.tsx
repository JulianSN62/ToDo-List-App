import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import type { Task } from '@/data';
import { EditTaskSheet } from './TaskFormSheet';

// Vistas globales (Hoy, Buscar, filtros): la tarea se abre en una ventana sobre la misma
// pantalla, sin cambiar de ruta, y desde ahí se puede ir a su carpeta.
export function useGlobalTaskSheet({ onNavigate }: { onNavigate?: () => void } = {}): {
  open: (task: Task) => void;
  goToFolder: (task: Task) => void;
  sheet: ReactNode;
} {
  const navigate = useNavigate();
  const [taskId, setTaskId] = useState<string | null>(null);

  const goToFolderId = (folderId: string) => {
    onNavigate?.();
    navigate(`/f/${folderId}`);
  };

  return {
    open: (task) => setTaskId(task.id),
    goToFolder: (task) => goToFolderId(task.folderId),
    sheet: (
      <EditTaskSheet taskId={taskId} onClose={() => setTaskId(null)} onGoToFolder={goToFolderId} />
    ),
  };
}
