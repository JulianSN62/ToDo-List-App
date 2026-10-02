import { CalendarDays, Folder, Search, Settings } from 'lucide-react';
import { NavLink, useLocation } from 'react-router';
import { es } from '@/i18n/es';
import { cn } from '@/lib/cn';

// Barra inferior de navegación (mobile, < 768px): 4 secciones de igual ancho.

const ITEMS = [
  {
    to: '/',
    label: es.nav.folders,
    icon: Folder,
    matches: (path: string) => path === '/' || path.startsWith('/f/') || path.startsWith('/task/'),
  },
  {
    to: '/today',
    label: es.nav.today,
    icon: CalendarDays,
    matches: (path: string) => path.startsWith('/today'),
  },
  {
    to: '/search',
    label: es.nav.search,
    icon: Search,
    matches: (path: string) => path.startsWith('/search'),
  },
  {
    to: '/settings',
    label: es.nav.settings,
    icon: Settings,
    matches: (path: string) => path.startsWith('/settings'),
  },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label={es.nav.mainNavigation}
      className="shrink-0 border-t border-line bg-panel pb-safe"
    >
      <ul className="flex h-16">
        {ITEMS.map(({ to, label, icon: Icon, matches }) => {
          const active = matches(pathname);
          return (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-caption',
                  active ? 'text-brand' : 'text-muted',
                )}
              >
                <Icon aria-hidden className="size-6" />
                {label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
