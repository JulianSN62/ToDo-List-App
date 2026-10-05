import {
  AlarmClock,
  BatteryCharging,
  Bell,
  CircleAlert,
  CircleCheck,
  CircleX,
  Send,
} from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { taskRepo, usePinnedTasks, wakeNotificationSync } from '@/data';
import { es } from '@/i18n/es';
import { errorMeta, logger } from '@/lib/logger';
import { TEST_NOTIFICATION_ID } from '@/lib/notificationPlan';
import {
  lifecycle,
  notifications,
  type NotificationDiagnostics,
  type NotificationSettingsTarget,
} from '@/platform';
import { useBackHandler } from '@/ui/backStack';
import { Button } from '@/ui/button';
import { ScreenHeader, ScreenTitle } from '@/ui/screen-header';
import { showErrorToast, showToast } from '@/ui/toast';

// Ajustes → Notificaciones (SET-6, solo Android): estado del permiso, de las alarmas exactas
// y de la optimización de batería, con acceso directo a cada ajuste del sistema, guía de
// batería, notificación de prueba y lista de tareas ancladas para desanclarlas.

type Status = 'ok' | 'warning' | 'error';

const STATUS_ICON: Record<Status, ReactNode> = {
  ok: (
    <CircleCheck
      role="img"
      aria-label={es.notifications.statusOk}
      className="size-5 text-success"
    />
  ),
  warning: (
    <CircleAlert
      role="img"
      aria-label={es.notifications.statusWarning}
      className="size-5 text-star"
    />
  ),
  error: (
    <CircleX role="img" aria-label={es.notifications.statusError} className="size-5 text-danger" />
  ),
};

function StatusRow({
  icon,
  title,
  status,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  status: Status;
  description: string;
  action?: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 border-b border-line py-4 last:border-b-0">
      <div className="flex items-start gap-3 [&>svg:first-child]:mt-0.5 [&>svg:first-child]:size-5 [&>svg:first-child]:shrink-0 [&>svg:first-child]:text-muted">
        {icon}
        <div className="min-w-0 flex-1">
          <p className="text-body text-fg">{title}</p>
          <p className="text-body-sm text-muted">{description}</p>
        </div>
        <span className="shrink-0">{STATUS_ICON[status]}</span>
      </div>
      {action ? <div className="pl-8">{action}</div> : null}
    </li>
  );
}

export function NotificationsScreen() {
  const navigate = useNavigate();
  const goBack = () => navigate('/settings');
  // Botón atrás de Android: vuelve a Ajustes.
  useBackHandler(true, goBack);
  const { tasks: pinned } = usePinnedTasks();
  const [diagnostics, setDiagnostics] = useState<NotificationDiagnostics | null>(null);
  const supported = notifications.isSupported();

  const refresh = useCallback(() => {
    notifications
      .getDiagnostics()
      .then(setDiagnostics)
      .catch((error: unknown) => {
        logger.warn('No se pudo leer el estado de las notificaciones', errorMeta(error));
      });
  }, []);

  // Al volver de los ajustes de Android se vuelve a leer el estado y se reprograma.
  useEffect(() => {
    if (!supported) return;
    refresh();
    return lifecycle.onResume(() => {
      refresh();
      wakeNotificationSync();
    });
  }, [refresh, supported]);

  function open(target: NotificationSettingsTarget) {
    notifications
      .openSettings(target)
      .then(() => {
        refresh();
        wakeNotificationSync();
      })
      .catch((error: unknown) => {
        logger.warn('No se pudo abrir el ajuste del sistema', errorMeta(error));
        showErrorToast();
      });
  }

  async function allow() {
    try {
      // Si Android ya no muestra el pedido (se negó antes), se abren los ajustes de la app.
      if ((await notifications.requestPermission()) !== 'granted') {
        open('notifications');
        return;
      }
      refresh();
      wakeNotificationSync();
    } catch (error) {
      logger.warn('No se pudo pedir el permiso de notificaciones', errorMeta(error));
      showErrorToast();
    }
  }

  async function sendTest() {
    try {
      if ((await notifications.getPermission()) !== 'granted') {
        showErrorToast(es.notifications.testFailed);
        return;
      }
      await notifications.sendTest({
        id: TEST_NOTIFICATION_ID,
        title: es.notifications.testTitle,
        body: es.notifications.testBody,
        channelId: 'reminders',
      });
      showToast(es.notifications.testSent);
    } catch (error) {
      logger.warn('No se pudo enviar la notificación de prueba', errorMeta(error));
      showErrorToast(es.notifications.testFailed);
    }
  }

  function unpin(taskId: string) {
    taskRepo.setPinned(taskId, false).catch((error: unknown) => {
      logger.error('No se pudo desanclar la tarea', errorMeta(error));
      showErrorToast();
    });
  }

  const openButton = (target: NotificationSettingsTarget) => (
    <Button variant="secondary" size="sm" onClick={() => open(target)}>
      {es.notifications.openSettings}
    </Button>
  );

  let content: ReactNode;
  if (!supported) {
    content = <p className="text-body-sm text-muted">{es.notifications.androidOnly}</p>;
  } else if (diagnostics) {
    const { permission, exactAlarms, battery } = diagnostics;
    content = (
      <>
        <ul className="flex flex-col">
          <StatusRow
            icon={<Bell aria-hidden />}
            title={es.notifications.permission}
            status={permission === 'granted' ? 'ok' : permission === 'prompt' ? 'warning' : 'error'}
            description={
              permission === 'granted'
                ? es.notifications.permissionOk
                : permission === 'prompt'
                  ? es.notifications.permissionPrompt
                  : es.notifications.permissionOff
            }
            action={
              permission === 'prompt' ? (
                <Button size="sm" onClick={() => void allow()}>
                  {es.notifications.allow}
                </Button>
              ) : permission === 'denied' ? (
                openButton('notifications')
              ) : null
            }
          />
          <StatusRow
            icon={<AlarmClock aria-hidden />}
            title={es.notifications.exactAlarms}
            status={exactAlarms === 'granted' ? 'ok' : 'warning'}
            description={
              exactAlarms === 'granted' ? es.notifications.exactOk : es.notifications.exactOff
            }
            action={exactAlarms === 'granted' ? null : openButton('exactAlarms')}
          />
          <StatusRow
            icon={<BatteryCharging aria-hidden />}
            title={es.notifications.battery}
            status={battery === 'unrestricted' ? 'ok' : 'warning'}
            description={
              battery === 'unrestricted'
                ? es.notifications.batteryOk
                : es.notifications.batteryWarning
            }
            action={openButton('battery')}
          />
        </ul>
        <p className="rounded-sm border border-line bg-panel p-3 text-body-sm text-muted">
          {es.notifications.batteryGuide}
        </p>
        <div>
          <Button variant="secondary" onClick={() => void sendTest()}>
            <Send />
            {es.notifications.sendTest}
          </Button>
        </div>
        <p className="text-body-sm text-muted">{es.notifications.forceStopNote}</p>
      </>
    );
  } else {
    content = null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScreenHeader onBack={goBack}>
        <ScreenTitle>{es.notifications.title}</ScreenTitle>
      </ScreenHeader>

      <div className="min-h-0 flex-1 overflow-y-auto pb-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:px-6">
          {content}

          {supported ? (
            <section aria-labelledby="pinned-title" className="flex flex-col gap-2">
              <h2 id="pinned-title" className="text-body font-medium text-fg">
                {es.notifications.pinnedTitle}
              </h2>
              {pinned.length === 0 ? (
                <p className="text-body-sm text-muted">{es.notifications.noPinned}</p>
              ) : (
                <ul className="flex flex-col">
                  {pinned.map((task) => (
                    <li key={task.id} className="flex min-h-12 items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-body text-fg">
                        {task.title}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={es.notifications.unpin(task.title)}
                        onClick={() => unpin(task.id)}
                      >
                        {es.reminders.menuUnpin}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
