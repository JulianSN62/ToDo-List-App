import { useEffect, useRef, useState } from 'react';
import { es } from '@/i18n/es';
import { showErrorToast } from '@/ui/toast';

// Ajuste sincronizado que se edita en pantalla: el cambio se ve al instante y se guarda
// enseguida o tras una pausa (delayMs), para no encolar un cambio por cada toque. Si se sale
// de la pantalla antes de la pausa, se guarda igual. Cuando la base ya refleja lo guardado,
// se vuelve a mostrar el valor de la base (así también llegan los cambios de otro dispositivo).

interface Draft<T> {
  value: T;
  saved: boolean;
}

interface Options<T> {
  /** Valor guardado; undefined mientras la configuración no se descargó. */
  stored: T | undefined;
  fallback: T;
  /** Tiene que ser estable (definida fuera del componente). */
  save: (value: T) => Promise<void>;
  delayMs?: number;
  equals?: (a: T, b: T) => boolean;
}

export function useSettingDraft<T>({
  stored,
  fallback,
  save,
  delayMs = 0,
  equals = Object.is,
}: Options<T>): { value: T; change: (next: T) => void } {
  const [draft, setDraft] = useState<Draft<T> | null>(null);
  const pending = useRef<{ timer: number | undefined; next: { value: T } | null }>({
    timer: undefined,
    next: null,
  });

  if (draft?.saved && stored !== undefined && equals(stored, draft.value)) {
    setDraft(null);
  }

  useEffect(() => {
    const state = pending.current;
    return () => {
      if (state.timer === undefined || state.next === null) return;
      window.clearTimeout(state.timer);
      void save(state.next.value).catch(() => showErrorToast(es.settings.saveError));
    };
  }, [save]);

  function persist(value: T) {
    pending.current.timer = undefined;
    pending.current.next = null;
    save(value)
      .then(() =>
        setDraft((current) =>
          current && equals(current.value, value) ? { ...current, saved: true } : current,
        ),
      )
      .catch(() => {
        setDraft(null);
        showErrorToast(es.settings.saveError);
      });
  }

  function change(next: T) {
    setDraft({ value: next, saved: false });
    window.clearTimeout(pending.current.timer);
    if (delayMs <= 0) {
      persist(next);
      return;
    }
    pending.current.next = { value: next };
    pending.current.timer = window.setTimeout(() => persist(next), delayMs);
  }

  return { value: draft?.value ?? stored ?? fallback, change };
}
