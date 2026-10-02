import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './app/App';
import { applyTheme } from './app/theme';
import { lifecycle } from './platform';

// Aplica el tema antes de pintar para evitar un destello del tema equivocado.
applyTheme();

const container = document.getElementById('root');
if (!container) throw new Error('No se encontró el elemento raíz');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void lifecycle.hideSplash().catch(() => undefined);
