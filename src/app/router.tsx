import { createBrowserRouter } from 'react-router';
import { FolderScreen } from '../features/folders/FolderScreen';
import { SearchScreen } from '../features/search/SearchScreen';
import { DueAlertsScreen } from '../features/settings/DueAlertsScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { TagsScreen } from '../features/tags/TagsScreen';
import { TaskRoute } from '../features/tasks/TaskRoute';
import { TodayScreen } from '../features/today/TodayScreen';
import { LoginRoute, NotFound, ProtectedLayout, RouteError } from './routeElements';

// Rutas de la app (spec 11.2).
export const router = createBrowserRouter([
  { path: '/login', element: <LoginRoute />, errorElement: <RouteError /> },
  {
    element: <ProtectedLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <FolderScreen folderId={null} /> },
      { path: 'f/:folderId', element: <FolderScreen /> },
      { path: 'task/:taskId', element: <TaskRoute /> },
      { path: 'today', element: <TodayScreen /> },
      { path: 'search', element: <SearchScreen /> },
      { path: 'settings', element: <SettingsScreen /> },
      { path: 'settings/alerts', element: <DueAlertsScreen /> },
      { path: 'settings/tags', element: <TagsScreen /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
