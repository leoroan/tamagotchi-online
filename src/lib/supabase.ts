/**
 * CLIENTE DE SUPABASE — STUB DE FASE 4.
 *
 * Está vacío a propósito: todavía no queremos arrastrar la dependencia ni
 * pedirte que crees un proyecto antes de que el juego se pueda jugar.
 *
 * Cuando llegue la Fase 4:
 *   1) `npm i @supabase/supabase-js`
 *   2) crear `.env.local` con VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY
 *      (la vieja "anon key" quedó deprecada por Supabase)
 *   3) descomentar el código de abajo
 *   4) correr las migraciones de `supabase/migrations/` en el SQL editor
 *
 * El resto de la app NO importa este archivo directamente: habla con
 * `lib/sync.ts`, que tiene una interfaz estable ("guardar", "cargar").
 */

import { cloudConfig } from './env';

export function isCloudEnabled(): boolean {
  return cloudConfig.enabled;
}

export const SUPABASE_SETUP_HINT =
  'Fase 4 pendiente: npm i @supabase/supabase-js y configurar VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY.';

// ─── Cuando toque, el archivo queda así (dejado como referencia) ───────────────
// import { createClient } from '@supabase/supabase-js';
// export const supabase = createClient(cloudConfig.url, cloudConfig.publishableKey, {
//   auth: { persistSession: true, autoRefreshToken: true },
// });
//
// export async function signInWithMagicLink(email: string) {
//   return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
// }
