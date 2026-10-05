import { createBrowserRouter } from 'react-router';
import { FolderScreen } from '../features/folders/FolderScreen';
import { TaskRoute } from '../features/tasks/TaskRoute';
import {
  DueAlertsScreen,
  NotificationsScreen,
  SearchScreen,
  SettingsScreen,
  TagsScreen,
  TodayScreen,
} from './lazyScreens';
import { LoginRoute, NotFound, ProtectedLayout, RouteError } from './routeElements';

// Rutas de la app (spec 11.2).
export const router = createBrowserRouter([
  { path: '/login', element: <LoginRoute />, errorElement: <RouteError /> },
  {
    element: <ProtectedLayout />,
    errorElement: <RouteError />,
    children: [
      {
        // Un error en una pantalla se muestra dentro de la app, con la navegación visible.
        errorElement: <RouteError inShell />,
        children: [
          { index: true, element: <FolderScreen folderId={null} /> },
          { path: 'f/:folderId', element: <FolderScreen /> },
          { path: 'task/:taskId', element: <TaskRoute /> },
          { path: 'today', element: <TodayScreen /> },
          { path: 'search', element: <SearchScreen /> },
          { path: 'settings', element: <SettingsScreen /> },
          { path: 'settings/alerts', element: <DueAlertsScreen /> },
          { path: 'settings/tags', element: <TagsScreen /> },
          { path: 'settings/notifications', element: <NotificationsScreen /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]);
