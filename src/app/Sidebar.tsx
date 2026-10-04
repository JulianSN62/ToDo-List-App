import {
  CalendarDays,
  ChevronRight,
  Folder,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { useFolderCounts, useFolderTree, type Folder as FolderModel } from '@/data';
import { es } from '@/i18n/es';
import { cn } from '@/lib/cn';
import { getPath } from '@/lib/tree';
import { IconButton } from '@/ui/button';
import { ColorDot } from '@/ui/color-swatch-picker';
import { useToday } from './hooks/useToday';
import { useUiStore } from './uiStore';

// Barra lateral (>= 768px): accesos a Hoy, Buscar y Ajustes + árbol de carpetas plegable.

function SideLink({
  to,
  label,
  icon: Icon,
  collapsed,
  active,
}: {
  to: string;
  label: string;
  icon: typeof Folder;
  collapsed: boolean;
  active: boolean;
}) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-12 items-center gap-3 rounded-sm px-3 text-body-sm',
        collapsed && 'justify-center px-0',
        active ? 'bg-brand/10 font-medium text-fg' : 'text-fg hover:bg-app',
      )}
    >
      <Icon
        aria-hidden
        className={cn('shrink-0', collapsed ? 'size-6' : 'size-5', active && 'text-brand')}
      />
      <span className={collapsed ? 'sr-only' : 'truncate'}>{label}</span>
    </NavLink>
  );
}

function FolderTreeNav() {
  const today = useToday();
  const { children, byId, isLoading } = useFolderTree();
  const counts = useFolderCounts(children, today);
  const activeFolderId = useUiStore((state) => state.activeFolderId);
  const [manuallyExpanded, setManuallyExpanded] = useState<Set<string>>(new Set());
  const [manuallyCollapsed, setManuallyCollapsed] = useState<Set<string>>(new Set());

  // Los ancestros de la carpeta abierta se muestran expandidos.
  const activeAncestors = useMemo(() => {
    if (!activeFolderId) return new Set<string>();
    return new Set(getPath(activeFolderId, byId).map((folder) => folder.id));
  }, [activeFolderId, byId]);

  const isExpanded = (id: string) =>
    !manuallyCollapsed.has(id) && (manuallyExpanded.has(id) || activeAncestors.has(id));

  const toggle = (id: string) => {
    const expanded = isExpanded(id);
    setManuallyExpanded((previous) => {
      const next = new Set(previous);
      if (expanded) next.delete(id);
      else next.add(id);
      return next;
    });
    setManuallyCollapsed((previous) => {
      const next = new Set(previous);
      if (expanded) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const renderLevel = (parentId: string | null, depth: number) =>
    (children.get(parentId) ?? []).map((folder: FolderModel) => {
      const hasChildren = (children.get(folder.id)?.length ?? 0) > 0;
      const expanded = isExpanded(folder.id);
      const count = counts.get(folder.id);
      const active = folder.id === activeFolderId;
      return (
        <li key={folder.id}>
          <div
            className={cn(
              'group flex h-10 items-center rounded-sm pr-2',
              active ? 'bg-brand/10 font-medium text-fg' : 'text-fg hover:bg-app',
            )}
            style={{ paddingLeft: `${depth * 16}px` }}
          >
            {hasChildren ? (
              <button
                type="button"
                aria-label={
                  expanded ? es.folders.collapse(folder.name) : es.folders.expand(folder.name)
                }
                aria-expanded={expanded}
                onClick={() => toggle(folder.id)}
                className="flex size-8 shrink-0 items-center justify-center text-muted"
              >
                <ChevronRight
                  aria-hidden
                  className={cn(
                    'size-4 transition-transform duration-(--duration-fast)',
                    expanded && 'rotate-90',
                  )}
                />
              </button>
            ) : (
              <span className="size-8 shrink-0" aria-hidden />
            )}
            <Link
              to={`/f/${folder.id}`}
              aria-current={active ? 'page' : undefined}
              className="flex h-full min-w-0 flex-1 items-center gap-2 text-left text-body-sm"
            >
              {count && count.overdue > 0 ? (
                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-danger" />
              ) : null}
              <ColorDot color={folder.color} />
              <span className="truncate">{folder.name}</span>
              {count && count.overdue > 0 ? (
                <span className="sr-only">{`, ${es.folders.hasOverdue}`}</span>
              ) : null}
              {count && count.pending > 0 ? (
                <span
                  className={cn('ml-auto pl-2 text-caption', active ? 'text-fg' : 'text-muted')}
                >
                  <span aria-hidden>{count.pending}</span>
                  <span className="sr-only">{`, ${es.folders.pendingCountLong(count.pending)}`}</span>
                </span>
              ) : null}
            </Link>
          </div>
          {hasChildren && expanded ? <ul>{renderLevel(folder.id, depth + 1)}</ul> : null}
        </li>
      );
    });

  if (!isLoading && (children.get(null)?.length ?? 0) === 0) {
    return <p className="px-3 py-2 text-body-sm text-muted">{es.folders.sidebarEmpty}</p>;
  }
  return <ul className="flex flex-col">{renderLevel(null, 0)}</ul>;
}

export function Sidebar() {
  const { pathname } = useLocation();
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const openFolderForm = useUiStore((state) => state.openFolderForm);
  const inFolders = pathname === '/' || pathname.startsWith('/f/') || pathname.startsWith('/task/');

  return (
    <aside
      aria-label={es.nav.mainNavigation}
      className={cn(
        'flex shrink-0 flex-col border-r border-line bg-panel pt-safe pb-safe pl-safe transition-[width] duration-(--duration-base) ease-standard',
        collapsed ? 'w-[72px]' : 'w-[280px]',
      )}
    >
      <nav className="flex flex-col gap-1 p-3">
        {collapsed ? (
          <SideLink to="/" label={es.nav.folders} icon={Folder} collapsed active={inFolders} />
        ) : null}
        <SideLink
          to="/today"
          label={es.nav.today}
          icon={CalendarDays}
          collapsed={collapsed}
          active={pathname.startsWith('/today')}
        />
        <SideLink
          to="/search"
          label={es.nav.search}
          icon={Search}
          collapsed={collapsed}
          active={pathname.startsWith('/search')}
        />
      </nav>

      {collapsed ? (
        <div className="flex-1" />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col border-t border-line">
          <div className="flex h-12 items-center justify-between pr-1 pl-4">
            <NavLink
              to="/"
              className={cn(
                'text-caption font-semibold tracking-wide uppercase',
                inFolders ? 'text-brand' : 'text-muted',
              )}
            >
              {es.nav.folders}
            </NavLink>
            <IconButton
              aria-label={es.folders.newFolder}
              size="iconSm"
              onClick={() => openFolderForm({ mode: 'create', parentId: null })}
            >
              <Plus />
            </IconButton>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            <FolderTreeNav />
          </div>
        </div>
      )}

      <div
        className={cn('flex items-center gap-1 border-t border-line p-3', collapsed && 'flex-col')}
      >
        <div className={collapsed ? 'w-full' : 'flex-1'}>
          <SideLink
            to="/settings"
            label={es.nav.settings}
            icon={Settings}
            collapsed={collapsed}
            active={pathname.startsWith('/settings')}
          />
        </div>
        <IconButton
          aria-label={collapsed ? es.nav.expandSidebar : es.nav.collapseSidebar}
          aria-expanded={!collapsed}
          onClick={toggleSidebar}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </IconButton>
      </div>
    </aside>
  );
}
