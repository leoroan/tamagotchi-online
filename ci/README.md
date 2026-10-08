# Workflows listos para copiar

Estos dos archivos son los workflows de GitHub Actions del proyecto, pero viven
acá y no en `.github/workflows/` por un motivo práctico: el commit inicial se hizo
con una credencial de bot **sin permiso de `workflows`**, así que GitHub rechaza
cualquier push que cree archivos en `.github/workflows/`.

## Activarlos (1 minuto, una sola vez)

```bash
mkdir -p .github/workflows
cp ci/deploy-pages.yml .github/workflows/deploy.yml
cp ci/ci.yml .github/workflows/ci.yml
git add .github/workflows && git commit -m "chore: activar CI y deploy a Pages" && git push
```

Después, en GitHub: **Settings → Pages → Source: GitHub Actions**.

## Qué hace cada uno

| Archivo | Cuándo corre | Qué hace |
|---|---|---|
| `ci.yml` | push a cualquier rama menos `main`, y PRs | `npm ci`, typecheck, tests y build |
| `deploy-pages.yml` | push a `main` (o a mano) | typecheck + tests + build con `VITE_BASE=/<repo>/` y deploy a Pages |

El detalle de por qué el `base` de Vite es crítico está en
[`docs/06-hosting-gh-pages.md`](../docs/06-hosting-gh-pages.md).
