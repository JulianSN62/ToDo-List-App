import { TriangleAlert } from 'lucide-react';
import { Component, type ReactNode } from 'react';
import { es } from '@/i18n/es';
import { Button } from '@/ui/button';

// Pantallas para errores que impiden usar la app (sin la barra de navegación).

export function FatalErrorScreen({ title, description }: { title: string; description: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-app px-4 pt-safe pb-safe">
      <div className="w-full max-w-[480px] rounded-md border border-line bg-panel p-6">
        <h1 className="flex items-center gap-2 text-title-sm font-semibold text-fg">
          <TriangleAlert aria-hidden className="size-5 shrink-0 text-star" />
          {title}
        </h1>
        <p className="mt-3 text-body-sm text-muted">{description}</p>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          {es.errors.reload}
        </Button>
      </div>
    </main>
  );
}

export function LocalDbErrorScreen() {
  return (
    <FatalErrorScreen title={es.errors.localDbTitle} description={es.errors.localDbDescription} />
  );
}

// Último recurso: un error fuera de las pantallas (por ejemplo, en la sesión o la base
// local) deja este mensaje en vez de una pantalla en blanco. El error se registra en
// onCaughtError (main.tsx).
export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render(): ReactNode {
    if (this.state.failed) {
      return <FatalErrorScreen title={es.errors.appTitle} description={es.errors.appDescription} />;
    }
    return this.props.children;
  }
}
