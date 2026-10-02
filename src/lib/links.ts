import { LIMITS } from './validation';

// Links adjuntos a una tarea: solo direcciones http(s).
// Si se escribe un dominio sin protocolo (ej. "example.com"), se antepone https://.

const HTTP_PATTERN = /^https?:\/\//i;
const OTHER_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
// "algo:" al principio que no es un puerto (ej. "javascript:", "mailto:").
const BARE_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:(?!\d+(?:[/?#]|$))/i;

// Devuelve la URL lista para guardar, o null si no es válida.
export function normalizeLinkUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value || /\s/.test(value)) return null;

  let candidate: string;
  if (HTTP_PATTERN.test(value)) {
    candidate = value;
  } else if (OTHER_SCHEME_PATTERN.test(value) || BARE_SCHEME_PATTERN.test(value)) {
    return null;
  } else {
    candidate = `https://${value}`;
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const host = url.hostname;
  if (!host || (!host.includes('.') && host !== 'localhost' && !host.startsWith('['))) {
    return null;
  }
  const result = url.href;
  return result.length <= LIMITS.linkUrl ? result : null;
}

// Texto opcional del link: vacío se guarda como null.
export function normalizeLinkLabel(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  return value.slice(0, LIMITS.linkLabel);
}

// Texto para mostrar: la etiqueta o, si no tiene, el dominio y la ruta.
export function linkDisplayText(link: { url: string; label: string | null }): string {
  if (link.label) return link.label;
  try {
    const url = new URL(link.url);
    const host = url.hostname.replace(/^www\./, '');
    const rest = `${url.pathname}${url.search}`.replace(/\/$/, '');
    return `${host}${rest}`;
  } catch {
    return link.url;
  }
}
