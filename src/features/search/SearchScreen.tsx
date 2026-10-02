import { useNavigate } from 'react-router';
import { es } from '@/i18n/es';
import { ScreenHeader, ScreenTitle } from '@/ui/screen-header';
import { SyncIndicator } from '../sync/SyncIndicator';
import { SearchPanel } from './SearchPanel';

// Pantalla Buscar (pestaña en mobile y acceso de la barra lateral en desktop).
export function SearchScreen() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScreenHeader
        onBack={() => navigate('/')}
        actions={<SyncIndicator variant="compact" className="mr-2" />}
      >
        <ScreenTitle>{es.search.title}</ScreenTitle>
      </ScreenHeader>
      <SearchPanel variant="screen" />
    </div>
  );
}
