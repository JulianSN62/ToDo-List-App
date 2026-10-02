import { Browser } from '@capacitor/browser';
import type { ExternalLinkService } from '../types';

// Android: el link se abre en el navegador del sistema (Custom Tabs), fuera del WebView.
// Al cerrarlo se vuelve a la app.
export const capacitorLinks: ExternalLinkService = {
  async open(url) {
    await Browser.open({ url });
  },
};
