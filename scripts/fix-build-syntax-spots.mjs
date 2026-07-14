import fs from 'fs';

// 1) TransportPlanningPage: remove orphan JSX debris before TransportRowByRowSection
{
  const p = 'src/screens/TransportPlanningPage.jsx';
  const lines = fs.readFileSync(p, 'utf8').split(/\n/);
  let start = -1;
  let end = -1;
  for (let i = 0; i < lines.length; i++) {
    if (
      start < 0 &&
      lines[i].includes(') : null}') &&
      lines[i + 1]?.trim() === '</p>' &&
      i > 2700 &&
      i < 2790
    ) {
      start = i;
    }
    if (
      start >= 0 &&
      lines[i].trim() === '/>' &&
      lines[i + 2]?.includes('TransportRowByRowSection')
    ) {
      end = i;
      break;
    }
  }
  console.log('TP delete', start + 1, 'to', end + 1);
  if (start >= 0 && end >= start) {
    let from = start;
    while (from > 0 && lines[from - 1].trim() === '') from--;
    const next = lines.slice(0, from).concat([''], lines.slice(end + 1));
    fs.writeFileSync(p, next.join('\n'));
    console.log('TP fixed, new lines', next.length);
  }
}

// 2) NewRegistrationModal disability fieldset
{
  const p = 'src/features/locationRoster/NewRegistrationModal.jsx';
  const lines = fs.readFileSync(p, 'utf8').split(/\n/);
  const i = lines.findIndex((l) => l.includes('<fieldset disabled= className=>'));
  console.log('NRM fieldset at', i + 1);
  if (i >= 0) {
    lines.splice(
      i,
      6,
      "                  <fieldset disabled={fieldBlocked('disability')} className={`space-y-1 ${fieldBlocked('disability') ? 'opacity-70' : ''}`}>",
      '                    <label className={labelClasses}>Discapacidades</label>',
      '                    <DisabilityFormFields',
      '                      hasDisability={draft.hasDisability}',
      '                      disabilityDetails={draft.disabilityDetails}',
      "                      detailsClassName={getRequiredFieldClass(!(draft.disabilityDetails || '').trim())}",
      '                      onChange={(patch) => setDraft({ ...draft, ...patch })}',
      '                    />'
    );
    fs.writeFileSync(p, lines.join('\n'));
    console.log('NRM fixed');
  }
}

// 3) scheduledBackupAsyncLock reassignment via module namespace
{
  const p = 'src/hooks/workspace/useAppMainHandlers.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (!s.includes("from '../../app/helpers/appMainModuleScope.jsx'")) {
    s = s.replace(
      "import { useCallback, useMemo, useEffect, useLayoutEffect, useRef } from 'react';\n",
      "import { useCallback, useMemo, useEffect, useLayoutEffect, useRef } from 'react';\n" +
        "import * as appMainModuleScope from '../../app/helpers/appMainModuleScope.jsx';\n"
    );
  }
  s = s.replace(
    /^(\s*)scheduledBackupAsyncLock\s*=\s*/gm,
    '$1appMainModuleScope.scheduledBackupAsyncLock = '
  );
  s = s.replace(
    /^(\s*)if\s*\(\s*scheduledBackupAsyncLock\s*\)\s*return\s*;/gm,
    '$1if (appMainModuleScope.scheduledBackupAsyncLock) return;'
  );
  // strip from getScope bags in functions that assign (global strip of binding is ok;
  // reads can use module). Replace ", scheduledBackupAsyncLock," and variants.
  s = s.replace(/,\s*scheduledBackupAsyncLock\s*,/g, ',');
  s = s.replace(/,\s*scheduledBackupAsyncLock\s*([}])/g, '$1');
  s = s.replace(/\{\s*scheduledBackupAsyncLock\s*,/g, '{');
  fs.writeFileSync(p, s);
  console.log(
    'handlers lock assigns',
    (s.match(/appMainModuleScope\.scheduledBackupAsyncLock\s*=/g) || []).length
  );
}
