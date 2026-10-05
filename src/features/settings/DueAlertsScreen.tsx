import { Bell, Clock, Info } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { DEFAULT_SETTINGS, settingsRepo, useStoredSettings } from '@/data';
import { es } from '@/i18n/es';
import { DUE_ALERT_OFFSET_OPTIONS, isValidAlertTime, toggleOffset } from '@/lib/dueAlerts';
import { platform } from '@/platform';
import { useBackHandler } from '@/ui/backStack';
import { CheckboxRow } from '@/ui/checkbox';
import { Input } from '@/ui/input';
import { ScreenHeader, ScreenTitle } from '@/ui/screen-header';
import { Switch } from '@/ui/switch';
import { useNotificationPermission } from '../reminders/useNotificationPermission';
import { useSettingDraft } from './useSettingDraft';

// Ajustes -> Alertas de vencimiento (SET-3): activarlas, cuántos días antes avisar y a qué
// hora. Se puede configurar también desde la web (X85); los avisos los programa la app de
// Android. Siempre queda al menos un día marcado (X92).

const TIME_SAVE_DELAY_MS = 400;

const saveEnabled = (enabled: boolean) =>
  settingsRepo.updateDueAlerts({ dueAlertsEnabled: enabled });
const saveOffsets = (offsets: number[]) =>
  settingsRepo.updateDueAlerts({ dueAlertOffsets: offsets });
const saveTime = (time: string) => settingsRepo.updateDueAlerts({ dueAlertTime: time });

const sameOffsets = (a: number[], b: number[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

export function DueAlertsScreen() {
  const navigate = useNavigate();
  const stored = useStoredSettings();
  const goBack = () => navigate('/settings');
  // Botón atrás de Android: vuelve a Ajustes.
  useBackHandler(true, goBack);
  const askNotificationPermission = useNotificationPermission();

  const enabled = useSettingDraft({
    stored: stored?.dueAlertsEnabled,
    fallback: DEFAULT_SETTINGS.dueAlertsEnabled,
    save: saveEnabled,
  });
  const offsets = useSettingDraft({
    stored: stored?.dueAlertOffsets,
    fallback: DEFAULT_SETTINGS.dueAlertOffsets,
    save: saveOffsets,
    equals: sameOffsets,
  });
  const time = useSettingDraft({
    stored: stored?.dueAlertTime,
    fallback: DEFAULT_SETTINGS.dueAlertTime,
    save: saveTime,
    delayMs: TIME_SAVE_DELAY_MS,
  });
  // Texto del campo mientras se escribe: solo se guarda cuando es una hora completa.
  const [timeText, setTimeText] = useState<string | null>(null);

  // Hasta la primera sincronización no hay fila de configuración: el cambio se perdería.
  const available = stored !== null;
  const optionsDisabled = !available || !enabled.value;
  const onlyOne = offsets.value.length === 1;

  function changeTime(text: string) {
    setTimeText(text);
    if (isValidAlertTime(text)) time.change(text);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScreenHeader onBack={goBack}>
        <ScreenTitle>{es.dueAlerts.title}</ScreenTitle>
      </ScreenHeader>

      <div className="min-h-0 flex-1 overflow-y-auto pb-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:px-6">
          {platform.isNative ? null : (
            <p className="flex items-start gap-2 rounded-sm border border-line bg-panel p-3 text-body-sm text-muted">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
              {es.dueAlerts.androidOnly}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Bell aria-hidden className="size-5 shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <label htmlFor="due-alerts-enabled" className="text-body text-fg">
                {es.dueAlerts.enable}
              </label>
              <p className="text-body-sm text-muted">{es.dueAlerts.enableHelp}</p>
            </div>
            <Switch
              id="due-alerts-enabled"
              checked={enabled.value}
              onCheckedChange={(value) => {
                enabled.change(value);
                // Al activar las alertas se pide el permiso (spec 9.5).
                if (value) askNotificationPermission();
              }}
              disabled={!available}
            />
          </div>
          {available ? null : <p className="text-body-sm text-muted">{es.dueAlerts.unavailable}</p>}

          <section className="flex flex-col gap-1">
            <h2 id="due-alerts-offsets" className="text-body font-medium text-fg">
              {es.dueAlerts.notifyOn}
            </h2>
            <div role="group" aria-labelledby="due-alerts-offsets" className="-mx-2 flex flex-col">
              {DUE_ALERT_OFFSET_OPTIONS.map((option) => {
                const checked = offsets.value.includes(option);
                return (
                  <CheckboxRow
                    key={option}
                    label={es.dueAlerts.offset(option)}
                    checked={checked}
                    disabled={optionsDisabled || (checked && onlyOne)}
                    onCheckedChange={() => offsets.change(toggleOffset(offsets.value, option))}
                  />
                );
              })}
            </div>
            {onlyOne && !optionsDisabled ? (
              <p className="text-body-sm text-muted">{es.dueAlerts.keepOne}</p>
            ) : null}
          </section>

          <div className="flex items-center gap-3">
            <Clock aria-hidden className="size-5 shrink-0 text-muted" />
            <label htmlFor="due-alert-time" className="min-w-0 flex-1 text-body text-fg">
              {es.dueAlerts.time}
            </label>
            <div className="w-36 shrink-0">
              <Input
                id="due-alert-time"
                type="time"
                value={timeText ?? time.value}
                onChange={(event) => changeTime(event.target.value)}
                onBlur={() => setTimeText(null)}
                disabled={optionsDisabled}
                className="tabular-nums"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
