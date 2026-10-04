import { TriangleAlert } from 'lucide-react';
import { es } from '@/i18n/es';

// Se muestra si faltan variables del .env (en lugar de errores confusos).
export function ConfigErrorScreen({ missing }: { missing: string[] }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-app px-4 pt-safe pb-safe">
      <div className="w-full max-w-[480px] rounded-md border border-line bg-panel p-6">
        <h1 className="flex items-center gap-2 text-title-sm font-semibold text-fg">
          <TriangleAlert aria-hidden className="size-5 text-star" />
          {es.config.title}
        </h1>
        <p className="mt-3 text-body-sm text-muted">{es.config.description}</p>
        <p className="mt-4 text-body-sm text-fg">{es.config.missing}</p>
        <ul className="mt-2 list-inside list-disc text-body-sm text-muted">
          {missing.map((name) => (
            <li key={name}>
              <code>{name}</code>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
