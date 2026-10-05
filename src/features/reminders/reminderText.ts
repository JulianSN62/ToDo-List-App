import { es } from '@/i18n/es';
import { formatInstantShort } from '@/lib/dates';
import { upcomingTimes } from '@/lib/reminders';

/** Cuántas fechas se muestran por recordatorio antes de "y N más". */
const VISIBLE_TIMES = 2;

/** Texto de las próximas fechas: "Mañana 09:00, sáb 10 oct 18:00 y 1 más". */
export function reminderTimesText(times: readonly { fireAt: string }[], now = new Date()): string {
  const upcoming = upcomingTimes(times, now);
  return es.reminders.timesSummary(
    upcoming.slice(0, VISIBLE_TIMES).map((time) => formatInstantShort(time.fireAt, now)),
    Math.max(0, upcoming.length - VISIBLE_TIMES),
  );
}
