import { FileQuestion, TriangleAlert } from 'lucide-react';
import { Suspense } from 'react';
import { Navigate, useNavigate, useRouteError } from 'react-router';
import { es } from '@/i18n/es';
import { isChunkLoadError } from '@/lib/chunkReload';
import { Button } from '@/ui/button';
import { EmptyState } from '@/ui/empty-state';
import { HiddenScreenTitle } from '@/ui/screen-header';
import { useAuth } from '../features/auth/authContext';
import { AppShell } from './AppShell';
import { LoginScreen } from './lazyScreens';
import { SessionEffects } from './SessionEffects';

// Mientras se lee la sesión guardada no se muestra nada (es instantáneo, sin red).
function Blank() {
  return <div className="h-dvh bg-app" />;
}

export function LoginRoute() {
  const { state } = useAuth();
  if (state.status === 'loading') return <Blank />;
  if (state.status === 'signedIn') return <Navigate to="/" replace />;
  return (
    <Suspense fallback={<Blank />}>
      <LoginScreen />
    </Suspense>
  );
}

// Rutas protegidas: sin sesión se va al login. Con sesión la app funciona aunque no haya internet.
export function ProtectedLayout() {
  const { state } = useAuth();
  if (state.status === 'loading') return <Blank />;
  if (state.status === 'signedOut') return <Navigate to="/login" replace />;
  return (
    <>
      <SessionEffects userId={state.user.id} />
      <AppShell />
    </>
  );
}

export function NotFound() {
  const navigate = useNavigate();
  return (
    <>
      <HiddenScreenTitle>{es.errors.notFoundTitle}</HiddenScreenTitle>
      <EmptyState icon={<FileQuestion />} title={es.errors.notFoundTitle}>
        <Button variant="secondary" onClick={() => navigate('/')}>
          {es.errors.goHome}
        </Button>
      </EmptyState>
    </>
  );
}

// Error al mostrar una pantalla (el detalle técnico se registra en main.tsx).
// inShell: dentro de la estructura de la app, que sigue visible (barra lateral o
// inferior), así se puede ir a otra sección sin recargar.
export function RouteError({ inShell = false }: { inShell?: boolean }) {
  const error = useRouteError();
  const newVersion = isChunkLoadError(error);
  const content = (
    <EmptyState
      icon={<TriangleAlert />}
      title={newVersion ? es.errors.newVersion : es.errors.generic}
    >
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button onClick={() => window.location.reload()}>{es.errors.reload}</Button>
        {newVersion ? null : (
          <Button variant="secondary" onClick={() => window.location.assign('/')}>
            {es.errors.goHome}
          </Button>
        )}
      </div>
    </EmptyState>
  );
  if (inShell) return <div className="flex min-h-0 flex-1 flex-col">{content}</div>;
  return <main className="flex min-h-dvh bg-app pt-safe pb-safe">{content}</main>;
}
