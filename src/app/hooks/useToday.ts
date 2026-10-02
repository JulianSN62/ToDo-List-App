import { useEffect, useState } from 'react';
import { todayLocalDate } from '@/lib/dates';
import { lifecycle } from '@/platform';

// Día local actual (YYYY-MM-DD). Se actualiza a la medianoche y al volver a primer plano.
export function useToday(): string {
  const [today, setToday] = useState(() => todayLocalDate());

  useEffect(() => {
    const refresh = () => setToday(todayLocalDate());
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const timer = window.setTimeout(refresh, nextMidnight.getTime() - now.getTime());
    const unsubscribe = lifecycle.onResume(refresh);
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [today]);

  return today;
}
