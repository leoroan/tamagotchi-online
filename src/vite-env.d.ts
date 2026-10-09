/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  /**
   * Clave pública de Supabase. Reemplaza a la vieja "anon key" (deprecada por
   * Supabase): hoy se genera como "publishable key" (`sb_publishable_...`).
   */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Base path para GitHub Pages (ej: /tamagotchi-online/). */
  readonly VITE_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
