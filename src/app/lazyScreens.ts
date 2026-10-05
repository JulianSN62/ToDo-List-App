import { lazyComponent } from './lazyComponent';

// Pantallas que se cargan a demanda. Carpetas (la de inicio) va en el código principal.
// Con la sesión abierta se cargan apenas el navegador está libre (así navegar no espera);
// el login, solo cuando hace falta.

export const TodayScreen = lazyComponent(() =>
  import('../features/today/TodayScreen').then((module) => module.TodayScreen),
);
export const SearchScreen = lazyComponent(() =>
  import('../features/search/SearchScreen').then((module) => module.SearchScreen),
);
export const SettingsScreen = lazyComponent(() =>
  import('../features/settings/SettingsScreen').then((module) => module.SettingsScreen),
);
export const DueAlertsScreen = lazyComponent(() =>
  import('../features/settings/DueAlertsScreen').then((module) => module.DueAlertsScreen),
);
export const NotificationsScreen = lazyComponent(() =>
  import('../features/settings/NotificationsScreen').then((module) => module.NotificationsScreen),
);
export const TagsScreen = lazyComponent(() =>
  import('../features/tags/TagsScreen').then((module) => module.TagsScreen),
);
export const LoginScreen = lazyComponent(
  () => import('../features/auth/LoginScreen').then((module) => module.LoginScreen),
  { preloadWhenIdle: false },
);
