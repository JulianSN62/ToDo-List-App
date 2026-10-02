import { FileQuestion, TriangleAlert } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router';
import { es } from '@/i18n/es';
import { Button } from '@/ui/button';
import { EmptyState } from '@/ui/empty-state';
import { useAuth } from '../features/auth/authContext';
import { LoginScreen } from '../features/auth/LoginScreen';
import { AppShell } from './AppShell';
import { SessionEffects } from './SessionEffects';

// Mientras se lee la sesión guardada no se muestra nada (es instantáneo, sin red).
function Blank() {
  return <div className="h-dvh bg-app" />;
}

export function LoginRoute() {
  const { state } = useAuth();
  if (state.status === 'loading') return <Blank />;
  if (state.status === 'signedIn') return <Navigate to="/" replace />;
  return <LoginScreen />;
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
    <EmptyState icon={<FileQuestion />} title={es.errors.notFoundTitle}>
      <Button variant="secondary" onClick={() => navigate('/')}>
        {es.errors.goHome}
      </Button>
    </EmptyState>
  );
}

export function RouteError() {
  return (
    <main className="flex min-h-dvh bg-app">
      <EmptyState icon={<TriangleAlert />} title={es.errors.generic}>
        <Button variant="secondary" onClick={() => window.location.assign('/')}>
          {es.errors.goHome}
        </Button>
      </EmptyState>
    </main>
  );
}
