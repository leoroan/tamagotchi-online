/**
 * Variables de entorno. En Vite TODO lo que empieza con VITE_ queda en el bundle,
 * así que acá solo va lo PÚBLICO: la URL de Supabase y la anon key.
 *
 * La anon key es pública por diseño: no da acceso a nada que no permitan las
 * políticas RLS de la base (ver supabase/migrations/0002_rls.sql).
 * Lo que NUNCA va en el front: la service_role key.
 */
export interface CloudConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
}

export const cloudConfig: CloudConfig = {
  url: import.meta.env.VITE_SUPABASE_URL ?? '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  get enabled(): boolean {
    return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
  },
};
