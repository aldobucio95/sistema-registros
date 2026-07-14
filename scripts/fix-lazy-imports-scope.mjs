import fs from 'fs';

const f = 'src/app/helpers/appMainModuleScope.jsx';
let s = fs.readFileSync(f, 'utf8');
const before = s;
s = s.replace(
  /import\((['"`])(\.\.\/(?:screens|components)\/[^'"`]+)\1\)/g,
  (full, q, spec) => {
    if (spec.startsWith('../../')) return full;
    return `import(${q}../${spec}${q})`;
  }
);
fs.writeFileSync(f, s);
console.log('changed', before !== s);
for (const m of s.matchAll(/import\((['"`])([^'"`]+)\1\)/g)) {
  if (/screens|Excel|Pastores|Becados|Bautizados|Responsivas|Transport/.test(m[2])) {
    console.log(m[2]);
  }
}
