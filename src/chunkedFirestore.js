/** Particiona un array en trozos de tamaño fijo (p. ej. consultas Firestore `in` con máx. 10 valores). */
export function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
