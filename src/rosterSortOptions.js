/** Opciones de orden para listas de registro (sede y registro global). */
export const ROSTER_SORT_OPTIONS = [
  { id: 'registered-desc', label: 'Fecha de registro (más reciente arriba)' },
  { id: 'registered-asc', label: 'Fecha de registro (más antiguo arriba)' },
  { id: 'name-asc', label: 'Nombre (A-Z)' },
  { id: 'name-desc', label: 'Nombre (Z-A)' },
  { id: 'age-asc', label: 'Edad (menor a mayor)' },
  { id: 'age-desc', label: 'Edad (mayor a menor)' },
  { id: 'debt-asc', label: 'Deuda (menor a mayor)' },
  { id: 'debt-desc', label: 'Deuda (mayor a menor)' },
];

/** Etiquetas cortas para la barra de registro global. */
export const ROSTER_SORT_OPTIONS_GLOBAL = [
  { id: 'registered-desc', label: 'Fecha de registro (más reciente arriba)' },
  { id: 'registered-asc', label: 'Fecha de registro (más antiguo arriba)' },
  { id: 'name-asc', label: 'Nombre (A-Z)' },
  { id: 'name-desc', label: 'Nombre (Z-A)' },
  { id: 'age-asc', label: 'Edad ↑' },
  { id: 'age-desc', label: 'Edad ↓' },
  { id: 'debt-asc', label: 'Deuda ↑' },
  { id: 'debt-desc', label: 'Deuda ↓' },
];
