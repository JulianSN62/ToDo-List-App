import { Minus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { settingsRepo, useStoredSettings } from '@/data';
import { es } from '@/i18n/es';
import { clampRetentionDays, RETENTION_LIMITS } from '@/lib/retention';
import { IconButton } from '@/ui/button';
import { showErrorToast } from '@/ui/toast';

// Días que se conservan las tareas completadas (1 a 90). Cada toque se ve al instante;
// el valor se guarda tras una pausa corta para no encolar un cambio por cada toque.

const SAVE_DELAY_MS = 400;

interface Draft {
  value: number;
  saved: boolean;
}

export function RetentionSetting() {
  const stored = useStoredSettings();
  const [draft, setDraft] = useState<Draft | null>(null);
  const pending = useRef<{ timer: number | undefined; value: number | null }>({
    timer: undefined,
    value: null,
  });

  // Cuando la base ya refleja lo guardado, se deja de mostrar el borrador.
  if (draft?.saved && stored?.completedRetentionDays === draft.value) {
    setDraft(null);
  }

  // Si se sale de la pantalla antes de la pausa, se guarda igual.
  useEffect(() => {
    const state = pending.current;
    return () => {
      if (state.timer === undefined || state.value === null) return;
      window.clearTimeout(state.timer);
      void settingsRepo.updateRetentionDays(state.value).catch(() => showErrorToast());
    };
  }, []);

  const available = stored !== null;
  const value = draft?.value ?? stored?.completedRetentionDays ?? RETENTION_LIMITS.default;

  function save(next: number) {
    pending.current.timer = undefined;
    pending.current.value = null;
    settingsRepo
      .updateRetentionDays(next)
      .then(() =>
        setDraft((current) => (current?.value === next ? { ...current, saved: true } : current)),
      )
      .catch(() => {
        setDraft(null);
        showErrorToast(es.settings.retentionSaveError);
      });
  }

  function change(step: number) {
    const next = clampRetentionDays(value + step);
    if (next === value) return;
    setDraft({ value: next, saved: false });
    window.clearTimeout(pending.current.timer);
    pending.current.value = next;
    pending.current.timer = window.setTimeout(() => save(next), SAVE_DELAY_MS);
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
