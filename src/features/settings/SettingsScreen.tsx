import { formatDistanceToNow } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import {
  Bell,
  BellRing,
  ChevronRight,
  Cloud,
  Database,
  Info,
  ListTodo,
  LogOut,
  Palette,
  RefreshCw,
  Tag as TagIcon,
  User,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { setThemePreference, useThemePreference, type ThemePreference } from '@/app/theme';
import { APP_VERSION } from '@/config/app';
import { getPendingUploadCount, syncNow, useSettings, useSyncState, useTags } from '@/data';
import { es } from '@/i18n/es';
import { errorMeta, logger } from '@/lib/logger';
import { notifications } from '@/platform';
import { Button } from '@/ui/button';
import { ConfirmDialog } from '@/ui/confirm-dialog';
import { RadioGroup, RadioOption } from '@/ui/radio-group';
import { ScreenHeader, ScreenTitle } from '@/ui/screen-header';
import { showErrorToast } from '@/ui/toast';
import { useCurrentUser, useAuth } from '../auth/authContext';
import { SyncIndicator } from '../sync/SyncIndicator';
import { BackupSetting } from './BackupSetting';
import { FilesStorageSetting } from './FilesStorageSetting';
import { RetentionSetting } from './RetentionSetting';

// Ajustes (spec 7.7): tema, retención, alertas de vencimiento, diagnóstico de notificaciones
// (solo Android), etiquetas, respaldo, espacio de los archivos adjuntos, sincronización,
// cuenta y versión.

function Group({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-b border-line px-4 py-6 md:px-6">
      <h2 className="flex items-center gap-2 text-caption font-semibold tracking-wide text-muted uppercase [&_svg]:size-4">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

// Fila que abre una subpantalla: ícono, título, valor actual (a la derecha o debajo) y flecha.
function LinkRow({
  icon,
  label,
  value,
  description,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mx-2 flex min-h-12 items-center gap-3 rounded-sm px-2 py-1 text-left hover:bg-panel [&>svg:first-child]:size-5 [&>svg:first-child]:shrink-0 [&>svg:first-child]:text-muted"
    >
      {icon}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-body text-fg">{label}</span>
        {description ? <span className="text-body-sm text-muted">{description}</span> : null}
      </span>
      {value ? <span className="shrink-0 text-body-sm text-muted">{value}</span> : null}
      <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
    </button>
  );
}

export function SettingsScreen() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { signOut } = useAuth();
  const theme = useThemePreference();
  const sync = useSyncState();
  const { tags } = useTags();
  const settings = useSettings();
  const [syncing, setSyncing] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [pendingAtSignOut, setPendingAtSignOut] = useState(0);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSyncNow() {
    setSyncing(true);
    try {
      await syncNow();
    } finally {
      setSyncing(false);
    }
  }

  async function openSignOut() {
    // Si no se puede contar, se pregunta igual (sin el aviso de cambios pendientes).
    setPendingAtSignOut(await getPendingUploadCount().catch(() => 0));
    setConfirmSignOut(true);
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      logger.error('No se pudo cerrar la sesión', errorMeta(error));
      showErrorToast(es.errors.signOutFailed);
    } finally {
      setSigningOut(false);
      setConfirmSignOut(false);
    }
  }

  const lastSynced = sync.lastSyncedAt
    ? es.sync.lastSynced(
        formatDistanceToNow(sync.lastSyncedAt, { addSuffix: true, locale: esLocale }),
      )
    : es.sync.neverSynced;

  const signOutDescription =
    pendingAtSignOut > 0
      ? `${es.settings.signOutDescription} ${es.settings.signOutPendingWarning(pendingAtSignOut)}`
      : es.settings.signOutDescription;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScreenHeader onBack={() => navigate('/')}>
        <ScreenTitle>{es.settings.title}</ScreenTitle>
      </ScreenHeader>
      <div className="min-h-0 flex-1 overflow-y-auto pb-8">
        <div className="mx-auto w-full max-w-2xl">
          <Group title={es.settings.groupAppearance} icon={<Palette aria-hidden />}>
            <span id="theme-label" className="text-body text-fg">
              {es.settings.theme}
            </span>
            <RadioGroup
              aria-labelledby="theme-label"
              value={theme}
              onValueChange={(value) => setThemePreference(value as ThemePreference)}
            >
              <RadioOption value="system" label={es.settings.themeSystem} />
              <RadioOption value="light" label={es.settings.themeLight} />
              <RadioOption value="dark" label={es.settings.themeDark} />
            </RadioGroup>
          </Group>

          <Group title={es.settings.groupTasks} icon={<ListTodo aria-hidden />}>
            <RetentionSetting />
            <LinkRow
              icon={<Bell aria-hidden />}
              label={es.dueAlerts.title}
              description={
                settings.dueAlertsEnabled
                  ? es.dueAlerts.summary(settings.dueAlertOffsets, settings.dueAlertTime)
                  : es.dueAlerts.summaryOff
              }
              onClick={() => navigate('/settings/alerts')}
            />
            {notifications.isSupported() ? (
              <LinkRow
                icon={<BellRing aria-hidden />}
                label={es.notifications.title}
                description={es.notifications.rowSummary}
                onClick={() => navigate('/settings/notifications')}
              />
            ) : null}
            <LinkRow
              icon={<TagIcon aria-hidden />}
              label={es.settings.tags}
              value={es.tags.count(tags.length)}
              onClick={() => navigate('/settings/tags')}
            />
          </Group>

          <Group title={es.settings.groupData} icon={<Database aria-hidden />}>
            <BackupSetting />
            <FilesStorageSetting />
            <h3 className="mt-4 flex items-center gap-2 text-body font-medium text-fg [&_svg]:size-5 [&_svg]:text-muted">
              <Cloud aria-hidden />
              {es.settings.sync}
            </h3>
            <SyncIndicator className="text-body-sm" />
            <p className="text-body-sm text-muted">{es.sync.pendingChanges(sync.pending)}</p>
            <p className="text-body-sm text-muted">{lastSynced}</p>
            <div>
              <Button variant="secondary" onClick={() => void handleSyncNow()} disabled={syncing}>
                <RefreshCw className={syncing ? 'animate-spin' : undefined} />
                {es.sync.syncNow}
              </Button>
            </div>
          </Group>

          <Group title={es.settings.groupAccount} icon={<User aria-hidden />}>
            <div className="flex min-h-12 items-center justify-between gap-4">
              <span className="text-body text-muted">{es.settings.email}</span>
              <span className="truncate text-body text-fg">{user.email}</span>
            </div>
            <div>
              <Button variant="dangerGhost" onClick={() => void openSignOut()}>
                <LogOut />
                {es.settings.signOut}
              </Button>
            </div>
          </Group>

          <Group title={es.settings.about} icon={<Info aria-hidden />}>
            <p className="text-body-sm text-muted">{es.settings.version(APP_VERSION)}</p>
          </Group>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSignOut}
        onOpenChange={setConfirmSignOut}
        title={es.settings.signOutTitle}
        description={signOutDescription}
        confirmLabel={es.settings.signOut}
        onConfirm={() => void handleSignOut()}
        busy={signingOut}
      />
    </div>
  );
}
