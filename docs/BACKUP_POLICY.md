# Política de respaldo y anti-regresión

## Fuente de verdad

- **GitHub:** `https://github.com/aldobucio95/sistema-registros`
- Rama `main`: versión estable.
- Rama `agent/auto`: snapshots automáticos del agente.

## Copias automáticas en Firestore / Storage

- **Diaria:** cada día a las **12:00 a.m. (hora local)** mientras un administrador tiene el panel abierto con sesión de staff (no anónima).
- Si nadie abre el panel a medianoche, la copia del día se ejecuta en la **primera sesión admin** del día (si aún no existe copia con id `YYYY-MM-DD`).
- **Antes de restaurar:** cualquier restauración (revertir un log, rollback masivo o copia completa) crea primero una copia con id `YYYY-MM-DD_pre-restore_<timestamp>`.
- JSON en Storage: `app_auto_backups/{id}.json`; manifest en `app_backups/{id}` (`formatVersion: 3`).
- Retención: **3 meses** (poda por fecha del id).

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
