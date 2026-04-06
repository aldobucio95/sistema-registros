/**
 * Falla si algún archivo de texto del proyecto tiene UTF-8 inválido o U+FFFD (carácter de reemplazo).
 * Uso: node scripts/validate-utf8.mjs
 */
import { readdir, readFile, stat } from 'fs/promises';
import { join, extname, relative } from 'path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.firebase']);
const EXT = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.css', '.html', '.json', '.md', '.svg', '.txt']);
const ROOT_FILES = new Set(['index.html', 'vite.config.js', 'vite.config.ts', 'eslint.config.js', 'postcss.config.js', 'tailwind.config.js']);

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      await walk(p, out);
    } else {
      const ext = extname(e.name);
      if (EXT.has(ext)) out.push(p);
    }
  }
  return out;
}

async function main() {
  const files = await walk(join(ROOT, 'src'));
  for (const name of ROOT_FILES) {
    const p = join(ROOT, name);
    try {
      if ((await stat(p)).isFile()) files.push(p);
    } catch {
      /* optional */
    }
  }

  let failed = false;
  for (const abs of files) {
    const buf = await readFile(abs);
    let text;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
    } catch (err) {
      console.error(`Invalid UTF-8: ${relative(ROOT, abs)}`, err.message);
      failed = true;
      continue;
    }
    if (text.includes('\uFFFD')) {
      console.error(`U+FFFD (replacement char) in ${relative(ROOT, abs)} — file was likely saved with wrong encoding.`);
      failed = true;
    }
  }

  if (failed) {
    process.exit(1);
  }
  console.log(`UTF-8 OK (${files.length} files checked).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
