/** Término de búsqueda del roster por sede, fuera del estado de App.jsx (evita re-render masivo). */

let appliedSearchTerm = '';

const listeners = new Set();

export function readRosterLocationSearchTerm() {
  return appliedSearchTerm;
}

export function writeRosterLocationSearchTerm(next) {
  const v = String(next ?? '');
  if (v === appliedSearchTerm) return;
  appliedSearchTerm = v;
  listeners.forEach((listener) => listener());
}

export function subscribeRosterLocationSearchTerm(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
