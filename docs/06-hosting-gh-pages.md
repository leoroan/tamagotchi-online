# Hosting en GitHub Pages

## Por qué Pages y no Vercel

| | GitHub Pages | Vercel |
|---|---|---|
| Costo | gratis | gratis (hobby) |
| Deploy | push a main + Action | push a main |
| Preview por PR | no | sí |
| Funciones serverless propias | no | sí |
| Dominio propio | sí | sí |
| **Lo que necesitás** | sitio estático + Supabase | ídem |

Para este proyecto Pages alcanza porque **el backend es Supabase** (externo). Si algún
día necesitás funciones propias (por ejemplo, generar imágenes de las mascotas),
Supabase Edge Functions cubre ese hueco sin cambiar de hosting.

## Los 3 problemas clásicos (y la solución aplicada)

### 1. Página en blanco, assets 404

Pages sirve el sitio en `https://usuario.github.io/tamagotchi-online/`. Si el `base`
de Vite es `/`, el HTML pide `/assets/index-xxx.js` y recibe 404.

**Solución (ya implementada):**
```ts
// vite.config.ts
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',   // local: '/', Pages: '/tamagotchi-online/'
  ...
});
```
```yaml
# ci/deploy-pages.yml
env:
  VITE_BASE: /${{ github.event.repository.name }}/
```
Si un día usás dominio propio, `VITE_BASE` pasa a `/` (o lo dejás vacío).

### 2. Rutas SPA dan 404

Pages no reescribe rutas: `/pet/abc` busca un archivo que no existe.

**Solución (ya implementada):** `public/404.html` guarda la ruta pedida en el query
(`?/pet/abc`) y vuelve a `index.html`, que la reinyecta con `history.replaceState`.
Ese par de scripts ya está en el repo y es la técnica estándar (`spa-github-pages`).

> Ojo con `segmentCount`: es `1` para project pages (`/repo/`) y `0` si algún día
> pasás a `usuario.github.io` o dominio propio.

### 3. "En mi máquina anda" y el CI falla

- El workflow usa **Node 22** y `npm ci` (instala exactamente lo del lockfile).
- `package-lock.json` **va al repo** (sin él, `npm ci` falla).
- Si tu Node local es más nuevo, no pasa nada: `engines` no está fijado a propósito.

## Activar el deploy (una sola vez)

1. **Settings → Pages → Source: GitHub Actions**.
2. Copiar los workflows:
   ```bash
   mkdir -p .github/workflows
   cp ci/deploy-pages.yml .github/workflows/deploy.yml
   cp ci/ci.yml .github/workflows/ci.yml
   git add .github/workflows && git commit -m "chore: activar CI y deploy" && git push
   ```
3. Push a `main` (o correr el workflow a mano) y listo:
   `https://<usuario>.github.io/<repo>/`.

> Los workflows están en `ci/` y no en `.github/workflows/` porque el commit inicial
> se hizo con una credencial de bot sin permiso de `workflows`. Ver `ci/README.md`.

## Variables de entorno

| Variable | Cuándo | Dónde |
|---|---|---|
| `VITE_BASE` | build de Pages | workflow |
| `VITE_SUPABASE_URL` | Fase 4 | **Secret** del repo + workflow |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Fase 4 | **Secret** del repo + workflow |

Reglas:
- Todo lo `VITE_*` **queda en el bundle**: son valores públicos. La publishable key lo es por
  diseño (RLS protege los datos). Supabase **deprecó** la vieja `anon key`: hoy se usa la
  publishable key (`sb_publishable_...`).
- `SUPABASE_SERVICE_ROLE_KEY` **nunca** en el front ni en un `VITE_*`.
- Para desarrollo local: `.env.local` (ignorado por git). Plantilla en `.env.example`.

## Dominio propio

1. Comprar el dominio (ej: `tamagotchi.midominio.com`).
2. En el repo: crear `public/CNAME` con una línea: `tamagotchi.midominio.com`.
3. En el DNS del dominio: `CNAME tamagotchi -> <usuario>.github.io`.
4. Settings → Pages → Custom domain → guardar y activar HTTPS.
5. **Ojo:** con dominio propio el sitio queda en la raíz → `VITE_BASE` debe ser `/` y
   `segmentCount` del 404 pasa a `0`.

## Caché y actualizaciones

- Vite hashea los nombres de los assets (`index-De56NFW7.css`), así que los archivos
  viejos nunca se sirven por error.
- `index.html` no está hasheado: GitHub Pages lo sirve con caché corta, así que un
  deploy nuevo se ve en el primer refresh (a veces hay que forzar `Ctrl+Shift+R`).
- Si agregás PWA (Fase 6), usá `vite-plugin-pwa` con `registerType: 'autoUpdate'`:
  sin eso, los jugadores quedan pegados a una versión vieja durante días.

## Checklist antes del primer deploy público

- [ ] `npm run typecheck && npm test && npm run build` en verde
- [ ] `VITE_BASE` correcto para el tipo de hosting
- [ ] `public/404.html` presente (rutas SPA)
- [ ] favicon y `<title>` decentes (es la pestaña que van a ver)
- [ ] probar en el celular (la carcasa y los paneles se apilan bien)
- [ ] probar el flujo de "cerrar pestaña y volver" (persistencia real)
- [ ] si hay Supabase: RLS probado **con dos usuarios distintos**
