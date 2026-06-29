# Sistema de registros VNPM

App React + Vite con Firebase (Firestore, Hosting, Cloud Functions).

## Requisitos

- Node.js 20+
- [pnpm](https://pnpm.io/installation) 10.x (recomendado: `corepack enable` y usar la versión de `packageManager` en `package.json`)

## Desarrollo

```bash
pnpm install
pnpm dev
```

## Scripts habituales

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Servidor de desarrollo Vite |
| `pnpm build` | Build de producción; sube el contador (`1.0.6.N` en la esquina) y escribe `dist/version.json` |
| `pnpm run check:utf8` | Valida UTF-8 en fuentes |
| `pnpm run lint` | ESLint |
| `pnpm run deploy:hosting` | Build + deploy Firebase Hosting |
| `pnpm run deploy:firestore` | Deploy reglas/índices Firestore |

Cloud Functions viven en `functions/` (mismo workspace pnpm). Tras cambiar dependencias allí: `pnpm install` en la raíz.

## Migración desde npm

Si tenías `node_modules` de npm, bórralos y reinstala:

```bash
Remove-Item -Recurse -Force node_modules, functions\node_modules -ErrorAction SilentlyContinue
pnpm install
```

No uses `package-lock.json` en este repo; el lockfile es `pnpm-lock.yaml`.
