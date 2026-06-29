/**
 * Se ejecuta una vez al final de `pnpm run build` (después de `vite build`).
 * Persiste el contador en `.vite-build-state.json` sin depender de cuántas veces Vite
 * evalúe la config o dispare `closeBundle` (workers / Rolldown pueden disparar varias veces).
 */
import {
  persistBuildSeqAfterProductionBuild,
  readPackageSemver,
} from './vite-build-version.mjs'

const APP_SEMVER = readPackageSemver()
const next = persistBuildSeqAfterProductionBuild(APP_SEMVER)
console.log(`[persist-vite-build-seq] ${APP_SEMVER} → buildSeq ${next} (guardado en .vite-build-state.json)`)
