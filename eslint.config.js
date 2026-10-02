import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    'dist',
    'dev-dist',
    'coverage',
    'android',
    'design',
    'docs',
    'powersync',
    'node_modules',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      // Nada de logs con datos: solo advertencias y errores mediante src/lib/logger.ts.
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['tooling/**/*.ts', 'scripts/**/*.mjs', '*.config.{ts,js}', 'capacitor.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Edge Functions (Deno) y sus pruebas: se ejecutan en el servidor, no en el navegador.
    files: ['supabase/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node, Deno: 'readonly' },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['src/ui/**/*.tsx'],
    rules: {
      // Los componentes base exportan también sus variantes de estilo.
      'react-refresh/only-export-components': 'off',
    },
  },
]);
