export const uiShell = {
  appBg: 'bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100',
  card: 'bg-white rounded-2xl shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-700',
  cardHeader: 'border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50',
  /** Padding de página: compacto en móvil, estándar desde sm. */
  pagePad: 'px-3 py-4 sm:p-6',
  pageStack: 'space-y-4 sm:space-y-6',
};

/** Cabecera del hub global (eventos / usuarios / archivo / logs). Móvil y escritorio comparten paletas pill*, navIconBtn, userChip, offlineBanner. Ver docs/UI_FORMAT_GUIDE.md §34. */
export const uiHubHeader = {
  mobileWrap: 'md:hidden space-y-2',
  titleRow: 'flex items-center gap-1.5 min-w-0',
  navIconBtn:
    'inline-flex items-center justify-center min-w-[2.25rem] min-h-[2.25rem] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shrink-0 disabled:opacity-40 disabled:pointer-events-none',
  title: 'flex-1 min-w-0 text-base font-black text-slate-800 dark:text-slate-100 truncate leading-tight',
  quickActions: 'flex items-center gap-1 shrink-0',
  optionsBtn: (active) =>
    `inline-flex shrink-0 items-center justify-center min-w-[2.25rem] min-h-[2.25rem] rounded-xl border text-slate-600 transition-colors dark:text-slate-200 ${
      active
        ? 'border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-100'
        : 'border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800'
    }`,
  userRow: 'flex items-center min-w-0',
  userChip:
    'inline-flex items-center gap-1.5 min-w-0 max-w-full px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600',
  userName: 'text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate',
  sessionBadge:
    'text-[8px] font-black uppercase tracking-wide text-emerald-800 bg-emerald-50 border border-emerald-200 dark:text-emerald-200 dark:bg-slate-900 dark:border-emerald-700 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0',
  offlineBanner:
    'flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-700',
  /** Escritorio: layout; colores compartidos con móvil (pill*, navIconBtn, userChip, etc.). */
  desktopShell: 'hidden md:flex md:flex-col md:min-w-0 md:p-6 md:gap-0',
  desktopTopRow: 'flex items-start justify-between gap-4 pb-4',
  desktopBrandRow: 'flex items-start gap-3 min-w-0 flex-1',
  desktopNavGroup: 'flex items-center gap-1 pt-1 shrink-0',
  desktopCopy: 'min-w-0 space-y-1',
  desktopTitle: 'text-2xl font-black text-slate-800 dark:text-slate-100 leading-tight',
  desktopSubtitle: 'text-sm font-semibold text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl',
  desktopMeta: 'flex items-center gap-2 shrink-0',
  desktopToolbar:
    'flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 border-t border-slate-100 dark:border-slate-700',
  desktopToolGroup: 'flex flex-wrap items-center gap-2 min-w-0',
  desktopToolLabel: 'text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0',
  navScroll:
    'flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
  pillBase:
    'inline-flex shrink-0 items-center justify-center gap-1 min-h-[2rem] px-2.5 rounded-full text-[11px] font-bold transition-colors border',
  pillIndigo:
    'text-indigo-800 bg-indigo-100 hover:bg-indigo-200 border-indigo-300 dark:border-indigo-700 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-700',
  pillSlate:
    'text-slate-600 bg-slate-100 hover:bg-slate-200 border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
  pillRose:
    'text-rose-800 bg-rose-100 hover:bg-rose-200 border-rose-300 dark:border-rose-700 dark:bg-rose-600 dark:text-white dark:hover:bg-rose-700',
  pillEmerald:
    'text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-900/50',
  pillDanger: 'text-white bg-red-500 hover:bg-red-600 border-red-500',
  pillDangerActive: 'text-white bg-red-500 hover:bg-red-600 border-red-500 animate-pulse',
  panelBtn:
    'w-full inline-flex items-center justify-center gap-1.5 min-h-[2.25rem] px-2.5 rounded-lg text-[11px] font-bold transition-colors border',
};

export const uiForm = {
  labelXs: 'text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider',
  input:
    'w-full box-border rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500',
  inputCompact:
    'w-full box-border rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-2 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500',
  help: 'text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed',
  required:
    '!border-red-600 ring-2 ring-red-200 bg-red-50 dark:!border-red-500 dark:ring-red-900/40 dark:bg-red-950/30',
};

/** Botón compacto compartido: Filtros y Orden en listas por sede. */
export const uiListToolbarBtn =
  'relative flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-xs font-black text-slate-700 dark:text-slate-200';

/** Orden de listas (sedes / registro global): botón + menú alineado con uiDropdown. */
export const uiSortToolbar = {
  wrap: 'vnpm-ui-sort-toolbar relative inline-flex shrink-0 max-w-full min-w-0',
  wrapGlobal: 'vnpm-ui-sort-toolbar relative inline-flex max-w-full shrink-0 min-w-0',
  trigger: `${uiListToolbarBtn} outline-none focus:ring-2 focus:ring-indigo-500/35 dark:focus:ring-indigo-400/40`,
  triggerGlobal:
    'flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 hover:bg-slate-100 transition-colors text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/35 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:focus:ring-indigo-400/40 max-w-[min(100%,14rem)] sm:max-w-[18rem]',
  triggerLabel: 'min-w-0 flex-1 truncate text-left',
  triggerLabelGlobal: 'min-w-0 flex-1 truncate text-left',
  chevron: 'text-slate-400 dark:text-slate-500',
  icon: 'shrink-0 text-slate-400 dark:text-slate-500',
  menu:
    'absolute top-full right-0 z-40 mt-2 min-w-full w-max max-w-[min(100vw-1.5rem,28rem)] rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-600 dark:bg-slate-900',
  menuTitle: 'text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase px-2 pt-1 pb-1.5',
  menuList: 'max-h-[min(18rem,50vh)] overflow-y-auto space-y-0.5',
  menuItem:
    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-slate-700 whitespace-normal leading-snug hover:bg-slate-50 transition-colors dark:text-slate-200 dark:hover:bg-slate-800',
  menuItemActive:
    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold text-indigo-700 whitespace-normal leading-snug bg-indigo-50 hover:bg-indigo-50/90 transition-colors dark:text-indigo-200 dark:bg-indigo-950/50 dark:hover:bg-indigo-950/70',
};

/** Búsqueda destacada en listas de registro por sede (barra principal del listado). */
export const uiRosterSearch = {
  toolbarCard:
    'bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 max-md:p-2 max-md:rounded-xl flex flex-col gap-2 max-md:gap-1',
  panel:
    'rounded-xl border-2 border-indigo-300 bg-white p-3 dark:border-indigo-500/55 dark:bg-slate-900',
  panelActive: 'border-indigo-500 dark:border-indigo-400',
  labelRow: 'flex flex-wrap items-center gap-x-2 gap-y-1 mb-2',
  labelIcon: 'shrink-0 text-indigo-600 dark:text-indigo-300',
  labelText: 'text-xs font-black uppercase tracking-wide text-indigo-900 dark:text-indigo-100',
  labelBadge:
    'inline-flex items-center rounded-md bg-indigo-600 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white dark:bg-indigo-500',
  inputWrap: 'relative',
  input:
    'vnpm-roster-search-input w-full py-2 px-3 pr-9 text-sm font-semibold rounded-xl border-2 border-indigo-300 bg-white text-slate-900 placeholder:text-slate-400 placeholder:font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 dark:border-indigo-500/50 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30',
  clearBtn:
    'absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors',
  hint: 'mt-2 text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-snug',
  filteringPill:
    'mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-950 dark:border-amber-600/50 dark:bg-amber-950/45 dark:text-amber-100',
  listToolsBar:
    'flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-end gap-2 mb-3 w-full',
  listToolsDropdownMenu:
    'absolute top-full right-0 left-auto z-30 mt-2 w-[320px] max-w-[90vw] rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 shadow-xl space-y-3',
  whatsAppToolsRow: 'flex flex-col sm:flex-row gap-2 sm:justify-end pt-1',
  statsBlock: 'mt-3 space-y-1',
  statsTitle: 'text-[11px] font-bold text-slate-600 dark:text-slate-300 px-0.5',
  statsHighlight: 'text-indigo-700 dark:text-indigo-300',
  statsMuted: 'text-slate-500 dark:text-slate-400 font-semibold normal-case',
  statsHelp: 'text-[10px] text-slate-500 dark:text-slate-400 px-0.5 leading-snug',
};

export const uiDropdown = {
  trigger: uiListToolbarBtn,
  menu:
    'absolute top-full left-0 z-30 mt-2 w-[300px] max-w-[90vw] rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 shadow-xl space-y-3',
  sectionTitle: 'text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1',
  optionRow: 'flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 py-0.5 cursor-pointer',
};

/**
 * Guía visual (filtros):
 * - No seleccionado (claro): borde delgado negro/gris oscuro + centro blanco.
 * - No seleccionado (oscuro): borde gris claro + centro oscuro.
 * - Seleccionado (claro/oscuro): borde índigo + relleno índigo + aro interior blanco más grueso.
 */
export const uiFilter = {
  optionRow:
    'flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 py-1 cursor-pointer',
  circleControl:
    "appearance-none h-4 w-4 rounded-full border border-slate-700 dark:border-slate-300 bg-white dark:bg-slate-900 transition-colors checked:border-indigo-600 dark:checked:border-indigo-600 checked:[background:radial-gradient(circle,_#4f46e5_0_46%,_#ffffff_46%_72%,_#4f46e5_72%_100%)]",
  dropdownScope:
    "[&_label]:flex [&_label]:items-center [&_label]:gap-2 [&_label]:text-xs [&_label]:font-semibold [&_label]:text-slate-700 [&_label]:py-1 [&_label]:cursor-pointer dark:[&_label]:text-slate-200 [&_input[type='checkbox']]:appearance-none [&_input[type='checkbox']]:h-4 [&_input[type='checkbox']]:w-4 [&_input[type='checkbox']]:rounded-full [&_input[type='checkbox']]:border [&_input[type='checkbox']]:border-slate-700 [&_input[type='checkbox']]:bg-white dark:[&_input[type='checkbox']]:border-slate-300 dark:[&_input[type='checkbox']]:bg-slate-900 [&_input[type='checkbox']:checked]:border-indigo-600 dark:[&_input[type='checkbox']:checked]:border-indigo-600 [&_input[type='checkbox']:checked]:[background:radial-gradient(circle,_#4f46e5_0_46%,_#ffffff_46%_72%,_#4f46e5_72%_100%)] [&_input[type='radio']]:appearance-none [&_input[type='radio']]:h-4 [&_input[type='radio']]:w-4 [&_input[type='radio']]:rounded-full [&_input[type='radio']]:border [&_input[type='radio']]:border-slate-700 [&_input[type='radio']]:bg-white dark:[&_input[type='radio']]:border-slate-300 dark:[&_input[type='radio']]:bg-slate-900 [&_input[type='radio']:checked]:border-indigo-600 dark:[&_input[type='radio']:checked]:border-indigo-600 [&_input[type='radio']:checked]:[background:radial-gradient(circle,_#4f46e5_0_46%,_#ffffff_46%_72%,_#4f46e5_72%_100%)]",
};

export const uiTextarea = {
  base:
    'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed',
  soft:
    'w-full rounded-lg border border-indigo-200 dark:border-indigo-500/45 bg-indigo-50/30 dark:bg-slate-900 px-3 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-400 leading-relaxed',
};

export const uiButtons = {
  primary:
    'px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wide shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
  secondary:
    'px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors',
  closeIcon:
    'shrink-0 p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 dark:hover:text-slate-100 transition-colors',
  danger:
    'px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wide shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
  dangerSoft:
    'px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/45 text-rose-700 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors',
  iconOnly:
    'p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-700 transition-colors',
  iconOnlyDanger:
    'p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-200 dark:hover:bg-rose-950/40 transition-colors',
  filterPill:
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wide border transition-colors',
  whatsapp:
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide text-white shadow-sm transition-colors',
};

const TONAL_PALETTE = {
  indigo:
    'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-500/45 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/50',
  emerald:
    'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/45 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50',
  amber:
    'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-500/45 text-amber-700 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50',
  rose:
    'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/45 text-rose-700 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/50',
  violet:
    'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-500/45 text-violet-700 dark:text-violet-200 hover:bg-violet-100 dark:hover:bg-violet-900/50',
  sky:
    'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-500/45 text-sky-700 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-sky-900/50',
  teal:
    'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-500/45 text-teal-700 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900/50',
  fuchsia:
    'bg-fuchsia-50 dark:bg-fuchsia-950/40 border-fuchsia-200 dark:border-fuchsia-500/45 text-fuchsia-700 dark:text-fuchsia-200 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/50',
  slate:
    'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700',
};

/**
 * Campos de formulario (panel y público): misma altura que Becado / toggles compactos.
 * Usar `stack` en el contenedor; la etiqueta va justo encima del control sin margen extra.
 */
export const uiFormField = {
  stack: 'flex flex-col gap-1 min-w-0',
  /** Dos columnas: fila de etiquetas y fila de controles alineadas (p. ej. método de pago + abono). */
  pairGrid: 'grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-1 items-end',
  pairLabel:
    'min-h-[2.25rem] flex flex-col justify-end gap-0.5 text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest px-1 leading-tight',
  /** Etiqueta de abono: título a la izquierda, «Mín. $…» a la derecha en la misma fila. */
  pairLabelRow:
    'min-h-[2.25rem] flex flex-row items-end justify-between gap-2 text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest px-1 leading-tight',
  pairLabelHint:
    'shrink-0 text-right text-[10px] font-bold normal-case tracking-normal text-indigo-500 dark:text-indigo-400 leading-tight',
  pairControl: 'min-w-0 w-full',
  label:
    'text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest px-1 block leading-tight',
  labelPhase:
    'text-[8px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-wider block leading-tight',
  control:
    'w-full box-border h-8 px-3 py-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-semibold leading-none text-slate-700 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500 transition-all',
  controlPublic:
    'w-full box-border h-8 px-3 py-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 text-xs font-semibold leading-none text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all',
  controlOnWhite:
    'w-full box-border h-8 px-3 py-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 text-xs font-semibold leading-none text-slate-700 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all',
  /** Bloque «Información de pago» más compacto. */
  paymentSectionBody: 'flex flex-col gap-1',
  paymentPairGrid: 'grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-0.5 items-end',
  paymentPairLabel:
    'min-h-[1.25rem] flex flex-col justify-end text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest px-1 leading-tight',
  paymentPairLabelRow:
    'min-h-[1.25rem] flex flex-row items-end justify-between gap-2 text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest px-1 leading-tight',
  paymentHints: 'flex flex-col gap-0 min-w-0',
};

/** Método de pago: segmento Efectivo | Tarjeta (misma altura h-8). */
export const uiPaymentMethodSegment = {
  group:
    'grid grid-cols-2 h-8 w-[9.5rem] max-w-full shrink-0 justify-self-start rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden bg-white dark:bg-slate-900 shadow-sm',
  btn:
    'box-border h-full w-full min-w-0 py-0 px-1 text-[10px] font-bold leading-none tracking-tight transition-colors touch-manipulation flex items-center justify-center gap-0.5 border-r border-slate-200 dark:border-slate-600 last:border-r-0 whitespace-nowrap',
  btnEfectivoActive: 'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-600',
  btnEfectivoIdle:
    'text-slate-600 bg-slate-50 hover:bg-emerald-50/90 dark:text-slate-200 dark:bg-slate-800 dark:hover:bg-emerald-950/35',
  btnTarjetaActive: 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-600',
  btnTarjetaIdle:
    'text-slate-600 bg-slate-50 hover:bg-indigo-50/90 dark:text-slate-200 dark:bg-slate-800 dark:hover:bg-indigo-950/35',
  btnDisabled: 'opacity-45 cursor-not-allowed pointer-events-none',
  iconActive: 'text-white',
  iconIdle: 'text-slate-400 dark:text-slate-500',
};

/** Botón compacto Sí/No o elección (misma altura que Becado / Servidor / Bautizo). */
export const uiFormChoiceBtn = {
  panel:
    'box-border w-full px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/35 dark:focus-visible:ring-indigo-400/40',
  public:
    'box-border w-full px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/35',
  inline:
    'box-border w-auto min-w-[5.5rem] shrink-0 self-center px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/35 dark:focus-visible:ring-indigo-400/40',
  idlePanel:
    'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700/80',
  idlePanelAlt:
    'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-800',
  idlePublic: 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200/80',
  disabled: 'opacity-55 cursor-not-allowed pointer-events-none',
  iconIdle: 'text-slate-400 dark:text-slate-500',
  iconActive: 'text-white',
};

/** Toggle Sí/No (un botón) — nadar, alergias, enfermedades, discapacidades. */
export const uiSiNoFieldToggle = {
  block: 'w-full',
  inline: 'w-auto min-w-[5.5rem] shrink-0 self-center',
  idle: uiFormChoiceBtn.idlePanel,
  idlePublic: uiFormChoiceBtn.idlePublic,
  disabled: uiFormChoiceBtn.disabled,
  iconIdle: uiFormChoiceBtn.iconIdle,
  iconActive: uiFormChoiceBtn.iconActive,
  activeSwim: 'bg-blue-500 text-white border-blue-400 dark:bg-blue-600 dark:border-blue-400',
  activeSwimPublic: 'bg-blue-500 text-white border-blue-400',
  activeAllergy: 'bg-orange-500 text-white border-orange-400 dark:bg-orange-600 dark:border-orange-400',
  activeAllergyPublic: 'bg-orange-500 text-white border-orange-400',
  activeDisease: 'bg-red-500 text-white border-red-400 dark:bg-red-600 dark:border-red-400',
  activeDiseasePublic: 'bg-red-500 text-white border-red-400',
  activeDisability: 'bg-purple-500 text-white border-purple-400 dark:bg-purple-600 dark:border-purple-400',
  activeDisabilityPublic: 'bg-purple-500 text-white border-purple-400',
  activeDefault: 'bg-indigo-500 text-white border-indigo-400 dark:bg-indigo-600 dark:border-indigo-400',
  activeBaptize: 'bg-sky-600 text-white border-sky-500 dark:bg-sky-600 dark:border-sky-400',
  activeBaptizePublic: 'bg-sky-600 text-white border-sky-500',
};

/**
 * Tipo de asistencia (evento Bautizos): misma base que Becado / Servidor / Bautizo (Campa).
 * «Bautizado» activo = mismo sky-600 que el toggle «Bautizo» en Campa (`activeBaptize`).
 */
export const uiBautizosAttendanceBtn = {
  btn: `${uiFormChoiceBtn.inline} flex-1 min-w-[92px]`,
  btnPublic: `${uiFormChoiceBtn.public} flex-1 min-w-[92px]`,
  idle: uiFormChoiceBtn.idlePanel,
  idlePublic: uiFormChoiceBtn.idlePublic,
  activeBautizado: uiSiNoFieldToggle.activeBaptize,
  activeBautizadoPublic: uiSiNoFieldToggle.activeBaptizePublic,
  activeAsistente: 'bg-amber-600 text-white border-amber-500 dark:bg-amber-600 dark:border-amber-500',
  activeServidor: 'bg-indigo-600 text-white border-indigo-500 dark:bg-indigo-600 dark:border-indigo-400',
  activeEmpleado: 'bg-teal-600 text-white border-teal-500 dark:bg-teal-600 dark:border-teal-500',
  activeCortesia: 'bg-fuchsia-600 text-white border-fuchsia-500 dark:bg-fuchsia-600 dark:border-fuchsia-500',
};

/** Chips de tipo de asistencia en roster / Registro global (Bautizos). */
export const uiBautizosAttendanceChip = {
  base:
    'text-[8px] font-black px-1.5 py-0.5 rounded uppercase inline-flex items-center gap-1 border h-5 leading-none shrink-0',
  bautizado:
    'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-600 dark:text-white dark:border-sky-700',
  asistente:
    'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-600 dark:text-white dark:border-amber-700',
  servidor:
    'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-600 dark:text-white dark:border-indigo-700',
  empleado:
    'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-600 dark:text-white dark:border-teal-700',
  cortesia:
    'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-600 dark:text-white dark:border-fuchsia-700',
  acompanante:
    'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-600 dark:text-white dark:border-violet-700',
};

/** Selector de género (Hombre / Mujer) — misma altura que Becado / Servidor / Bautizo. */
export const uiGenderSelect = {
  group: 'grid grid-cols-2 gap-2',
  groupWrap: 'rounded-xl transition-colors',
  groupMissing: 'rounded-xl ring-2 ring-red-500/70 dark:ring-red-900/50',
  btnBase:
    'box-border w-full h-8 min-h-8 max-h-8 px-3 py-0 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/35 dark:focus-visible:ring-indigo-400/40',
  btnBasePublic:
    'box-border w-full h-8 min-h-8 max-h-8 px-3 py-0 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/35',
  btnHombreIdle:
    'bg-slate-100 text-slate-400 border-slate-200 hover:border-blue-400 hover:bg-blue-50/90 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:border-blue-500/70 dark:hover:bg-blue-950/40',
  btnHombreActive: 'bg-blue-500 text-white border-blue-400 dark:bg-blue-600 dark:border-blue-400',
  btnMujerIdle:
    'bg-slate-100 text-slate-400 border-slate-200 hover:border-pink-400 hover:bg-pink-50/90 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:border-pink-500/70 dark:hover:bg-pink-950/40',
  btnMujerActive: 'bg-pink-500 text-white border-pink-400 dark:bg-pink-600 dark:border-pink-400',
  btnDisabled: 'opacity-55 cursor-not-allowed pointer-events-none',
};

/** Fila médica: toggle + campos alineados (misma altura que Becado / toggles compactos). */
export const uiMedicalRow = {
  row: 'flex flex-wrap items-center gap-1.5 w-full min-w-0',
  field:
    'w-full box-border h-8 px-3 py-0 rounded-lg text-xs font-semibold leading-none outline-none focus:ring-2 shrink-0 flex items-center',
  inputAllergy:
    'flex-1 min-w-[4.5rem] border border-orange-300 bg-white text-slate-800 focus:ring-orange-500/40 dark:bg-slate-900 dark:border-orange-500/55 dark:text-slate-100',
  selectAllergy:
    'flex-1 min-w-[4.5rem] max-w-[11rem] border border-orange-300 bg-white text-slate-800 focus:ring-orange-500/40 dark:bg-slate-900 dark:border-orange-500/55 dark:text-slate-100',
  inputDisease:
    'flex-1 min-w-[4.5rem] border border-red-300 bg-white text-slate-800 focus:ring-red-500/40 dark:bg-slate-900 dark:border-red-500/55 dark:text-slate-100',
  inputDisability:
    'flex-1 min-w-[4.5rem] border border-purple-300 bg-white text-slate-800 focus:ring-purple-500/40 dark:bg-slate-900 dark:border-purple-500/55 dark:text-slate-100',
  inputAllergyPublic:
    'flex-1 min-w-[4.5rem] border border-orange-300 bg-slate-50 text-slate-800 focus:ring-orange-400/50',
  selectAllergyPublic:
    'flex-1 min-w-[4.5rem] max-w-[11rem] border border-orange-300 bg-slate-50 text-slate-800 focus:ring-orange-400/50',
  inputDiseasePublic:
    'flex-1 min-w-[4.5rem] border border-red-300 bg-slate-50 text-slate-800 focus:ring-red-400/40',
  inputDisabilityPublic:
    'flex-1 min-w-[4.5rem] border border-purple-300 bg-slate-50 text-slate-800 focus:ring-purple-400/40',
};

export function uiTonalButton(color = 'indigo') {
  const palette = TONAL_PALETTE[color] || TONAL_PALETTE.indigo;
  return `px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-colors ${palette}`;
}

export function uiTonalSolid(color = 'indigo') {
  const solids = {
    indigo: 'bg-indigo-600 hover:bg-indigo-700',
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
    amber: 'bg-amber-600 hover:bg-amber-700',
    rose: 'bg-rose-600 hover:bg-rose-700',
    violet: 'bg-violet-600 hover:bg-violet-700',
    sky: 'bg-sky-600 hover:bg-sky-700',
    teal: 'bg-teal-600 hover:bg-teal-700',
    fuchsia: 'bg-fuchsia-600 hover:bg-fuchsia-700',
  };
  const solid = solids[color] || solids.indigo;
  return `px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide text-white shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${solid}`;
}

/**
 * B8) Registro de actividad — botones «Limpiar», restaurar copia, limpiar >30 días, borrar por cantidad
 * Modo claro: fondo suave del acento. Modo oscuro: fondo `slate-900` + borde de acento **saturado** (400)
 * + texto **brillante** (50); hover intensifica borde (300). Alineado con B4.1 (corte de caja) en dark.
 */
export const uiActivityLogAdmin = {
  btnIndigo:
    'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide border transition-colors ' +
    'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100 ' +
    'dark:bg-slate-900 dark:border-indigo-400 dark:text-indigo-50 dark:hover:border-indigo-300 dark:hover:bg-indigo-950/90',
  btnViolet:
    'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide border transition-colors ' +
    'bg-violet-50 border-violet-200 text-violet-900 hover:bg-violet-100 ' +
    'dark:bg-slate-900 dark:border-violet-400 dark:text-violet-50 dark:hover:border-violet-300 dark:hover:bg-violet-950/90',
  btnRose:
    'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide border transition-colors ' +
    'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100 ' +
    'dark:bg-slate-900 dark:border-rose-400 dark:text-rose-50 dark:hover:border-rose-300 dark:hover:bg-rose-950/90',
  /** Píldora única: etiqueta + número + confirmar (borrar antiguos por cantidad). */
  bulkPillWrap:
    'inline-flex items-stretch overflow-hidden rounded-full border shadow-sm ' +
    'border-amber-300 bg-amber-50 text-amber-950 ' +
    'dark:border-amber-400 dark:bg-slate-900 dark:text-amber-50',
  bulkPillLabel:
    'flex items-center px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wide shrink-0 self-stretch border-r border-amber-200 dark:border-amber-400/80',
  bulkPillInput:
    'w-[3.25rem] min-w-[3.25rem] border-0 bg-white text-center text-[11px] font-black text-slate-900 outline-none ' +
    'focus:ring-2 focus:ring-inset focus:ring-amber-400 ' +
    'dark:bg-slate-950 dark:text-amber-50',
  bulkPillButton:
    'inline-flex items-center gap-1 px-2.5 py-1.5 shrink-0 border-l border-amber-300 bg-amber-200 font-black uppercase tracking-wide text-[9px] text-amber-950 hover:bg-amber-300 transition-colors ' +
    'dark:border-amber-400 dark:bg-amber-500 dark:text-slate-900 dark:hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed',
};

export const uiModal = {
  overlay: 'fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-2 sm:p-4',
  overlayNested: 'fixed inset-0 z-[220] flex items-end sm:items-center justify-center p-2 sm:p-4',
  backdrop: 'absolute inset-0 bg-slate-900/55',
  panel:
    'relative w-full max-w-4xl max-h-[90dvh] sm:max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-600 overflow-hidden',
  panelSm:
    'relative w-full max-w-md max-h-[90dvh] sm:max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-600 overflow-hidden',
  panelMd:
    'relative w-full max-w-2xl max-h-[90dvh] sm:max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-600 overflow-hidden',
  panelLg:
    'relative w-full max-w-4xl max-h-[90dvh] sm:max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-600 overflow-hidden',
  panelXl:
    'relative w-full max-w-6xl max-h-[90dvh] sm:max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-600 overflow-hidden',
  header:
    'shrink-0 flex items-start justify-between gap-3 p-3 sm:p-5 border-b border-slate-100 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/50',
  title: 'text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider',
  body: 'px-3 sm:px-5 pb-3 sm:pb-5 overflow-y-auto flex-1 min-h-0 overscroll-y-contain',
  footer:
    'shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 p-3 sm:p-5 border-t border-slate-100 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/50',
};

export const uiUserEdit = {
  section: 'rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 space-y-3',
  title: 'text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider',
  helper: 'text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed',
};

/** Formularios de alta / edición de usuario (modal escritorio). */
export const uiUserAccountForm = {
  input:
    'w-full box-border rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 px-3.5 py-2 text-xs font-semibold outline-none focus:bg-white dark:focus:bg-slate-950 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200',
  inputDisabled:
    'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed',
  section: uiUserEdit.section,
  sectionTitle: uiUserEdit.title,
  sectionHelper: uiUserEdit.helper,
  createTriggerBtn:
    'inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wide shadow-md active:scale-95 transition-all',
  headerIconWrap: 'p-2 rounded-xl bg-indigo-600 text-white shadow-md shrink-0',
  headerIconWrapEdit: 'p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white shadow-md shrink-0',
};

/** Iconos de fila en Gestión de usuarios: sólidos de alto contraste (misma familia que Eventos / Salir en hub). */
const USER_ROW_ACTION_ICON =
  'p-1.5 rounded-lg transition-colors inline-flex items-center justify-center text-white';

const USER_ROW_ACTION_SOLID = {
  edit: 'bg-indigo-600 hover:bg-indigo-700',
  revokeSessions: 'bg-amber-500 hover:bg-amber-600',
  delete: 'bg-rose-600 hover:bg-rose-700',
};

export const uiUserRowActions = {
  group: 'flex flex-row items-center gap-1',
  groupTable: 'flex items-center justify-center gap-1 w-fit mx-auto',
  edit: `${USER_ROW_ACTION_ICON} ${USER_ROW_ACTION_SOLID.edit}`,
  revokeSessions: `${USER_ROW_ACTION_ICON} ${USER_ROW_ACTION_SOLID.revokeSessions}`,
  delete: `${USER_ROW_ACTION_ICON} ${USER_ROW_ACTION_SOLID.delete}`,
  disabled:
    'p-1.5 rounded-lg bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-500 inline-flex items-center justify-center cursor-not-allowed opacity-70',
};

/** Llamado a acción «Nuevo registro» en vista por sede (antes del listado). */
export const uiLocationNewRegCta = {
  wrap:
    'relative overflow-hidden rounded-xl border-2 border-indigo-400/80 dark:border-indigo-500 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 dark:from-indigo-700 dark:via-indigo-800 dark:to-violet-800',
  inner: 'relative flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 p-3 sm:p-4',
  iconBox:
    'flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 border border-white/25 text-white',
  kicker: 'text-[9px] font-black uppercase tracking-[0.18em] text-indigo-100',
  title: 'text-base sm:text-lg font-black text-white leading-tight',
  hint: 'text-xs sm:text-sm text-indigo-50/95 mt-1.5 max-w-2xl leading-snug',
  button:
    'w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-white text-indigo-700 font-black text-xs sm:text-sm uppercase tracking-wide hover:bg-indigo-50 active:scale-[0.98] transition-all disabled:bg-white/25 disabled:text-white/80 disabled:cursor-not-allowed disabled:active:scale-100',
  buttonIcon: 'rounded-full bg-indigo-600 p-0.5 text-white',
  closedNote: 'border-t border-white/20 px-3 sm:px-4 py-2 text-[10px] font-bold text-amber-100 bg-black/10',
  listDivider: 'flex items-center gap-3 pt-2',
  listDividerLine: 'flex-1 h-px bg-slate-200 dark:bg-slate-700',
  listDividerLabel:
    'text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 whitespace-nowrap',
};

export const uiDashboard = {
  card: 'bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700',
  cardBody: 'p-6 md:p-8',
  title: 'text-lg font-bold text-slate-800 dark:text-slate-100',
  subtitle: 'text-xs text-slate-400 dark:text-slate-300',
  /** Tarjetas principales (StatCard) — compacto en móvil, estándar desde md. */
  statTitle: 'text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-300 leading-tight',
  statValue: 'text-base md:text-2xl font-black tabular-nums leading-none text-slate-800 dark:text-slate-100',
  statValueDate: 'text-sm md:text-xl font-black text-slate-800 dark:text-slate-100 capitalize leading-tight',
  statValueLabel: 'text-[9px] md:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide',
  statValueLine: 'text-[9px] md:text-[10px] font-semibold text-slate-700 dark:text-slate-300 leading-snug',
  statValueEmphasis: 'text-[9px] md:text-[10px] font-black tabular-nums text-slate-900 dark:text-slate-100',
  statDetail: 'text-[9px] md:text-[10px] text-slate-600 dark:text-slate-400 font-semibold leading-snug',
  statValueSimpleAlign: 'text-right md:text-left',
  statCard: 'bg-white dark:bg-slate-900 rounded-xl md:rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700',
  statCardPad: 'p-2.5 md:p-4',
  statCardHeader: 'mb-1.5 md:mb-2 flex items-center gap-1 md:gap-1.5 min-w-0',
  statIconWrap: 'p-1 md:p-1.5 rounded-md shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5 md:[&_svg]:w-4 md:[&_svg]:h-4',
  statHelp: 'text-[8px] md:text-[9px] text-slate-500 dark:text-slate-400 leading-snug',
  statHelpSpaced: 'text-[8px] md:text-[9px] text-slate-500 dark:text-slate-400 mb-1.5 md:mb-2 leading-snug',
  statCaption: 'text-[8px] md:text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-0.5 md:mt-1 leading-snug',
  statValueInputRow:
    'flex items-center justify-end md:justify-start gap-0.5 w-full',
  statEditableWrap:
    'inline-flex items-center gap-0.5 w-full max-w-[6.25rem] md:max-w-[7.25rem] justify-end md:justify-start ml-auto md:ml-0',
  statEditablePrefix:
    'text-xs md:text-base font-black text-indigo-600/90 dark:text-indigo-400 shrink-0 select-none leading-none',
  statEditableInput:
    'w-full min-w-[3rem] md:min-w-[3.5rem] rounded-md border border-indigo-300 dark:border-indigo-500/65 bg-indigo-50/50 dark:bg-slate-950 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.32)] px-1.5 py-0.5 md:px-2 md:py-1 text-xs md:text-base font-black tabular-nums leading-tight text-slate-800 dark:text-slate-100 text-right outline-none transition-[border-color,box-shadow,background-color] focus:ring-2 focus:ring-indigo-400/70 dark:focus:ring-indigo-500/80 focus:border-indigo-500 dark:focus:border-indigo-400 hover:border-indigo-400 dark:hover:border-indigo-400/90 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
  statEditableInputReadonly:
    'border-slate-200 dark:border-slate-600 bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 shadow-none cursor-not-allowed opacity-80 hover:border-slate-200 dark:hover:border-slate-600 focus:ring-0 focus:border-slate-200 dark:focus:border-slate-600',
  /** Valor monetario enmascarado o solo lectura junto a inputs editables. */
  statEditableValue:
    'text-xs md:text-base font-black tabular-nums leading-tight text-slate-800 dark:text-slate-100',
  /** Campo numérico auxiliar compacto (p. ej. comisión %). */
  statInlineInput:
    'w-full max-w-[4.25rem] md:max-w-[4.75rem] rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-[10px] md:text-xs font-bold px-1.5 py-0.5 md:py-1 tabular-nums text-right outline-none focus:ring-2 focus:ring-indigo-400/70 dark:focus:ring-indigo-500/80 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
  statCheckboxLabel: 'text-[9px] md:text-[10px] font-bold text-slate-700 dark:text-slate-200 leading-snug',
  statDateInput:
    'w-full max-w-[9.5rem] md:max-w-[10.5rem] text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 rounded-md md:rounded-lg border px-1.5 py-1 md:px-2 md:py-1.5 text-right md:text-left',
  statScopeBar:
    'fixed bottom-2 right-2 md:bottom-3 md:right-3 left-auto z-[100] pointer-events-none flex flex-col items-end max-w-[min(calc(100vw-1rem),44rem)]',
  statScopeBarPanel:
    'pointer-events-auto rounded-lg md:rounded-xl border border-slate-200 dark:border-slate-600 bg-white/95 dark:bg-slate-900/95 shadow-lg md:shadow-xl backdrop-blur-sm p-1 md:p-1.5 sm:p-2.5 w-auto',
  statScopeBarPanelMobileClosed: 'max-md:p-0 max-md:border-0 max-md:shadow-none max-md:bg-transparent max-md:backdrop-blur-none',
  statScopeBarPanelMobileOpen: 'w-[min(calc(100vw-1rem),20rem)]',
  statScopeBarHeading:
    'text-[8px] sm:text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1 sm:mb-1.5 text-right tracking-wide',
  statScopeBarHint:
    'text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 text-right leading-snug max-w-md ml-auto line-clamp-2 sm:line-clamp-none',
  statScopeBarMobileToggle:
    'md:hidden inline-flex items-center justify-between gap-2 rounded-xl border border-teal-200 dark:border-teal-600/50 bg-teal-50/95 dark:bg-teal-950/50 px-2.5 py-1.5 text-left shadow-md transition-colors hover:bg-teal-100/90 dark:hover:bg-teal-950/70 max-w-[13rem]',
  statScopeBarMobileToggleLabel:
    'text-[9px] font-black uppercase tracking-wide text-slate-600 dark:text-slate-300 leading-tight',
  statScopeBarMobileToggleValue: 'text-[10px] font-black text-teal-800 dark:text-teal-200 truncate',
  statScopeBarBody: 'hidden md:block',
  statScopeBarBodyOpen: 'block',
};

/** Campo monetario editable en tarjetas del dashboard. */
export function uiDashboardEditableInputClass(canEdit) {
  return `${uiDashboard.statEditableInput}${canEdit ? '' : ` ${uiDashboard.statEditableInputReadonly}`}`;
}

export const uiSidebar = {
  sectionLabel:
    'text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] lg:text-[9px] lg:tracking-wider',
  sectionWrap:
    'flex items-center justify-between py-2 px-4 border-t border-slate-800/50 pt-4 lg:py-1.5 lg:px-3 lg:pt-3',
  navItemInner: 'flex items-center gap-2 min-w-0',
  navIcon: 'shrink-0 w-4 h-4',
  activeDot: 'w-1.5 h-1.5 rounded-full lg:w-1 lg:h-1',
  countBadgeBase: 'px-1.5 py-0.5 rounded-full font-black text-[9px] lg:text-[8px] lg:px-1 lg:py-px',
  /** Etiquetas de sección Principal / Sedes / Consolidado — más legibles en escritorio. */
  sectionLabelNavDesktop:
    'text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] lg:text-[11px] lg:tracking-[0.18em]',
  sectionWrapNavDesktop:
    'flex items-center justify-between py-2 px-4 border-t border-slate-800/50 pt-4 lg:py-2.5 lg:px-3.5 lg:pt-4',
  navItemInnerNavDesktop: 'flex items-center gap-2 min-w-0 lg:gap-2.5',
  countBadgeNavDesktop: 'lg:text-[10px] lg:px-2 lg:py-0.5',
};

export function sidebarNavButtonClass(isActive) {
  return `w-full flex items-center justify-between p-4 rounded-2xl transition-all mb-1 ${
    isActive ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
  }`;
}

/** Ítems del menú lateral: compacto en todas las vistas (escritorio alineado a tipografía densa). */
export function sidebarNavButtonClassCompact(isActive) {
  return `w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl transition-all mb-0.5 text-xs font-bold leading-tight lg:px-2.5 lg:py-1.5 lg:rounded-lg lg:text-[11px] lg:mb-0.5 ${
    isActive ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
  }`;
}

/** Botón de sede en el menú lateral (misma densidad que navItem). */
export function sidebarSedeNavButtonClass(isActive) {
  return `w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl transition-all mb-0.5 text-xs font-bold leading-tight lg:px-2.5 lg:py-1.5 lg:rounded-lg lg:text-[11px] lg:mb-0.5 group ${
    isActive
      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
      : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
  }`;
}

/** Nav Principal / Sedes / Consolidado: más grande en escritorio (lg+). */
export function sidebarNavButtonClassNavDesktop(isActive) {
  return `w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl transition-all mb-0.5 text-xs font-bold leading-tight lg:px-3.5 lg:py-2.5 lg:rounded-xl lg:text-sm lg:mb-1 ${
    isActive ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
  }`;
}

export function sidebarSedeNavButtonClassNavDesktop(isActive) {
  return `w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl transition-all mb-0.5 text-xs font-bold leading-tight lg:px-3.5 lg:py-2.5 lg:rounded-xl lg:text-sm lg:mb-1 group ${
    isActive
      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
      : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
  }`;
}

const BADGE_SOLID = {
  emerald: 'bg-emerald-600 text-white border-emerald-600',
  amber: 'bg-amber-500 text-white border-amber-500',
  rose: 'bg-rose-600 text-white border-rose-600',
  sky: 'bg-sky-600 text-white border-sky-600',
  indigo: 'bg-indigo-600 text-white border-indigo-600',
  teal: 'bg-teal-600 text-white border-teal-600',
  violet: 'bg-violet-600 text-white border-violet-600',
  fuchsia: 'bg-fuchsia-600 text-white border-fuchsia-600',
  slate: 'bg-slate-600 text-white border-slate-600',
};

const BADGE_SOFT = {
  emerald:
    'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-500/45',
  amber:
    'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-500/45',
  rose:
    'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-200 border-rose-200 dark:border-rose-500/45',
  sky:
    'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-200 border-sky-200 dark:border-sky-500/45',
  indigo:
    'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 border-indigo-200 dark:border-indigo-500/45',
  teal:
    'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-200 border-teal-200 dark:border-teal-500/45',
  violet:
    'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-200 border-violet-200 dark:border-violet-500/45',
  fuchsia:
    'bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-200 border-fuchsia-200 dark:border-fuchsia-500/45',
  slate:
    'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600',
};

export const uiBadge = {
  base: 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide',
  baseMini: 'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide',
  baseSq: 'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide',
};

export function uiBadgeSolid(color = 'slate') {
  const tone = BADGE_SOLID[color] || BADGE_SOLID.slate;
  return `${uiBadge.base} ${tone}`;
}

export function uiBadgeSoft(color = 'slate') {
  const tone = BADGE_SOFT[color] || BADGE_SOFT.slate;
  return `${uiBadge.base} ${tone}`;
}

export function uiBadgeMini(color = 'slate', variant = 'soft') {
  const tone = variant === 'solid' ? (BADGE_SOLID[color] || BADGE_SOLID.slate) : (BADGE_SOFT[color] || BADGE_SOFT.slate);
  return `${uiBadge.baseMini} ${tone}`;
}

const SECTION_HEADING_COLOR = {
  slate:
    'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  indigo:
    'text-indigo-700 dark:text-indigo-200 border-indigo-200 dark:border-indigo-500/45',
  amber:
    'text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-500/45',
  teal:
    'text-teal-700 dark:text-teal-200 border-teal-200 dark:border-teal-500/45',
  violet:
    'text-violet-700 dark:text-violet-200 border-violet-200 dark:border-violet-500/45',
  rose:
    'text-rose-700 dark:text-rose-200 border-rose-200 dark:border-rose-500/45',
  emerald:
    'text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-500/45',
  sky:
    'text-sky-700 dark:text-sky-200 border-sky-200 dark:border-sky-500/45',
  fuchsia:
    'text-fuchsia-700 dark:text-fuchsia-200 border-fuchsia-200 dark:border-fuchsia-500/45',
};

const SECTION_PANEL_COLOR = {
  slate:
    'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40',
  indigo:
    'border-indigo-200/90 dark:border-indigo-500/45 bg-indigo-50/40 dark:bg-indigo-950/15',
  amber:
    'border-amber-200/90 dark:border-amber-500/45 bg-amber-50/40 dark:bg-amber-950/15',
  teal:
    'border-teal-200/90 dark:border-teal-500/45 bg-teal-50/40 dark:bg-teal-950/15',
  violet:
    'border-violet-200/90 dark:border-violet-500/45 bg-violet-50/40 dark:bg-violet-950/15',
  rose:
    'border-rose-200/90 dark:border-rose-500/45 bg-rose-50/40 dark:bg-rose-950/15',
  emerald:
    'border-emerald-200/90 dark:border-emerald-500/45 bg-emerald-50/40 dark:bg-emerald-950/15',
  sky:
    'border-sky-200/90 dark:border-sky-500/45 bg-sky-50/40 dark:bg-sky-950/15',
  fuchsia:
    'border-fuchsia-200/90 dark:border-fuchsia-500/45 bg-fuchsia-50/40 dark:bg-fuchsia-950/15',
};

export const uiSection = {
  headingBase:
    'text-[10px] font-black uppercase tracking-[0.18em] pb-1 mb-3 border-b flex items-center gap-2',
  panelBase: 'rounded-xl border p-3 space-y-3 shadow-sm dark:shadow-none',
};

export function uiSectionHeading(color = 'slate') {
  const tone = SECTION_HEADING_COLOR[color] || SECTION_HEADING_COLOR.slate;
  return `${uiSection.headingBase} ${tone}`;
}

export function uiSectionPanel(color = 'slate') {
  const tone = SECTION_PANEL_COLOR[color] || SECTION_PANEL_COLOR.slate;
  return `${uiSection.panelBase} ${tone}`;
}

export const uiTable = {
  wrap: 'overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900',
  table: 'w-full text-sm',
  thead: 'bg-slate-50 dark:bg-slate-800/60',
  th: 'px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 whitespace-nowrap',
  thRight: 'px-3 py-2 text-right text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 whitespace-nowrap',
  tbody: 'divide-y divide-slate-100 dark:divide-slate-800',
  tr: 'hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors',
  td: 'px-3 py-2 align-middle text-slate-700 dark:text-slate-200',
  tdMoney: 'px-3 py-2 align-middle text-right tabular-nums font-black text-slate-800 dark:text-slate-100',
  tdMuted: 'px-3 py-2 align-middle text-slate-500 dark:text-slate-400 text-xs',
  footerRow: 'bg-slate-50/80 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-700',
};

export const uiToolbar = {
  wrap: 'flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl p-3 shadow-sm',
  searchWrap: 'relative flex-1 min-w-[220px]',
  searchIcon: 'absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500',
  searchInput:
    'w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500',
  countBadge:
    'absolute -top-1 -right-1 h-[18px] min-w-[18px] px-1 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center',
  statusLine: 'text-[11px] text-slate-500 dark:text-slate-400 font-semibold',
};

export const uiEmptyState = {
  wrap: 'flex flex-col items-center justify-center gap-2 py-10 px-4 text-center',
  icon: 'text-slate-300 dark:text-slate-600',
  title: 'text-sm font-black text-slate-500 dark:text-slate-400',
  help: 'text-xs text-slate-400 dark:text-slate-500 italic max-w-sm',
};

const FEEDBACK_BANNER = {
  warning:
    'border-amber-200 dark:border-amber-500/45 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200',
  danger:
    'border-rose-200 dark:border-rose-500/45 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200',
  info:
    'border-indigo-200 dark:border-indigo-500/45 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-200',
  success:
    'border-emerald-200 dark:border-emerald-500/45 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200',
  neutral:
    'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200',
};

export const uiFeedback = {
  bannerBase: 'flex items-start gap-2 rounded-xl border-l-4 border px-3 py-2 text-xs font-semibold leading-relaxed',
  toast:
    'fixed bottom-6 right-6 bg-slate-800 text-white px-5 py-4 rounded-xl shadow-2xl z-[240] animate-in slide-in-from-bottom-5 fade-in flex items-start gap-3 font-bold text-sm border border-slate-700 max-w-md',
  toastLeft:
    'fixed bottom-6 left-6 bg-slate-900 text-white p-4 rounded-xl shadow-2xl z-[240] max-w-sm animate-in slide-in-from-bottom-5 flex items-start gap-3',
  toastSuccess:
    'fixed bottom-6 right-6 bg-emerald-600 text-white px-5 py-4 rounded-xl shadow-2xl z-[240] animate-in slide-in-from-bottom-5 fade-in flex items-start gap-3 font-bold text-sm max-w-md',
  toastDanger:
    'fixed bottom-6 right-6 bg-rose-600 text-white px-5 py-4 rounded-xl shadow-2xl z-[240] animate-in slide-in-from-bottom-5 fade-in flex items-start gap-3 font-bold text-sm max-w-md',
};

export const uiOverlay = {
  modal: 'fixed inset-0 bg-slate-900/55 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto',
  modalLight: 'fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4',
  mobileMenu: 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300',
};

export function uiBanner(kind = 'info') {
  const tone = FEEDBACK_BANNER[kind] || FEEDBACK_BANNER.info;
  return `${uiFeedback.bannerBase} ${tone}`;
}

const PAGE_HEADER_ICON = {
  indigo: 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300',
  emerald: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300',
  amber: 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-300',
  rose: 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300',
  violet: 'bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-300',
  sky: 'bg-sky-100 dark:bg-sky-950/50 text-sky-600 dark:text-sky-300',
  teal: 'bg-teal-100 dark:bg-teal-950/50 text-teal-600 dark:text-teal-300',
  fuchsia: 'bg-fuchsia-100 dark:bg-fuchsia-950/50 text-fuchsia-600 dark:text-fuchsia-300',
  slate: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
};

export const uiPageHeader = {
  wrap: 'flex flex-wrap items-center gap-3 mb-4',
  iconBase: 'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
  title: 'text-2xl font-black text-slate-800 dark:text-slate-100 leading-tight',
  subtitle: 'text-xs text-slate-500 dark:text-slate-400 font-semibold',
  actions: 'ml-auto flex items-center gap-2',
};

export function uiPageHeaderIcon(color = 'indigo') {
  const tone = PAGE_HEADER_ICON[color] || PAGE_HEADER_ICON.indigo;
  return `${uiPageHeader.iconBase} ${tone}`;
}

export const uiControls = {
  switchWrap: 'relative inline-flex items-center cursor-pointer',
  switchInput: 'sr-only peer',
  switchTrack:
    "w-10 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-slate-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600",
  collapsibleWrap:
    'rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 overflow-hidden',
  collapsibleSummary:
    'list-none cursor-pointer select-none flex items-center justify-between gap-3 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60',
  collapsibleBody:
    'px-3 pb-3 pt-1 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2',
  moneyInputWrap: 'relative',
  moneyPrefix:
    'absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-black text-slate-500 dark:text-slate-400 pointer-events-none',
  moneyInput:
    'w-full pl-7 pr-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 text-sm font-black text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums',
};

export const uiTypography = {
  money: 'tabular-nums font-black text-slate-800 dark:text-slate-100',
  moneyMuted: 'tabular-nums font-semibold text-slate-500 dark:text-slate-400',
  moneyPositive: 'tabular-nums font-black text-emerald-600 dark:text-emerald-400',
  moneyNegative: 'tabular-nums font-black text-rose-600 dark:text-rose-400',
  num: 'tabular-nums font-black text-slate-800 dark:text-slate-100',
};

// B1) Kbd / tag mono para versiones, IDs cortos, alias técnicos, atajos de teclado
export const uiKbd = {
  base:
    'inline-flex items-center rounded-md border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-slate-700 dark:text-slate-200',
  sm:
    'inline-flex items-center rounded border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-1 py-[1px] text-[9px] font-mono tabular-nums text-slate-600 dark:text-slate-300',
};

// B2) Divider con etiqueta central (para separar bloques dentro de un formulario)
export const uiDivider = {
  plain: 'border-t border-slate-200 dark:border-slate-700 my-4',
  withLabelWrap: 'relative flex items-center my-4',
  withLabelLine: 'flex-1 border-t border-slate-200 dark:border-slate-700',
  withLabelText:
    'px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400',
};

// B3) Segmented control (tabs internos tipo Activos / Archivados / Todos)
export const uiSegment = {
  wrap:
    'inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-1',
};

export function uiSegmentItem(isActive) {
  const base =
    'px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-colors';
  const active = 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-200 shadow-sm';
  const inactive =
    'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200';
  return `${base} ${isActive ? active : inactive}`;
}

// B4) Stat tile (métrica numérica en dashboard / resumen de evento)
const STAT_TILE_COLOR = {
  slate:
    'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900',
  indigo:
    'border-indigo-200 dark:border-indigo-500/45 bg-indigo-50/50 dark:bg-indigo-950/20',
  emerald:
    'border-emerald-200 dark:border-emerald-500/45 bg-emerald-50/50 dark:bg-emerald-950/20',
  amber:
    'border-amber-200 dark:border-amber-500/45 bg-amber-50/50 dark:bg-amber-950/20',
  rose:
    'border-rose-200 dark:border-rose-500/45 bg-rose-50/50 dark:bg-rose-950/20',
  violet:
    'border-violet-200 dark:border-violet-500/45 bg-violet-50/50 dark:bg-violet-950/20',
  sky:
    'border-sky-200 dark:border-sky-500/45 bg-sky-50/50 dark:bg-sky-950/20',
  teal:
    'border-teal-200 dark:border-teal-500/45 bg-teal-50/50 dark:bg-teal-950/20',
  fuchsia:
    'border-fuchsia-200 dark:border-fuchsia-500/45 bg-fuchsia-50/50 dark:bg-fuchsia-950/20',
};

export const uiStat = {
  tileBase:
    'rounded-xl border p-3 flex flex-col gap-1 shadow-sm dark:shadow-none',
  label:
    'text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400',
  value:
    'text-2xl font-black tabular-nums text-slate-800 dark:text-slate-100 leading-tight',
  valueSm:
    'text-lg font-black tabular-nums text-slate-800 dark:text-slate-100 leading-tight',
  help: 'text-[11px] text-slate-500 dark:text-slate-400 font-semibold',
  deltaPositive:
    'inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums',
  deltaNegative:
    'inline-flex items-center gap-1 text-[10px] font-black text-rose-600 dark:text-rose-400 tabular-nums',
};

export function uiStatTile(color = 'slate') {
  const tone = STAT_TILE_COLOR[color] || STAT_TILE_COLOR.slate;
  return `${uiStat.tileBase} ${tone}`;
}

// B4.1) Corte de caja (tarjetas por servicio / método en modo oscuro)
// Regla visual: en dark priorizar borde de color saturado + fondo base oscuro.
const CASHCUT_TONE_CARD = {
  slate: 'rounded-xl border border-slate-100 bg-slate-50 p-2 sm:p-3 dark:bg-slate-900 dark:border-slate-500',
  emerald: 'rounded-xl border border-emerald-100 bg-emerald-50/50 p-2 sm:p-3 dark:bg-slate-900 dark:border-emerald-400',
  indigo: 'rounded-xl border border-indigo-100 bg-indigo-50/50 p-2 sm:p-3 dark:bg-slate-900 dark:border-indigo-400',
  rose: 'rounded-xl border border-rose-100 bg-rose-50/50 p-2 sm:p-3 dark:bg-slate-900 dark:border-rose-400',
  amber: 'rounded-xl border border-amber-100 bg-amber-50/50 p-2 sm:p-3 dark:bg-slate-900 dark:border-amber-400',
};

export function uiCashCutToneCard(color = 'slate') {
  return CASHCUT_TONE_CARD[color] || CASHCUT_TONE_CARD.slate;
}

/** Tarjetas por servicio / total del día en bloque de sede (corte de caja). */
export const uiCashCutSedeService = {
  gridRow: 'grid gap-2 w-full min-w-0',
  gridRowScroll:
    'flex gap-2 overflow-x-auto pb-0.5 snap-x snap-mandatory w-full min-w-0 [scrollbar-width:thin]',
  gridRowScrollItem: 'min-w-[8.25rem] w-[8.75rem] shrink-0 snap-start',
  gridRowList: 'flex md:hidden flex-col gap-1.5 w-full min-w-0',
  paymentsList: 'mt-2 md:mt-4 divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden',
  paymentsListItem: 'px-2.5 py-1.5 bg-white dark:bg-slate-900',
  cardShell: 'rounded-xl border p-2 sm:p-3 w-full min-w-0 h-full text-left transition-colors focus:outline-none',
  cardEmpty:
    'border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-700/70 focus-visible:ring-2 focus-visible:ring-indigo-400',
  cardActive:
    'border-green-100 dark:border-emerald-400 bg-green-50/30 dark:bg-slate-900 hover:bg-green-50/60 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-green-500',
  cardOffSchedule:
    'border-amber-100 dark:border-amber-400 bg-amber-50/30 dark:bg-slate-900 hover:bg-amber-50/50 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-amber-400',
  cardDayTotal:
    'rounded-xl border-2 border-indigo-300 dark:border-indigo-500 bg-indigo-50/60 dark:bg-slate-900 p-2 sm:p-3 shadow-md ring-1 ring-indigo-200/80 dark:ring-indigo-500/25 w-full min-w-0 h-full text-left transition-colors hover:bg-indigo-50/90 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
  cardDayTotalEmpty:
    'rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-600 bg-indigo-50/30 dark:bg-slate-900/80 p-2 sm:p-3 w-full min-w-0 h-full text-left transition-colors hover:bg-indigo-50/50 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
  title: 'text-[9px] sm:text-[10px] font-black uppercase tracking-wider mb-0.5 sm:mb-1 leading-tight line-clamp-2',
  titleMuted: 'text-slate-500 dark:text-slate-300',
  titleService: 'text-green-700 dark:text-emerald-200',
  titleOffSchedule: 'text-amber-700 dark:text-amber-300',
  titleDayTotal: 'text-indigo-800 dark:text-indigo-200',
  amount: 'text-base sm:text-lg font-black tabular-nums leading-none text-slate-800 dark:text-slate-100',
  amountDayTotal: 'text-lg sm:text-2xl font-black tabular-nums leading-none text-indigo-900 dark:text-indigo-100',
  stats: 'mt-1 space-y-0.5 text-[10px] sm:text-[11px] leading-tight',
  foot: 'text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-snug line-clamp-2',
  action: 'text-[9px] sm:text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 sm:mt-1',
};

export function cashCutSedeCardsGridStyle(columnCount) {
  const n = Math.max(1, Number(columnCount) || 1);
  return { gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` };
}

// B5) Skeleton / loading placeholders
export const uiSkeleton = {
  base: 'animate-pulse bg-slate-200 dark:bg-slate-700 rounded',
  line: 'animate-pulse bg-slate-200 dark:bg-slate-700 rounded h-3 w-full',
  lineShort: 'animate-pulse bg-slate-200 dark:bg-slate-700 rounded h-3 w-2/3',
  block: 'animate-pulse bg-slate-200 dark:bg-slate-700 rounded-xl h-20 w-full',
  avatar: 'animate-pulse bg-slate-200 dark:bg-slate-700 rounded-full h-10 w-10',
  chip: 'animate-pulse bg-slate-200 dark:bg-slate-700 rounded-full h-5 w-16',
};

// B6) Avatar / iniciales (sidebar, listas de sesión, historial)
const AVATAR_COLOR = {
  slate: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200',
  indigo: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-200',
  emerald: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-200',
  amber: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-200',
  rose: 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-200',
  violet: 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-200',
  sky: 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-200',
  teal: 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-200',
  fuchsia: 'bg-fuchsia-100 dark:bg-fuchsia-900/50 text-fuchsia-700 dark:text-fuchsia-200',
};

export const uiAvatar = {
  base: 'inline-flex items-center justify-center rounded-full font-black uppercase tracking-wide select-none',
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-[11px]',
  lg: 'w-10 h-10 text-xs',
  xl: 'w-12 h-12 text-sm',
};

export function uiAvatarClass(color = 'slate', size = 'md') {
  const tone = AVATAR_COLOR[color] || AVATAR_COLOR.slate;
  const sz = uiAvatar[size] || uiAvatar.md;
  return `${uiAvatar.base} ${sz} ${tone}`;
}

/** Botones fijos de inicio/final en Registro global y sedes. */
export const uiRosterSectionScroll = {
  wrap: 'relative',
  topAnchor: 'scroll-mt-14 md:scroll-mt-16 h-0 w-full pointer-events-none',
  bottomAnchor: 'scroll-mt-4 h-px w-full pointer-events-none',
  controls:
    'fixed right-3 bottom-[max(4.5rem,env(safe-area-inset-bottom,0px)+3.5rem)] md:right-4 md:bottom-20 z-40 flex flex-col items-end gap-1 pointer-events-none',
  btn:
    'pointer-events-auto inline-flex items-center justify-center gap-0.5 min-h-[2rem] min-w-[2.125rem] px-1.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-600/55 bg-white/95 dark:bg-slate-900/95 text-indigo-700 dark:text-indigo-200 shadow-sm backdrop-blur-sm hover:bg-indigo-50 dark:hover:bg-indigo-950/60 active:scale-[0.97] transition-all text-[8px] font-black uppercase tracking-wide',
  btnLabel: 'hidden sm:inline',
};

/** Tarjetas de roster en vista móvil (<md). */
export const uiRosterMobile = {
  list: 'md:hidden divide-y-[3px] divide-slate-400 dark:divide-white',
  card:
    'px-3 py-2 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20',
  cardExpanded: 'bg-slate-50/80 dark:bg-slate-900/40',
  cardSection: 'space-y-1.5',
  /** Zona táctil de la sección Participante (abre/cierra detalles en móvil). */
  participantTap:
    'rounded-lg -mx-0.5 px-1 py-1 cursor-pointer transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-800/40 active:bg-slate-100 dark:active:bg-slate-800/60 touch-manipulation',
  sectionLabel:
    'text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5',
  actionsPanel: 'w-full space-y-1.5',
  actionsGroup: 'space-y-0.5',
  actionsGroupLabel:
    'text-[7px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500',
  actionsChipRow: 'flex flex-wrap items-center gap-1 w-full',
  actionsChip:
    'inline-flex shrink-0 items-center justify-center gap-0.5 px-1.5 py-1 min-h-[28px] rounded-lg text-[9px] font-bold leading-none border shadow-sm transition-all active:scale-[0.98] disabled:opacity-55 disabled:cursor-not-allowed disabled:active:scale-100',
  actionsIconBtn:
    'inline-flex shrink-0 items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:px-2.5 sm:py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-sm active:scale-[0.98]',
  sedeBadge:
    'inline-flex items-center gap-1 text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1 dark:bg-indigo-950/50 dark:text-indigo-200 dark:border-indigo-800',
  expandPanel:
    'border-t border-slate-100 dark:border-slate-800 bg-indigo-50/20 dark:bg-slate-900/30',
};

/** Listados móviles temáticos (Bautizados, Servidores, Acompañantes, Logs). */
export const uiListMobile = {
  listWrap: 'md:hidden flex flex-col gap-0.5',
  shellSky: 'md:hidden flex flex-col gap-0.5',
  shellAmber: 'md:hidden flex flex-col gap-0.5',
  shellViolet: 'md:hidden flex flex-col gap-0.5',
  /** Registro de actividad global (móvil) — sin scroll propio; desplazamiento con la página. */
  shellIndigo:
    'md:hidden flex flex-col gap-0.5 rounded-lg border border-indigo-200/90 dark:border-indigo-600/45 bg-indigo-50/20 dark:bg-indigo-950/15 p-1',
  itemSky:
    'rounded-lg border border-sky-300/90 dark:border-sky-500/45 bg-gradient-to-b from-sky-50/90 to-white dark:from-sky-950/30 dark:to-slate-900 overflow-hidden',
  itemAmber:
    'rounded-lg border border-amber-300/90 dark:border-amber-500/45 bg-gradient-to-b from-amber-50/90 to-white dark:from-amber-950/30 dark:to-slate-900 overflow-hidden',
  itemViolet:
    'rounded-lg border border-violet-300/90 dark:border-violet-500/45 bg-gradient-to-b from-violet-50/90 to-white dark:from-violet-950/30 dark:to-slate-900 overflow-hidden',
  itemIndigo:
    'rounded-xl border-2 border-indigo-300 dark:border-indigo-500/55 bg-gradient-to-b from-indigo-50/95 to-white dark:from-indigo-950/40 dark:to-slate-900 shadow-sm overflow-hidden',
  itemOrange:
    'rounded-xl border-2 border-orange-300 dark:border-orange-500/55 bg-gradient-to-b from-orange-50/95 to-white dark:from-orange-950/35 dark:to-slate-900 shadow-sm overflow-hidden',
  itemPurple:
    'rounded-xl border-2 border-purple-300 dark:border-purple-500/55 bg-gradient-to-b from-purple-50/95 to-white dark:from-purple-950/35 dark:to-slate-900 shadow-sm overflow-hidden',
  toneSky: 'border-l-[3px] border-l-sky-500 dark:border-l-sky-400',
  toneAmber: 'border-l-[3px] border-l-amber-500 dark:border-l-amber-400',
  toneViolet: 'border-l-[3px] border-l-violet-500 dark:border-l-violet-400',
  toneIndigo: 'border-l-[3px] border-l-indigo-500 dark:border-l-indigo-400',
  toneOrange: 'border-l-[3px] border-l-orange-500 dark:border-l-orange-400',
  tonePurple: 'border-l-[3px] border-l-purple-500 dark:border-l-purple-400',
};

/** Menús móvil compactos: barra sticky + panel colapsable (§33). */
export const uiMobileMenu = {
  stickyBar:
    'md:contents max-md:sticky max-md:top-0 max-md:z-30 max-md:bg-slate-50 max-md:dark:bg-slate-950 max-md:border-b max-md:border-indigo-200/85 max-md:dark:border-indigo-600/45 max-md:shadow-sm max-md:px-2 max-md:pt-1 max-md:pb-1 max-md:space-y-1',
  stickyInner: 'md:hidden space-y-1',
  stickyRow: 'flex items-center gap-2 max-md:gap-2.5',
  primaryRow: 'flex items-center gap-2',
  primaryLabel:
    'text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap',
  metaRight: 'ml-auto text-[9px] font-bold text-slate-500 dark:text-slate-400 tabular-nums',
  searchWrap:
    'flex flex-1 min-w-0 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 min-h-[2.5rem] focus-within:ring-2 focus-within:ring-indigo-500',
  searchInput:
    'flex-1 min-w-0 border-0 bg-transparent p-0 text-xs font-bold text-slate-600 dark:text-slate-200 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500',
  selectCompact:
    'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-[10px] font-bold text-slate-600 dark:text-slate-200 rounded-lg px-1.5 py-1 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50',
  optionsBtnBase:
    'inline-flex shrink-0 items-center justify-center gap-1 min-h-[32px] px-2 rounded-lg border text-[9px] font-black uppercase tracking-wide transition-colors',
  optionsBtnIdle:
    'border-slate-200 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
  optionsBtnActive:
    'border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-100',
  filterDot: 'w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0',
  panelWrap: (open) => `${open ? '' : 'hidden'} md:hidden max-md:space-y-1.5 max-md:px-2 max-md:pb-1.5`,
  panel:
    'max-md:rounded-xl max-md:border max-md:border-indigo-200/90 max-md:dark:border-indigo-600/45 max-md:overflow-visible max-md:bg-white/60 max-md:dark:bg-slate-950/50 max-md:shadow-sm',
  /** Sección del panel: columna en móvil; use layout="inline"|"grid2" en MobileMenuSection para chips/selects. */
  section:
    'flex flex-col items-stretch gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 px-3 py-2.5 max-md:rounded-none max-md:border-0 max-md:border-b max-md:border-slate-200/85 dark:max-md:border-slate-700/75 max-md:px-2.5 max-md:py-2.5 max-md:gap-2 max-md:bg-transparent dark:max-md:bg-transparent max-md:last:border-b-0',
  sectionInline:
    'max-md:flex-row max-md:flex-wrap max-md:items-center max-md:gap-1.5 max-md:[&>button]:flex-1 max-md:[&>button]:min-w-[3.25rem] max-md:[&>button]:max-w-full max-md:[&>label]:shrink-0',
  sectionGrid2:
    'max-md:grid max-md:grid-cols-2 max-md:items-stretch max-md:gap-x-2 max-md:gap-y-1.5 max-md:[&>button]:w-full max-md:[&>select]:min-h-[2rem] max-md:[&>select]:min-w-0 max-md:[&>select]:text-[10px] max-md:[&>input]:min-w-0',
  sectionLabel:
    'text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 max-md:w-full max-md:pb-1 max-md:mb-0 max-md:text-[9px] max-md:border-b max-md:border-slate-200/75 dark:max-md:border-slate-600/60',
  sectionLabelSpan2: 'max-md:col-span-2 max-md:border-b max-md:pb-1 max-md:mb-0',
  /** Lista vertical de grupos de filtro (radios/checkboxes) dentro de una sección. Sin scroll propio en móvil: desplazamiento con la página. */
  filterPanel:
    'flex flex-col gap-2 w-full min-w-0 ' +
    '[&>button]:w-full [&>button]:shrink-0 [&>button]:!text-[10px] [&>button]:!py-2 [&>button]:!min-h-[2.25rem] ' +
    '[&>p]:text-[10px] [&>p]:leading-snug [&>p]:text-slate-500 dark:[&>p]:text-slate-400 ' +
    '[&>p]:rounded-lg [&>p]:border [&>p]:border-slate-200/85 dark:[&>p]:border-slate-600/50 ' +
    '[&>p]:bg-slate-50/80 dark:[&>p]:bg-slate-900/40 [&>p]:px-2.5 [&>p]:py-2 ' +
    '[&>div]:w-full [&>div]:rounded-lg [&>div]:border [&>div]:border-slate-200/90 dark:[&>div]:border-slate-600/45 ' +
    '[&>div]:bg-white/85 dark:[&>div]:bg-slate-950/55 [&>div]:px-2.5 [&>div]:py-2 ' +
    '[&>div>p.uppercase]:text-[9px] [&>div>p.uppercase]:font-black [&>div>p.uppercase]:tracking-wider ' +
    '[&>div>p.uppercase]:text-slate-500 dark:[&>div>p.uppercase]:text-slate-400 ' +
    '[&>div>p.uppercase]:mb-1.5 [&>div>p.uppercase]:pb-1 [&>div>p.uppercase]:border-b ' +
    '[&>div>p.uppercase]:border-slate-200/80 dark:[&>div>p.uppercase]:border-slate-700/70 ' +
    '[&>div_.space-y-1]:space-y-0.5 [&>div_.space-y-2]:space-y-1 [&>div>label]:w-full ' +
    '[&>label]:flex [&>label]:items-center [&>label]:gap-2 [&>label]:w-full [&>label]:rounded-md [&>label]:px-0.5 [&>label]:py-0.5',
  btnCompact:
    'max-md:inline-flex max-md:items-center max-md:justify-center max-md:!px-1.5 max-md:!py-1 max-md:!text-[8px] max-md:!min-h-[28px] max-md:leading-tight max-md:uppercase max-md:shrink-0',
  panelBanner: 'max-md:!px-2 max-md:!py-1.5 max-md:!text-[10px] max-md:leading-snug',
  panelActionsRow: 'md:hidden flex justify-end gap-1.5',
  desktopOnly: 'max-md:hidden',
  mobileOnly: 'md:hidden',
};

// B7) List row (fila de roster / listado genérico)
export const uiListRow = {
  wrap:
    'flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors',
  wrapCompact:
    'flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors',
  main: 'flex-1 min-w-0 flex flex-col gap-0.5',
  primary: 'text-sm font-black text-slate-800 dark:text-slate-100 truncate',
  secondary: 'text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate',
  meta: 'flex flex-wrap items-center gap-1.5',
  actions: 'flex items-center gap-1.5 shrink-0',
  pressed: 'ring-2 ring-indigo-400 dark:ring-indigo-500/60 bg-indigo-50/50 dark:bg-indigo-950/20',
};
