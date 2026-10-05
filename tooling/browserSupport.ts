import type { Plugin } from 'vite';

// Aviso para navegadores o WebView viejos. La app necesita, por lo menos, Chrome 111
// (Tailwind 4 usa color-mix) y structuredClone. Si el navegador es más viejo, los módulos de
// la app ni siquiera se ejecutan y quedaría una pantalla en blanco: este script clásico (sin
// sintaxis moderna) se carga antes y, si falta soporte, muestra cómo actualizar.
// Pasa en Android con "Android System WebView" sin actualizar (el emulador de Android 12 trae
// la versión 91).

export interface BrowserSupportTexts {
  title: string;
  android: string;
  web: string;
}

export const COMPAT_SCRIPT_NAME = 'compat.js';

export function buildCompatScript(texts: BrowserSupportTexts): string {
  const json = JSON.stringify(texts);
  return `(function () {
  var supported =
    typeof structuredClone === 'function' &&
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('color', 'color-mix(in srgb, red, blue)');
  if (supported) return;
  var texts = ${json};
  var cap = window.Capacitor;
  var native = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  function show() {
    var body = document.body;
    if (!body) return;
    while (body.firstChild) body.removeChild(body.firstChild);
    var box = document.createElement('main');
    box.setAttribute('role', 'alert');
    box.style.cssText = 'max-width:28rem;margin:20vh auto 0;padding:0 1rem;font-family:system-ui,sans-serif;line-height:1.5';
    var title = document.createElement('h1');
    title.style.cssText = 'font-size:1.25rem;margin:0 0 .5rem';
    title.textContent = texts.title;
    var text = document.createElement('p');
    text.style.cssText = 'margin:0';
    text.textContent = native ? texts.android : texts.web;
    box.appendChild(title);
    box.appendChild(text);
    body.appendChild(box);
    if (cap && cap.Plugins && cap.Plugins.SplashScreen) {
      try { cap.Plugins.SplashScreen.hide(); } catch (e) {}
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show);
  else show();
})();
`;
}

/** Solo en el build: agrega compat.js y lo carga antes del código de la app. */
export function browserSupport(texts: BrowserSupportTexts): Plugin {
  return {
    name: 'app-browser-support',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: COMPAT_SCRIPT_NAME,
        source: buildCompatScript(texts),
      });
    },
    transformIndexHtml(html) {
      return html.replace(
        '<script type="module"',
        `<script src="/${COMPAT_SCRIPT_NAME}"></script>\n    <script type="module"`,
      );
    },
  };
}
