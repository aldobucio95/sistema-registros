/**
 * Remove getScope() destructure bindings that collide with function params
 * or with later const/let/var declarations in the same function body.
 */
import fs from 'fs';

function parseDestructureNames(inner) {
  const names = [];
  for (const part of inner.split(',')) {
    const t = part.trim();
    if (!t) continue;
    const rest = t.replace(/^\.\.\./, '');
    const alias = rest.split(/\s*=\s*/)[0].trim();
    const colon = alias.split(/\s*:\s*/);
    const binding = (colon[1] || colon[0] || '').trim();
    if (binding && /^[A-Za-z_$][\w$]*$/.test(binding)) names.push(binding);
  }
  return names;
}

function findMatchingBrace(src, openIdx) {
  let depth = 0;
  let inStr = null;
  let inLine = false;
  let inBlock = false;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (inLine) {
      if (c === '\n') inLine = false;
      continue;
    }
    if (inBlock) {
      if (c === '*' && n === '/') {
        inBlock = false;
        i++;
      }
      continue;
    }
    if (inStr) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '/' && n === '/') {
      inLine = true;
      i++;
      continue;
    }
    if (c === '/' && n === '*') {
      inBlock = true;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findMatchingParen(src, openIdx) {
  let depth = 0;
  let inStr = null;
  let inLine = false;
  let inBlock = false;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (inLine) {
      if (c === '\n') inLine = false;
      continue;
    }
    if (inBlock) {
      if (c === '*' && n === '/') {
        inBlock = false;
        i++;
      }
      continue;
    }
    if (inStr) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '/' && n === '/') {
      inLine = true;
      i++;
      continue;
    }
    if (c === '/' && n === '*') {
      inBlock = true;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function collectLocalBinds(body) {
  const binds = new Set();
  const withoutGetScope = body.replace(
    /const\s*\{[\s\S]*?\}\s*=\s*getScope\s*\(\s*\)\s*;/g,
    ''
  );
  let m;
  const re =
    /\b(?:const|let|var)\s+(?:(\{[^}]*\}|\[[^\]]*\])|([A-Za-z_$][\w$]*))/g;
  while ((m = re.exec(withoutGetScope))) {
    if (m[2]) binds.add(m[2]);
    else if (m[1]) {
      const inner = m[1].slice(1, -1);
      for (const n of parseDestructureNames(inner)) binds.add(n);
    }
  }
  const forRe =
    /\bfor\s*\(\s*(?:const|let|var)\s+(?:(\{[^}]*\}|\[[^\]]*\]|[A-Za-z_$][\w$]*))\s+(?:of|in)/g;
  while ((m = forRe.exec(withoutGetScope))) {
    const token = m[1];
    if (token.startsWith('{') || token.startsWith('[')) {
      for (const n of parseDestructureNames(token.slice(1, -1))) binds.add(n);
    } else binds.add(token);
  }
  const catchRe = /\bcatch\s*\(\s*([A-Za-z_$][\w$]*)/g;
  while ((m = catchRe.exec(withoutGetScope))) binds.add(m[1]);
  return binds;
}

function parseParamNames(paramSrc) {
  const names = new Set();
  let depth = 0;
  let cur = '';
  const parts = [];
  for (let i = 0; i < paramSrc.length; i++) {
    const c = paramSrc[i];
    if (c === '{' || c === '[' || c === '(') depth++;
    if (c === '}' || c === ']' || c === ')') depth--;
    if (c === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  if (cur.trim()) parts.push(cur);
  for (let p of parts) {
    p = p.trim().replace(/^\.\.\./, '');
    if (!p) continue;
    if (p.startsWith('{')) {
      const end = p.lastIndexOf('}');
      const inner = end > 0 ? p.slice(1, end) : p.slice(1);
      for (const n of parseDestructureNames(inner)) names.add(n);
    } else if (p.startsWith('[')) {
      const end = p.lastIndexOf(']');
      const inner = end > 0 ? p.slice(1, end) : p.slice(1);
      for (const n of parseDestructureNames(inner)) names.add(n);
    } else {
      const id = p.split(/\s*=\s*/)[0].trim().split(/\s+/)[0];
      if (/^[A-Za-z_$][\w$]*$/.test(id)) names.add(id);
    }
  }
  return names;
}

function stripConflictsFromGetScope(body, ban) {
  return body.replace(
    /const\s*\{([\s\S]*?)\}\s*=\s*getScope\s*\(\s*\)\s*;/g,
    (_full, inner) => {
      const kept = [];
      let depth = 0;
      let cur = '';
      for (let i = 0; i < inner.length; i++) {
        const c = inner[i];
        if (c === '{' || c === '[') depth++;
        if (c === '}' || c === ']') depth--;
        if (c === ',' && depth === 0) {
          kept.push(cur);
          cur = '';
          continue;
        }
        cur += c;
      }
      if (cur.trim()) kept.push(cur);
      const filtered = kept.filter((part) => {
        const t = part.trim();
        if (!t) return false;
        const rest = t.replace(/^\.\.\./, '');
        const alias = rest.split(/\s*=\s*/)[0].trim();
        const colon = alias.split(/\s*:\s*/);
        const binding = (colon[1] || colon[0] || '').trim();
        return binding && !ban.has(binding);
      });
      if (!filtered.length) return '/* getScope bindings removed (all collided) */';
      return `const { ${filtered.map((x) => x.trim()).join(', ')} } = getScope();`;
    }
  );
}

/** Find every `{` body that starts right after `) =>` or `function (...)` and contains getScope. */
function listGetScopeFunctions(src) {
  const out = [];
  const seen = new Set();

  const tryAdd = (paramSrc, openBrace, name) => {
    const close = findMatchingBrace(src, openBrace);
    if (close < 0) return;
    const body = src.slice(openBrace + 1, close);
    if (!body.includes('getScope()')) return;
    const key = openBrace + ':' + close;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      openBrace,
      close,
      params: parseParamNames(paramSrc),
      name,
      bodyLen: close - openBrace,
    });
  };

  // function name(params) {
  for (let i = 0; i < src.length; i++) {
    if (!src.startsWith('function', i)) continue;
    if (i > 0 && /[A-Za-z0-9_$]/.test(src[i - 1])) continue;
    let j = i + 8;
    while (j < src.length && /\s/.test(src[j])) j++;
    // optional name
    let name = '(anon)';
    if (/[A-Za-z_$]/.test(src[j])) {
      const start = j;
      while (j < src.length && /[A-Za-z0-9_$]/.test(src[j])) j++;
      name = src.slice(start, j);
    }
    while (j < src.length && /\s/.test(src[j])) j++;
    if (src[j] !== '(') continue;
    const closeParen = findMatchingParen(src, j);
    if (closeParen < 0) continue;
    const paramSrc = src.slice(j + 1, closeParen);
    let k = closeParen + 1;
    while (k < src.length && /\s/.test(src[k])) k++;
    if (src[k] !== '{') continue;
    tryAdd(paramSrc, k, name);
  }

  // (params) => {   including async (params) => {
  for (let i = 0; i < src.length; i++) {
    if (src[i] !== '(') continue;
    // skip if this `(` is part of `getScope()`
    if (src.slice(Math.max(0, i - 8), i) === 'getScope') continue;
    const closeParen = findMatchingParen(src, i);
    if (closeParen < 0) continue;
    let k = closeParen + 1;
    while (k < src.length && /\s/.test(src[k])) k++;
    if (!(src[k] === '=' && src[k + 1] === '>')) continue;
    k += 2;
    while (k < src.length && /\s/.test(src[k])) k++;
    if (src[k] !== '{') continue;
    const paramSrc = src.slice(i + 1, closeParen);
    // skip empty huge false positives? still ok if has getScope
    tryAdd(paramSrc, k, '(arrow)');
  }

  return out;
}

function fixFile(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  let total = 0;
  let guard = 0;
  while (guard++ < 8000) {
    const candidates = listGetScopeFunctions(src)
      .map((f) => {
        const body = src.slice(f.openBrace + 1, f.close);
        const locals = collectLocalBinds(body);
        const ban = new Set([...f.params, ...locals]);
        const newBody = stripConflictsFromGetScope(body, ban);
        return { ...f, body, newBody, needs: newBody !== body };
      })
      .filter((f) => f.needs)
      .sort((a, b) => a.bodyLen - b.bodyLen);
    if (!candidates.length) break;
    const f = candidates[0];
    src = src.slice(0, f.openBrace + 1) + f.newBody + src.slice(f.close);
    total++;
  }
  fs.writeFileSync(filePath, src);
  return total;
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node fix-getscope-redeclarations.mjs <file>...');
  process.exit(1);
}
for (const f of files) {
  const n = fixFile(f);
  console.log(`fixed ${n} function bodies in ${f}`);
}
