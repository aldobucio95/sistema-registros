import fs from 'fs';
import * as esbuild from 'esbuild';

const p = 'src/features/locationRoster/NewRegistrationModal.jsx';
const s = fs.readFileSync(p, 'utf8');
const lines = s.split(/\n/);
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (
    /[a-zA-Z]=\s+className/.test(l) ||
    /[a-zA-Z]=\s*>/.test(l) ||
    /[a-zA-Z]=\s*\/>/.test(l) ||
    /[a-zA-Z]=\s+[a-zA-Z]+=/.test(l)
  ) {
    console.log(i + 1 + ':', l.trim().slice(0, 140));
  }
}
try {
  await esbuild.transform(s, { loader: 'jsx', format: 'esm' });
  console.log('OK');
} catch (e) {
  for (const err of (e.errors || []).slice(0, 10)) {
    console.log(err.location?.line, err.text);
  }
}
