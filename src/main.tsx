import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './app/App';
import { reloadAfterChunkError } from './app/lazyComponent';
import { applyTheme } from './app/theme';
import { errorMeta, logger } from './lib/logger';
import { lifecycle } from './platform';

// Aplica el tema antes de pintar para evitar un destello del tema equivocado.
applyTheme();

// Una pestaña abierta antes de publicar una versión nueva puede pedir partes que ya no
// existen: se recarga una sola vez (las pantallas diferidas lo hacen en lazyComponent).
window.addEventListener('vite:preloadError', (event) => {
  if (reloadAfterChunkError(event.payload)) event.preventDefault();
});

const container = document.getElementById('root');
if (!container) throw new Error('No se encontró el elemento raíz');

// Solo en el build de los tests E2E (el de producción lo descarta por completo).
if (import.meta.env.MODE === 'e2e') {
  void import('./data/e2eSeed').then((module) => module.installE2eSeed());
}

// Errores que no maneja ninguna pantalla: quedan registrados con datos técnicos solamente
// (nunca el contenido de las tareas). El navegador también los muestra en la consola.
window.addEventListener('unhandledrejection', (event) => {
  logger.warn('Promesa rechazada sin manejar', errorMeta(event.reason));
});

createRoot(container, {
  onUncaughtError: (error) => logger.error('Error sin capturar en la interfaz', errorMeta(error)),
  onCaughtError: (error) => logger.error('Error capturado en la interfaz', errorMeta(error)),
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void lifecycle.hideSplash().catch(() => undefined);
