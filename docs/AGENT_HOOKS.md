# Hooks del agente (Cursor)

Cursor bloqueó la escritura automática de `.cursor/hooks.json` en este entorno. Configúralo manualmente una vez:

## 1. Crear `.cursor/hooks.json`

```json
{
  "version": 1,
  "hooks": {
    "stop": [
      {
        "command": "node scripts/agent-session-finish.mjs",
        "timeout": 600
      }
    ]
  }
}
```

## 2. Verificar

- Abre **Cursor → Settings → Hooks** y confirma que aparece el hook `stop`.
- Al terminar una conversación del agente con cambios, debe ejecutarse `pnpm run check:utf8`, `pnpm run build`, commit y push a `agent/auto`.

## 3. Alternativa manual

Si prefieres no usar el hook automático:

```bash
pnpm run agent:finish
```

## 4. Antes de editar App.jsx

```bash
pnpm run snapshot:critical
```
