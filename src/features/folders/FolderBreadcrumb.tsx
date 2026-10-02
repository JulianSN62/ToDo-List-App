import { ChevronRight } from 'lucide-react';
import { Fragment } from 'react';
import { Link } from 'react-router';
import type { Folder } from '@/data';
import { es } from '@/i18n/es';
import { abbreviatePath } from '@/lib/tree';
import { useIsSidebarLayout } from '@/ui/useMediaQuery';

// Ruta clickeable de la carpeta actual. En mobile se abrevia: primer nivel + "…" + últimos dos.
export function FolderBreadcrumb({ path }: { path: Folder[] }) {
  const isSidebarLayout = useIsSidebarLayout();
  const items = abbreviatePath(path, isSidebarLayout ? 5 : 3);

  return (
    <nav aria-label={es.folders.breadcrumb} className="min-w-0 flex-1">
      <ol className="flex min-w-0 items-center gap-1 text-body-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={item.kind === 'segment' ? item.node.id : `ellipsis-${index}`}>
              {index > 0 ? (
                <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
              ) : null}
              <li className={isLast ? 'min-w-0 truncate' : 'max-w-32 min-w-0 shrink truncate'}>
                {item.kind === 'ellipsis' ? (
                  <span className="text-muted">…</span>
                ) : isLast ? (
                  <span aria-current="page" className="text-title-sm font-semibold text-fg">
                    {item.node.name}
                  </span>
                ) : (
                  <Link to={`/f/${item.node.id}`} className="text-muted hover:text-fg">
                    {item.node.name}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
