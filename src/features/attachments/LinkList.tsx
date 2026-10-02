import { ExternalLink, Link2 } from 'lucide-react';
import { es } from '@/i18n/es';
import { cn } from '@/lib/cn';
import { linkDisplayText } from '@/lib/links';
import { openExternalLink } from './openLink';

// Lista de links de una tarea (solo lectura).
export function LinkList({
  links,
  className,
}: {
  links: readonly { id: string; url: string; label: string | null }[];
  className?: string;
}) {
  if (links.length === 0) return null;
  return (
    <ul className={cn('flex w-full flex-col', className)}>
      {links.map((link) => {
        const text = linkDisplayText(link);
        return (
          <li key={link.id} className="min-w-0">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={es.links.open(text)}
              onClick={(event) => openExternalLink(event, link.url)}
              className="flex min-h-10 min-w-0 items-center gap-2 rounded-sm text-body-sm text-brand hover:underline"
            >
              <Link2 aria-hidden className="size-4 shrink-0" />
              <span className="min-w-0 truncate">{text}</span>
              <ExternalLink aria-hidden className="size-3.5 shrink-0 opacity-70" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
