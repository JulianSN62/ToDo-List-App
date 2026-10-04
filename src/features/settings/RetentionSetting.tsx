import { Minus, Plus, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { settingsRepo, useStoredSettings } from '@/data';
import { es } from '@/i18n/es';
import { clampRetentionDays, RETENTION_LIMITS } from '@/lib/retention';
import { IconButton } from '@/ui/button';
import { useSettingDraft } from './useSettingDraft';

// Días que se conservan las tareas completadas (1 a 90). Cada toque se ve al instante;
// el valor se guarda tras una pausa corta para no encolar un cambio por cada toque.

const SAVE_DELAY_MS = 400;

const saveRetention = (days: number) => settingsRepo.updateRetentionDays(days);

export function RetentionSetting() {
  const stored = useStoredSettings();
  const { value, change: setValue } = useSettingDraft({
    stored: stored?.completedRetentionDays,
    fallback: RETENTION_LIMITS.default,
    save: saveRetention,
    delayMs: SAVE_DELAY_MS,
  });
  const available = stored !== null;
  const decreaseRef = useRef<HTMLButtonElement>(null);
  const increaseRef = useRef<HTMLButtonElement>(null);

  function change(step: number) {
    const next = clampRetentionDays(value + step);
    if (next === value) return;
    setValue(next);
    // Al llegar al límite el botón se deshabilita y perdería el foco: pasa al otro.
    if (next <= RETENTION_LIMITS.min) increaseRef.current?.focus();
    if (next >= RETENTION_LIMITS.max) decreaseRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-2 py-1">
      {/* En mobile el stepper va debajo del texto; desde 640px, a la derecha. */}
      <div className="flex items-start gap-3">
        <Trash2 aria-hidden className="mt-0.5 size-5 shrink-0 text-muted" />
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="min-w-0 flex-1">
            <p id="retention-label" className="text-body text-fg">
              {es.settings.retention}
            </p>
            <p className="text-body-sm text-muted">{es.settings.retentionHelp}</p>
          </div>
          <div role="group" aria-labelledby="retention-label" className="flex items-center gap-1">
            <IconButton
              ref={decreaseRef}
              variant="secondary"
              aria-label={es.settings.retentionDecrease}
              onClick={() => change(-1)}
              disabled={!available || value <= RETENTION_LIMITS.min}
            >
              <Minus />
            </IconButton>
            <output
              aria-live="polite"
              className="min-w-20 text-center text-title-sm font-semibold text-fg tabular-nums"
            >
              {es.settings.retentionValue(value)}
            </output>
            <IconButton
              ref={increaseRef}
              variant="secondary"
              aria-label={es.settings.retentionIncrease}
              onClick={() => change(1)}
              disabled={!available || value >= RETENTION_LIMITS.max}
            >
              <Plus />
            </IconButton>
          </div>
        </div>
      </div>
      {available ? null : (
        <p className="text-body-sm text-muted">{es.settings.retentionUnavailable}</p>
      )}
    </div>
  );
}
