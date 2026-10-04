import { RouterProvider } from 'react-router/dom';
import { envResult } from '@/config/env';
import { DataProvider } from '@/data';
import { platform } from '@/platform';
import { Toaster } from '@/ui/toast';
import { AuthProvider } from '../features/auth/AuthProvider';
import { ConfigErrorScreen } from './ConfigErrorScreen';
import { AppErrorBoundary, LocalDbErrorScreen } from './ErrorScreens';
import { PwaUpdatePrompt } from './PwaUpdatePrompt';
import { router } from './router';
import { useSystemThemeSync } from './theme';

export function App() {
  useSystemThemeSync();

  if (!envResult.ok) {
    return <ConfigErrorScreen missing={envResult.missing} />;
  }

  return (
    <AppErrorBoundary>
      <DataProvider errorFallback={<LocalDbErrorScreen />}>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster />
          {/* En Android los archivos vienen dentro de la app: no se usa service worker. */}
          {platform.isNative ? null : <PwaUpdatePrompt />}
        </AuthProvider>
      </DataProvider>
    </AppErrorBoundary>
  );
}
