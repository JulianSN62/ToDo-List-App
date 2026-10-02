// Identidad de la app en un solo lugar. Cambiar acá si se renombra.
// El appId también está en capacitor.config.ts (Android lo usa como nombre de paquete).
export const APP_NAME = 'ToDo List';
export const APP_ID = 'com.todolistapp.app';
export const APP_VERSION = __APP_VERSION__;

// Nombre del archivo de la base local en el dispositivo
export const LOCAL_DB_FILENAME = 'todo-list.db';

// Cantidad de dígitos del código de inicio de sesión. Debe coincidir con
// Supabase: Authentication -> Sign In / Providers -> Email -> Email OTP Length.
export const OTP_LENGTH = 8;
