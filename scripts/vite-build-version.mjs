/**
 * Contador de build por semver (`package.json` version → buildSeq en `.vite-build-state.json`).
 * Compartido entre `vite.config.js` y `scripts/persist-vite-build-seq.mjs`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const projectRoot = path.join(__dirname, '..')
export const BUILD_STATE_FILE = path.join(projectRoot, '.vite-build-state.json')
export const LEGACY_SEQ_FILE = path.join(projectRoot, '.vite-build-seq')

export function readPackageSemver() {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))
  return String(pkg.version || '0.0.0')
}

export function readBuildState() {
  try {
    const raw = fs.readFileSync(BUILD_STATE_FILE, 'utf8')
    const data = JSON.parse(raw)
    if (data && typeof data.byVersion === 'object' && data.byVersion !== null) {
      return { byVersion: { ...data.byVersion } }
    }
  } catch {
    /* nuevo o corrupto */
  }
  return { byVersion: {} }
}

export function writeBuildState(state) {
  fs.writeFileSync(BUILD_STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

function migrateLegacyIfNeeded(state, semver) {
  if (!fs.existsSync(LEGACY_SEQ_FILE)) return false
  let changed = false
  try {
    const n = parseInt(String(fs.readFileSync(LEGACY_SEQ_FILE, 'utf8')).trim(), 10)
    if (Number.isFinite(n) && n >= 0 && state.byVersion[semver] == null) {
      state.byVersion[semver] = n
      changed = true
    }
  } catch {
    /* ignore */
  }
  try {
    fs.unlinkSync(LEGACY_SEQ_FILE)
  } catch {
    /* ignore */
  }
  return changed
}

export function getStoredBuildSeq(semver = readPackageSemver()) {
  const state = readBuildState()
  if (migrateLegacyIfNeeded(state, semver)) {
    writeBuildState(state)
  }
  const prev = state.byVersion[semver]
  return Number.isFinite(Number(prev)) && Number(prev) >= 0 ? Math.floor(Number(prev)) : 0
}

/** Seq que debe embeberse en el bundle de este `vite build`. */
export function resolveBuildSeqForProductionBuild(semver = readPackageSemver()) {
  return getStoredBuildSeq(semver) + 1
}

/** Persiste el seq usado en el build que acaba de terminar (`pnpm run build`). */
export function persistBuildSeqAfterProductionBuild(semver = readPackageSemver()) {
  const next = resolveBuildSeqForProductionBuild(semver)
  const state = readBuildState()
  if (migrateLegacyIfNeeded(state, semver)) {
    writeBuildState(state)
  }
  state.byVersion[semver] = next
  writeBuildState(state)
  return next
}

export function formatDisplayVersion(semver, buildSeq) {
  return buildSeq > 0 ? `${semver}.${buildSeq}` : `${semver}-dev`
}

/** Detecta build de producción aunque el runner sea pnpm/npm/yarn. */
export function isProductionBuildCommand(command) {
  if (command === 'build') return true
  if (process.env.npm_lifecycle_event === 'build') return true
  return process.argv.some((arg) => arg === 'build' || arg.endsWith('/build') || arg.endsWith('\\build'))
}
