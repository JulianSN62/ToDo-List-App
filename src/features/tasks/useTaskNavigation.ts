import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';

// Abrir y cerrar el detalle de una tarea sin llenar el historial de entradas repetidas:
// cerrar vuelve atrás si el detalle se abrió desde la lista; si se llegó directo (link), va a la carpeta.

interface TaskRouteState {
  openedFromList?: boolean;
}

export function useTaskNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as TaskRouteState | null;
  const onTaskRoute = location.pathname.startsWith('/task/');

  const openTask = useCallback(
    (taskId: string) => {
      navigate(`/task/${taskId}`, {
        state: { openedFromList: onTaskRoute ? (state?.openedFromList ?? false) : true },
        replace: onTaskRoute,
      });
    },
    [navigate, onTaskRoute, state?.openedFromList],
  );

  const closeTask = useCallback(
    (folderId: string | null) => {
      if (state?.openedFromList) navigate(-1);
      else navigate(folderId ? `/f/${folderId}` : '/', { replace: true });
    },
    [navigate, state?.openedFromList],
  );

  return { openTask, closeTask };
}
