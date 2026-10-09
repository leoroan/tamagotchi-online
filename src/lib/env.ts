/**
 * Variables de entorno. En Vite TODO lo que empieza con VITE_ queda en el bundle,
 * así que acá solo va lo PÚBLICO: la URL de Supabase y la publishable key.
 *
 * La publishable key es pública por diseño: no da acceso a nada que no permitan
 * las políticas RLS de la base (ver supabase/migrations/0002_rls.sql).
 *
 * Ojo: Supabase deprecó la "anon key". La reemplaza la publishable key
 * (`VITE_SUPABASE_PUBLISHABLE_KEY`, formato `sb_publishable_...`).
 * Lo que NUNCA va en el front: la secret key / service_role.
 */
export interface CloudConfig {
  url: string;
  publishableKey: string;
  enabled: boolean;
}

export const cloudConfig: CloudConfig = {
  url: import.meta.env.VITE_SUPABASE_URL ?? '',
  publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
  get enabled(): boolean {
    return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  },
};
