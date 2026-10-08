import { cloudConfig } from '@/lib/env';
import { SUPABASE_SETUP_HINT } from '@/lib/supabase';

/**
 * STUB DE FASE 4: login con Supabase (magic link).
 *
 * No se implementa todavía a propósito: primero el juego tiene que ser divertido
 * en un solo navegador. Este panel queda visible para que sepas dónde va.
 *
 * Cuando toque, acá va:
 *   - input de email + botón "mandame el link"
 *   - estado de sesión
 *   - botón "sincronizar ahora" y última sincronización
 */
export function AuthPanel() {
  return (
    <section className="panel panel--stub">
      <header className="panel__header">
        <h2>Cuenta y nube</h2>
        <span className={`badge badge--${cloudConfig.enabled ? 'alive' : 'dead'}`}>
          {cloudConfig.enabled ? 'configurada' : 'sin configurar'}
        </span>
      </header>
      <p className="muted">
        Ahora mismo tu mascota vive en <strong>este navegador</strong> (localStorage). No se pierde al cerrar, pero no
        viaja entre dispositivos.
      </p>
      <p className="muted">{SUPABASE_SETUP_HINT}</p>
      <p className="muted">
        Plan: login por magic link, una fila por mascota en Postgres, RLS para que cada uno vea solo lo suyo, y sync
        con debounce (last-write-wins). Detalle completo en <code>docs/04-modelo-de-datos.md</code>.
      </p>
    </section>
  );
}
