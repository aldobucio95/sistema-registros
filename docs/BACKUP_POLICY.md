# Política de respaldo y anti-regresión

## Fuente de verdad

- **GitHub:** `https://github.com/aldobucio95/sistema-registros`
- Rama `main`: versión estable.
- Rama `agent/auto`: snapshots automáticos del agente.

## No usar para recuperación

- Carpeta `_backups/` en el directorio padre (copias históricas, pueden ser más viejas que `main`).
- `src/app_respaldo.txt`

## Recuperación tras crash

1. `git checkout -- src/App.jsx` (u otro archivo)
2. O copiar desde `.local-snapshots/<fecha>/`

## Comandos útiles

| Comando | Qué hace |
|---------|----------|
| `pnpm run snapshot:critical` | Respaldo local pre-edición |
| `pnpm run agent:finish` | UTF-8 + build + commit + push a `agent/auto` |
| `pnpm run check:invariants` | Detecta regresiones conocidas (chips, truncamiento) |
| `pnpm run test` | Tests unitarios Vitest |

Ver también [AGENT_HOOKS.md](./AGENT_HOOKS.md).
