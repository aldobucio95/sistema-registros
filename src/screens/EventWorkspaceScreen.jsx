import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Activity, ArrowLeft, ArrowRight, BarChart3, Bug, Bus, Calendar, CalendarRange, CheckCircle2, Church, CreditCard, DollarSign, Edit3,
  Eye, EyeOff, FileSignature, FileSpreadsheet, GraduationCap, History, LayoutDashboard,   ListPlus, LogOut, MapPin, Menu,
  UserPlus,
  MessageCircle, MessageSquare, Moon, Percent, Plus, QrCode, Receipt, RefreshCw, Scissors, Settings2, ShieldAlert, Sun, Download,
  TableProperties, Trash2, UserCircle, UserCog, Users, XCircle, AlertTriangle, ChevronDown,
} from 'lucide-react';
import {
  PUBLIC_OPTIONAL_GROUP_LABELS,
  PUBLIC_OPTIONAL_GROUP_ORDER,
  normalizeOptionalVisibility,
  publicOptionalKeysForEventType,
} from '../publicRegistrationLogic.js';
import { getPublicRegistrationPageUrl, getPublicRegistrationUrlSlug } from '../publicRegistrationUrls.js';
import { PAYMENT_METHODS, SERVICE_OPTIONS, SI_LABEL } from '../appConstants.js';
import {
  getPhaseDateMaxCap,
  getEventEffectiveEndDate,
  getEventEffectiveStartDate,
  isEventSingleDay,
} from '../eventDateHelpers.js';
import { donationAddsToRecaudacionBalance } from '../donationHelpers.js';
import { useWorkspaceShell } from './eventWorkspace/WorkspaceShellContext.jsx';
import BautizosCarDataPromptModal from '../components/transport/BautizosCarDataPromptModal.jsx';
import AppVersionBadge from '../AppVersionBadge.jsx';
import { collectCarColorSuggestions } from '../bautizosCarMeta.js';
import { isCardPaymentAllowedForLocation } from '../cardPaymentEligibility.js';
import { isResponsivaEventSectionVisible } from '../responsivaSignLogic.js';
import {
  sidebarNavButtonClassNavDesktop,
  sidebarSedeNavButtonClassNavDesktop,
  uiBanner,
  uiSidebar,
  uiFeedback,
  uiOverlay,
  uiModal,
} from '../ui/uiFormatClasses.js';

const SIDEBAR_NAV_ICON_SIZE = 16;
const SIDEBAR_NAV_ICON_LG = 'shrink-0 lg:w-[18px] lg:h-[18px]';

function sidebarNavIconClass(activeColor = '') {
  return [SIDEBAR_NAV_ICON_LG, activeColor].filter(Boolean).join(' ');
}
import BulkRestoreResyncBanner from '../components/BulkRestoreResyncBanner.jsx';
import PanelNoticeToast from '../components/PanelNoticeToast.jsx';

function donationIsSuperEditable(don) {
  if (!don || don._syntheticArchivedCredit || don._syntheticCancelledRefund) return false;
  if (don.fromCancelledRefundDonation || don.fromArchivedManualCredit) return false;
  return true;
}

function workspaceScrollStorageKey(userId) {
  return `vnpm_workspace_scroll_${String(userId || '')}`;
}

function workspaceScrollEntryKey(systemView, selectedEventId, activeTab) {
  return `${String(systemView || 'events')}|${String(selectedEventId || '')}|${String(activeTab || 'Summary')}`;
}

function workspaceSidebarNavClassDesktop(isActive) {
  return sidebarNavButtonClassNavDesktop(isActive);
}

function workspaceSidebarSedeClassDesktop(isActive) {
  return sidebarSedeNavButtonClassNavDesktop(isActive);
}

/** Misma pastilla que el contador por sede en la barra lateral. */
function sidebarSedeStyleCountBadge(isActive, navDesktop = false) {
  const size = navDesktop ? ` ${uiSidebar.countBadgeNavDesktop}` : '';
  return `${uiSidebar.countBadgeBase}${size} ${
    isActive ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'
  }`;
}

/** Formato corto para barra lateral (dd/mm/aa). */
function formatEventDateCompact(iso) {
  const s = String(iso || '').trim();
  if (!s) return '—';
  const dt = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00`) : new Date(s);
  if (Number.isNaN(dt.getTime())) return s;
  return dt.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/** Etiqueta compacta de un rango o fecha única (sidebar). */
function formatSidebarDateSpan(startIso, endIso, formatOne) {
  const start = String(startIso || '').trim();
  const end = String(endIso || '').trim();
  if (!start && !end) return null;
  if (!start || !end || start === end) return formatOne(start || end);
  return `${formatOne(start)} – ${formatOne(end)}`;
}

/** Tarjeta Estado Global: total visible; desglose en desplegable. */
function SidebarGlobalStateCard({
  totalInscritos,
  attendanceLines,
  waitlistLines,
  activeTotalDeduped,
  waitlistTotalDeduped,
  cancelledTotal,
  isSuperUser,
  syncFirestoreBusy,
  fbUser,
  onSync,
}) {
  const hasAttendanceDetail = Array.isArray(attendanceLines) && attendanceLines.length > 0;
  const hasWaitlistDetail = Array.isArray(waitlistLines) && waitlistLines.length > 0;
  const hasSummaryTotals =
    typeof activeTotalDeduped === 'number' ||
    typeof waitlistTotalDeduped === 'number' ||
    typeof cancelledTotal === 'number';
  const hasDetail = hasAttendanceDetail || hasWaitlistDetail || hasSummaryTotals;

  return (
    <div className="bg-slate-800/50 p-2.5 lg:p-2 rounded-xl lg:rounded-lg border border-slate-800 w-full">
      <div className={`flex items-center gap-2 mb-2 ${isSuperUser ? 'justify-between' : ''}`}>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estado Global</p>
        {isSuperUser && (
          <button
            type="button"
            onClick={() => void onSync?.()}
            disabled={syncFirestoreBusy || !fbUser}
            title="Vuelve a cargar participantes, eventos y demás datos directamente desde el servidor (corrige desfases con la vista)."
            className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wide text-indigo-200 bg-indigo-600/40 hover:bg-indigo-600/70 disabled:opacity-50 disabled:pointer-events-none dark:disabled:opacity-100 dark:disabled:bg-indigo-900 dark:disabled:text-indigo-200 dark:disabled:border-indigo-700 px-1.5 py-0.5 rounded-md border border-indigo-500/40 transition-colors"
          >
            <RefreshCw size={10} className={syncFirestoreBusy ? 'animate-spin' : ''} />
            Sync
          </button>
        )}
      </div>
      {hasDetail ? (
        <details className="group">
          <summary className="flex justify-between items-center gap-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <span className="text-xs font-bold">Inscritos Totales</span>
            <span className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-black text-indigo-400 tabular-nums">{totalInscritos}</span>
              <ChevronDown
                size={14}
                className="text-slate-500 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </span>
          </summary>
          <div className="space-y-1 pt-2 mt-2 border-t border-slate-700/80">
            {hasAttendanceDetail ? (
              <div className="pb-1.5 mb-1 border-b border-slate-700/60">
                <p className="text-[9px] font-bold text-indigo-400/90 uppercase tracking-wider mb-1">Activos</p>
                {attendanceLines.map((line) => (
                  <div key={line.label} className="flex justify-between items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-400 truncate">{line.label}</span>
                    <span className="text-[11px] font-black text-indigo-300 tabular-nums shrink-0">{line.count}</span>
                  </div>
                ))}
                {typeof activeTotalDeduped === 'number' ? (
                  <div className="flex justify-between items-center gap-2 mt-1 pt-1 border-t border-slate-700/40">
                    <span className="text-[10px] font-bold text-slate-300">Activos (total deduplicado)</span>
                    <span className="text-[11px] font-black text-white tabular-nums shrink-0">{activeTotalDeduped}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
            {hasWaitlistDetail ? (
              <div className="pt-1.5">
                <p className="text-[9px] font-bold text-amber-500/90 uppercase tracking-wider mb-1">Lista de espera</p>
                {waitlistLines.map((line) => (
                  <div key={line.label} className="flex justify-between items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-400 truncate">{line.label}</span>
                    <span className="text-[11px] font-black text-amber-300 tabular-nums shrink-0">{line.count}</span>
                  </div>
                ))}
                {typeof waitlistTotalDeduped === 'number' ? (
                  <div className="flex justify-between items-center gap-2 mt-1 pt-1 border-t border-slate-700/40">
                    <span className="text-[10px] font-bold text-slate-300">Lista de espera (total deduplicado)</span>
                    <span className="text-[11px] font-black text-amber-200 tabular-nums shrink-0">{waitlistTotalDeduped}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
            {typeof cancelledTotal === 'number' ? (
              <div className="flex justify-between items-center gap-2 pt-1.5 mt-1 border-t border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-300">Cancelados (total)</span>
                <span className="text-[11px] font-black text-rose-300 tabular-nums shrink-0">{cancelledTotal}</span>
              </div>
            ) : null}
          </div>
        </details>
      ) : (
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold">Inscritos Totales</span>
          <span className="text-xs font-black text-indigo-400 tabular-nums">{totalInscritos}</span>
        </div>
      )}
    </div>
  );
}

/** Solo lectura: las fechas se editan en el Dashboard del evento. */
function SidebarEventDatesReadOnly({ eventDateDraft, isCampa }) {
  const d = eventDateDraft || {};
  const c = formatEventDateCompact;
  const singleDay = isEventSingleDay(d);
  const generalLabel = formatSidebarDateSpan(getEventEffectiveStartDate(d), getEventEffectiveEndDate(d), c);
  const teensLabel = formatSidebarDateSpan(d.campaTeensStart, d.campaTeensEnd, c);
  const jovenesLabel = formatSidebarDateSpan(d.campaJovenesStart, d.campaJovenesEnd, c);
  return (
    <div className="w-full rounded-xl lg:rounded-lg bg-slate-800/50 p-2.5 lg:p-2 border border-slate-800">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
        {singleDay ? 'Fecha del evento' : 'Fechas del evento'}
      </p>
      <p className="text-[10px] leading-snug text-indigo-100 font-semibold tabular-nums">
        {generalLabel || '—'}
      </p>
      {isCampa && (
        <div className="mt-1.5 pt-1.5 border-t border-slate-700/50 space-y-0.5">
          <p className="text-[7px] font-black text-amber-500/90 uppercase tracking-wider">Campa</p>
          {teensLabel && (
            <p className="text-[9px] leading-tight text-indigo-100/95 tabular-nums">
              <span className="text-slate-500 font-bold">T </span>
              {teensLabel}
            </p>
          )}
          {jovenesLabel && (
            <p className="text-[9px] leading-tight text-indigo-100/95 tabular-nums">
              <span className="text-slate-500 font-bold">J </span>
              {jovenesLabel}
            </p>
          )}
          {!d.campaTeensStart && !d.campaTeensEnd && !d.campaJovenesStart && !d.campaJovenesEnd ? (
            <p className="text-[9px] text-slate-500 italic">Sin segmentos</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function EventWorkspaceScreen() {
  const shell = useWorkspaceShell();
  const paymentModalCardAllowed = useMemo(() => {
    if (!shell.paymentModal.isOpen || !shell.currentEvent || !shell.paymentModal.loc) return true;
    return isCardPaymentAllowedForLocation(shell.currentEvent, shell.paymentModal.loc);
  }, [shell.paymentModal.isOpen, shell.currentEvent, shell.paymentModal.loc]);
  const paymentModalMethodOptions = paymentModalCardAllowed ? PAYMENT_METHODS : ['Efectivo'];
  const paymentMethodEditTarget = useMemo(() => {
    if (!shell.paymentMethodEditModal.isOpen || !shell.allParticipants) return null;
    return shell.allParticipants.find((p) => String(p.id) === String(shell.paymentMethodEditModal.personId)) || null;
  }, [shell.paymentMethodEditModal.isOpen, shell.paymentMethodEditModal.personId, shell.allParticipants]);
  const paymentEditCardAllowed = useMemo(() => {
    if (!shell.paymentMethodEditModal.isOpen || !shell.currentEvent) return true;
    const loc = paymentMethodEditTarget?.location || shell.paymentMethodEditModal.loc || '';
    return isCardPaymentAllowedForLocation(shell.currentEvent, loc);
  }, [
    shell.paymentMethodEditModal.isOpen,
    shell.currentEvent,
    paymentMethodEditTarget,
    shell.paymentMethodEditModal.loc,
  ]);
  const paymentEditMethodOptions = paymentEditCardAllowed ? PAYMENT_METHODS : ['Efectivo'];
  const mainScrollRef = useRef(null);
  const [superDonationEdit, setSuperDonationEdit] = useState(null);
  const scrollEntryKey = workspaceScrollEntryKey(shell.systemView, shell.selectedEventId, shell.activeTab);

  const editRegistryModalOpen =
    shell.editRegistryModal.isOpen &&
    shell.editRegistryModal.variant === 'modal' &&
    shell.editRegistryModal.data;

  const renderEditRegistryModalChrome = (formClassName) => (
    <>
      <div className="shrink-0 bg-indigo-600 dark:bg-indigo-500 px-4 sm:px-6 py-3 sm:py-4 text-white flex justify-between items-start gap-3 border-b border-indigo-700/40 dark:border-indigo-400/30">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Edit3 className="shrink-0" size={20} /> Editar registro
          </h3>
          <p className="text-indigo-100 text-xs mt-1 leading-snug">
            Actualizando registro de {shell.editRegistryModal.data.name}
            {(shell.editRegistryModal.data.status || 'active') === 'waitlist' ? (
              <span className="block mt-1.5 font-bold text-amber-200">
                En lista de espera: al guardar permanece en espera hasta que lo promuevan de forma individual.
              </span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={shell.resetEditRegistryModal}
          className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors shrink-0"
          title="Cerrar"
        >
          <XCircle size={22} />
        </button>
      </div>
      <form onSubmit={shell.handleUpdateEntry} className={formClassName}>
        {shell.renderEditRegistryModalFormFields({ onCancel: shell.resetEditRegistryModal })}
      </form>
    </>
  );

  useEffect(() => {
    if (!shell.donationsListOpen) setSuperDonationEdit(null);
  }, [shell.donationsListOpen]);

  /** Si el modal de donación está abierto en una pestaña de sede y aún no hay sede, fija la sede actual. */
  useEffect(() => {
    if (!shell.donationModal?.isOpen) return;
    const locs = Array.isArray(shell.currentEvent?.locations) ? shell.currentEvent.locations : [];
    if (!locs.length) return;
    const tab = String(shell.activeTab || '').trim();
    if (!tab || !locs.some((l) => String(l).trim() === tab)) return;
    const cur = String(shell.donationModal.location || '').trim();
    if (cur) return;
    shell.setDonationModal((prev) => ({ ...prev, location: tab }));
  }, [
    shell.donationModal?.isOpen,
    shell.donationModal?.location,
    shell.activeTab,
    shell.currentEvent?.id,
    shell.currentEvent?.locations,
    shell.setDonationModal,
  ]);
  /** Al cambiar de sección o recargar (F5), intenta restaurar el scroll guardado para esa pantalla. */
  useLayoutEffect(() => {
    const el = mainScrollRef.current;
    if (!el) return;
    const uid = String(shell.currentUser?.id || '').trim();
    if (!uid) return;
    let nextTop = 0;
    try {
      const raw = sessionStorage.getItem(workspaceScrollStorageKey(uid));
      if (raw) {
        const bag = JSON.parse(raw);
        const n = Number(bag?.[scrollEntryKey]);
        if (Number.isFinite(n) && n > 0) nextTop = n;
      }
    } catch {
      /* ignore */
    }
    /** Doble rAF: tras F5 el contenido del panel aún puede medir 0 px; se aplica el scroll tras el layout. */
    let raf1 = 0;
    let raf2 = 0;
    const apply = () => {
      const node = mainScrollRef.current;
      if (node) node.scrollTop = nextTop;
    };
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(apply);
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [shell.currentUser?.id, scrollEntryKey]);

  /** Persiste scroll por pantalla dentro de la sesión activa del navegador. */
  useLayoutEffect(() => {
    const el = mainScrollRef.current;
    const uid = String(shell.currentUser?.id || '').trim();
    if (!el || !uid) return;
    const onScroll = () => {
      try {
        const key = workspaceScrollStorageKey(uid);
        const raw = sessionStorage.getItem(key);
        const bag = raw ? JSON.parse(raw) : {};
        bag[scrollEntryKey] = Math.max(0, Math.round(el.scrollTop || 0));
        sessionStorage.setItem(key, JSON.stringify(bag));
      } catch {
        /* ignore */
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [shell.currentUser?.id, scrollEntryKey]);

  return (
    <div className="h-dvh max-h-dvh min-h-0 bg-slate-50 font-sans text-slate-900 flex overflow-hidden relative dark:bg-slate-950 dark:text-slate-100">
      {shell.toast && (
        <div className={uiFeedback.toast}>
          <ShieldAlert size={20} className="text-amber-400 shrink-0 mt-0.5" />
          <span className="whitespace-pre-line leading-snug font-semibold">{shell.toast}</span>
        </div>
      )}

      {shell.debugToast && shell.currentUser && (
        (shell.debugToast.type === 'session-login' ||
          shell.debugToast.type === 'session-logout' ||
          shell.selectedEventId) && <PanelNoticeToast notice={shell.debugToast} />
      )}

      {shell.needsFirestoreResyncAfterBulk && (
        <div className="absolute top-0 left-0 right-0 z-50 px-3 pt-3 pointer-events-none">
          <div className="pointer-events-auto max-w-4xl mx-auto">
            <BulkRestoreResyncBanner
              onResync={shell.onReloadAfterBulkRestore}
              busy={shell.bulkResyncBusy}
            />
          </div>
        </div>
      )}

      {/* Overlay del Menú Móvil */}
      {shell.isMobileMenuOpen && (
         <div className={uiOverlay.mobileMenu} onClick={() => shell.setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar: scroll propio; en lg comparte fila a altura de viewport con el panel principal */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 max-w-[82vw] bg-slate-900 text-white flex flex-col min-h-0 h-dvh max-h-dvh overflow-hidden lg:relative lg:h-full lg:min-h-0 lg:w-72 lg:max-w-none transition-transform duration-300 lg:translate-x-0 lg:shrink-0 ${shell.isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain flex flex-col">
          <div className="p-4 lg:p-4 pb-2 shrink-0">
            <div className="flex items-start gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20 mt-1 shrink-0">
                <Edit3 size={20} />
              </div>
              <div className="w-full min-w-0">
                <div className="flex items-start gap-2 pr-1">
                  <h2 className="text-white font-black text-lg leading-tight w-full" style={{ wordBreak: 'break-word' }}>
                    {shell.currentEvent?.name}
                  </h2>
                  {shell.hasAdminRights && (
                    <button
                      onClick={() => shell.setRenameModal({ isOpen: true, id: shell.currentEvent.id, name: shell.currentEvent.name })}
                      className="text-slate-400 hover:text-indigo-300 mt-1 flex-shrink-0 transition-colors"
                      title="Renombrar Evento"
                    >
                      <Edit3 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 mt-4 pl-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Registros Vida Nueva</p>
              <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 uppercase font-bold shrink-0">
                {shell.currentEvent.eventType}
              </span>
            </div>
          </div>
          <div className="px-4 mb-3 shrink-0 space-y-3">
            <SidebarEventDatesReadOnly eventDateDraft={shell.eventDateDraft} isCampa={shell.isCampa} />
            <SidebarGlobalStateCard
              totalInscritos={shell.summary?.globalStats?.all?.count ?? 0}
              attendanceLines={shell.workspaceSidebarBadges?.attendanceLines}
              waitlistLines={shell.workspaceSidebarBadges?.waitlistLines}
              activeTotalDeduped={shell.workspaceSidebarBadges?.activeTotalDeduped}
              waitlistTotalDeduped={shell.workspaceSidebarBadges?.waitlistTotalDeduped}
              cancelledTotal={shell.workspaceSidebarBadges?.cancelledTotal}
              isSuperUser={shell.isSuperUser}
              syncFirestoreBusy={shell.syncFirestoreBusy}
              fbUser={shell.fbUser}
              onSync={shell.syncFirestoreFromServer}
            />
          </div>
          <nav className="px-2 pb-2 space-y-0.5 lg:space-y-0 shrink-0">
          <div className={`pt-1 pb-1.5 px-3 lg:pt-2 lg:pb-2 ${uiSidebar.sectionLabelNavDesktop}`}>Principal</div>
          {shell.isPanelNavSectionAllowed('dashboard') && (
          <button onClick={() => shell.goTo(shell.systemView, shell.selectedEventId, "Summary")} className={workspaceSidebarNavClassDesktop(shell.activeTab === 'Summary')}><div className={uiSidebar.navItemInnerNavDesktop}><BarChart3 size={SIDEBAR_NAV_ICON_SIZE} className={sidebarNavIconClass(shell.activeTab === 'Summary' ? 'text-indigo-400' : '')} /><span className="font-bold">Dashboard</span></div>{shell.activeTab === 'Summary' && <div className={`${uiSidebar.activeDot} bg-indigo-400`} />}</button>
          )}
          {(shell.isCampa || shell.isBautizos) && shell.isPanelNavSectionAllowed('bautizados') && (
            <button
              type="button"
              onClick={() => shell.goTo(shell.systemView, shell.selectedEventId, 'Bautizados')}
              className={workspaceSidebarNavClassDesktop(shell.activeTab === 'Bautizados')}
            >
              <div className={uiSidebar.navItemInnerNavDesktop}>
                <Church size={SIDEBAR_NAV_ICON_SIZE} className={sidebarNavIconClass(shell.activeTab === 'Bautizados' ? 'text-sky-400' : '')} />
                <span className="font-bold truncate">Bautizados</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className={sidebarSedeStyleCountBadge(shell.activeTab === 'Bautizados', true)}
                  title="Coincidencias visibles (misma regla que la página Bautizados)"
                >
                  {shell.workspaceSidebarBadges?.bautizados ?? 0}
                </div>
                {shell.activeTab === 'Bautizados' && <div className={`${uiSidebar.activeDot} bg-sky-400`} />}
              </div>
            </button>
          )}
          {(shell.isCampa || shell.isBautizos) && shell.isPanelNavSectionAllowed('serversPage') && (
            <button
              type="button"
              onClick={() => shell.goTo(shell.systemView, shell.selectedEventId, 'ServersPage')}
              className={workspaceSidebarNavClassDesktop(shell.activeTab === 'ServersPage')}
            >
              <div className={uiSidebar.navItemInnerNavDesktop}>
                <Users size={SIDEBAR_NAV_ICON_SIZE} className={sidebarNavIconClass(shell.activeTab === 'ServersPage' ? 'text-amber-400' : '')} />
                <span className="font-bold truncate">
                  {shell.isBautizos ? 'Servidores y empleados' : 'Página Servidores'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className={sidebarSedeStyleCountBadge(shell.activeTab === 'ServersPage', true)}
                  title={
                    shell.isBautizos
                      ? 'Servidores y empleados activos en sedes visibles'
                      : 'Servidores activos en sedes visibles para tu usuario'
                  }
                >
                  {shell.workspaceSidebarBadges?.servidores ?? 0}
                </div>
                {shell.activeTab === 'ServersPage' && <div className={`${uiSidebar.activeDot} bg-amber-400`} />}
              </div>
            </button>
          )}
          {shell.isPanelNavSectionAllowed('becados') && !shell.isBautizos && (
            <button
              onClick={() => shell.goTo(shell.systemView, shell.selectedEventId, 'Becados')}
              className={workspaceSidebarNavClassDesktop(shell.activeTab === 'Becados')}
            >
              <div className={uiSidebar.navItemInnerNavDesktop}>
                <GraduationCap size={SIDEBAR_NAV_ICON_SIZE} className={sidebarNavIconClass(shell.activeTab === 'Becados' ? 'text-purple-400' : '')} />
                <span className="font-bold">Becados</span>
              </div>
              {shell.activeTab === 'Becados' && <div className={`${uiSidebar.activeDot} bg-purple-400`} />}
            </button>
          )}
          {shell.isPanelNavSectionAllowed('becados') && shell.isBautizos && (
            <button
              type="button"
              onClick={() => shell.goTo(shell.systemView, shell.selectedEventId, 'BautizosCompanions')}
              className={workspaceSidebarNavClassDesktop(shell.activeTab === 'BautizosCompanions')}
            >
              <div className={uiSidebar.navItemInnerNavDesktop}>
                <UserPlus size={SIDEBAR_NAV_ICON_SIZE} className={sidebarNavIconClass(shell.activeTab === 'BautizosCompanions' ? 'text-teal-400' : '')} />
                <span className="font-bold truncate">Acompañantes</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className={sidebarSedeStyleCountBadge(shell.activeTab === 'BautizosCompanions', true)}
                  title="Acompañantes únicos (plan canónico) en sedes visibles"
                >
                  {shell.workspaceSidebarBadges?.acompanantes ?? 0}
                </div>
                {shell.activeTab === 'BautizosCompanions' && <div className={`${uiSidebar.activeDot} bg-teal-400`} />}
              </div>
            </button>
          )}
          {shell.hasAdminRights && shell.isPanelNavSectionAllowed('responsivas') && isResponsivaEventSectionVisible(shell.currentEvent) && (
            <button
              onClick={() => shell.goTo(shell.systemView, shell.selectedEventId, 'Responsivas')}
              className={workspaceSidebarNavClassDesktop(shell.activeTab === 'Responsivas')}
            >
              <div className={uiSidebar.navItemInnerNavDesktop}>
                <FileSignature size={SIDEBAR_NAV_ICON_SIZE} className={sidebarNavIconClass(shell.activeTab === 'Responsivas' ? 'text-emerald-400' : '')} />
                <span className="font-bold">Responsivas</span>
              </div>
              {shell.activeTab === 'Responsivas' && <div className={`${uiSidebar.activeDot} bg-emerald-400`} />}
            </button>
          )}
          {shell.hasAdminRights && (
            <button
              type="button"
              onClick={() => shell.goTo(shell.systemView, shell.selectedEventId, 'PastoresPage')}
              className={workspaceSidebarNavClassDesktop(shell.activeTab === 'PastoresPage')}
            >
              <div className={uiSidebar.navItemInnerNavDesktop}>
                <Church size={SIDEBAR_NAV_ICON_SIZE} className={sidebarNavIconClass(shell.activeTab === 'PastoresPage' ? 'text-violet-400' : '')} />
                <span className="font-bold">Pastores</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {typeof shell.workspaceSidebarBadges?.pastores === 'number' ? (
                  <div
                    className={sidebarSedeStyleCountBadge(shell.activeTab === 'PastoresPage', true)}
                    title="Pastores registrados en sedes visibles"
                  >
                    {shell.workspaceSidebarBadges.pastores}
                  </div>
                ) : null}
                {shell.activeTab === 'PastoresPage' && <div className={`${uiSidebar.activeDot} bg-violet-400`} />}
              </div>
            </button>
          )}
          {shell.isPanelNavSectionAllowed('transporte') && (
            <button
              type="button"
              onClick={() => shell.goTo(shell.systemView, shell.selectedEventId, 'TransportPlanning')}
              className={workspaceSidebarNavClassDesktop(shell.activeTab === 'TransportPlanning')}
            >
              <div className={uiSidebar.navItemInnerNavDesktop}>
                <Bus size={SIDEBAR_NAV_ICON_SIZE} className={sidebarNavIconClass(shell.activeTab === 'TransportPlanning' ? 'text-cyan-400' : '')} />
                <span className="font-bold">Transporte</span>
              </div>
              {shell.activeTab === 'TransportPlanning' && <div className={`${uiSidebar.activeDot} bg-cyan-400`} />}
            </button>
          )}
          {shell.isPanelNavSectionAllowed('cashCut') && (
            <button onClick={() => shell.goTo(shell.systemView, shell.selectedEventId, "CashCut")} className={workspaceSidebarNavClassDesktop(shell.activeTab === 'CashCut')}><div className={uiSidebar.navItemInnerNavDesktop}><Scissors size={SIDEBAR_NAV_ICON_SIZE} className={sidebarNavIconClass(shell.activeTab === 'CashCut' ? 'text-green-400' : '')} /><span className="font-bold">Corte de Caja</span></div>{shell.activeTab === 'CashCut' && <div className={`${uiSidebar.activeDot} bg-green-400`} />}</button>
          )}
          {shell.canAccessExpenses && shell.isPanelNavSectionAllowed('expenseList') && (
            <button onClick={() => shell.goTo(shell.systemView, shell.selectedEventId, "ExpenseList")} className={workspaceSidebarNavClassDesktop(shell.activeTab === 'ExpenseList')}><div className={uiSidebar.navItemInnerNavDesktop}><Receipt size={SIDEBAR_NAV_ICON_SIZE} className={sidebarNavIconClass(shell.activeTab === 'ExpenseList' ? 'text-emerald-400' : '')} /><span className="font-bold">Lista de Gastos</span></div>{shell.activeTab === 'ExpenseList' && <div className={`${uiSidebar.activeDot} bg-emerald-400`} />}</button>
          )}
          
          {shell.isPanelNavSectionAllowed('locations') && (
          <>
          <div className={`${uiSidebar.sectionWrapNavDesktop} px-2`}>
            <span className={uiSidebar.sectionLabelNavDesktop}>Sedes Disponibles</span>
            {shell.hasAdminRights && <button onClick={() => shell.setIsAddLocModalOpen(true)} className="bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 p-0.5 lg:p-1 rounded transition-colors" title="Añadir Sede"><Plus size={12} className="lg:w-[14px] lg:h-[14px]" /></button>}
          </div>
          {shell.visibleLocations.map(loc => (
            <div key={loc} className="flex flex-col mb-1">
              <button onClick={() => shell.goTo(shell.systemView, shell.selectedEventId, loc)} className={workspaceSidebarSedeClassDesktop(shell.activeTab === loc)}>
                <div className={uiSidebar.navItemInnerNavDesktop}>
                  <MapPin size={SIDEBAR_NAV_ICON_SIZE} className={sidebarNavIconClass(shell.activeTab === loc ? 'text-white' : 'text-slate-700 group-hover:text-slate-500')} />
                  <span className="font-bold truncate">{loc}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!shell.isLocOpen(loc) && <span className="text-[7px] lg:text-[7px] bg-red-500/20 text-red-400 px-1 py-px rounded uppercase font-bold border border-red-500/30">Cerrada</span>}
                  <div
                    className={sidebarSedeStyleCountBadge(shell.activeTab === loc, true)}
                    title={
                      shell.isBautizos
                        ? 'Personas activas en esta sede (misma base deduplicada que el dashboard y el cupo)'
                        : 'Inscritos activos en esta sede (total en base de datos, sin filtros de lista)'
                    }
                  >
                    {shell.workspaceSidebarBadges?.sedeCounts?.[loc] ?? (shell.data[loc] || []).length}
                  </div>
                  {shell.hasAdminRights && <div onClick={(e) => { e.stopPropagation(); shell.handleDeleteLocation(loc); }} className={`p-1 lg:p-1 rounded-md transition-colors ${shell.activeTab === loc ? 'hover:bg-indigo-500 text-indigo-200 hover:text-white' : 'text-slate-600 hover:bg-slate-800 hover:text-red-400'}`} title="Eliminar Sede"><Trash2 size={12} className="lg:w-[14px] lg:h-[14px]" /></div>}
                </div>
              </button>
              {shell.locError === loc && <span className="text-[10px] text-red-400 font-bold px-4 pt-1 animate-in slide-in-from-top-1 text-left">Sede con registros.</span>}
            </div>
          ))}
          </>
          )}
          {shell.isPanelNavSectionAllowed('registroGlobal') && (
          <>
          <div className={`${uiSidebar.sectionWrapNavDesktop} mt-2`}>
            <span className={uiSidebar.sectionLabelNavDesktop}>Consolidado</span>
          </div>
          <button
            onClick={() => shell.goTo(shell.systemView, shell.selectedEventId, 'RegistroGlobal')}
            className={workspaceSidebarNavClassDesktop(shell.activeTab === 'RegistroGlobal')}
          >
            <div className={uiSidebar.navItemInnerNavDesktop}>
              <TableProperties size={SIDEBAR_NAV_ICON_SIZE} className={sidebarNavIconClass(shell.activeTab === 'RegistroGlobal' ? 'text-indigo-400' : '')} />
              <span className="font-bold">Registro Global</span>
            </div>
            {shell.activeTab === 'RegistroGlobal' && <div className={`${uiSidebar.activeDot} bg-indigo-400`} />}
          </button>
          </>
          )}
          </nav>
          <div className="shrink-0 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 border-t border-slate-800/60">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1.5 px-1">Apariencia</p>
            <button
              type="button"
              onClick={() => shell.toggleDarkMode?.()}
              className="w-full flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-colors touch-manipulation"
            >
              <span className="flex items-center gap-2 min-w-0">
                {shell.darkMode ? (
                  <Sun size={14} className="text-amber-300 shrink-0" aria-hidden />
                ) : (
                  <Moon size={14} className="text-indigo-300 shrink-0" aria-hidden />
                )}
                <span className="text-[11px] font-bold text-slate-200 truncate">
                  {shell.darkMode ? 'Modo claro' : 'Modo oscuro'}
                </span>
              </span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden bg-[#f8fafc] dark:bg-slate-950">
        <header className="z-10 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm pl-3 pr-3 sm:pl-4 md:pl-8 md:pr-20 py-2.5 md:py-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="flex items-center gap-2 min-w-0 flex-1 lg:gap-3">
            <button
              type="button"
              onClick={() => shell.setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 min-w-[2.5rem] min-h-[2.5rem] flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors shrink-0"
              title="Abrir menú"
            >
              <Menu size={18} />
            </button>

            {/* Móvil: flechas + nombre del evento */}
            <div className="lg:hidden flex items-center gap-1.5 min-w-0 flex-1">
              {(shell.navHistory.length > 0 || shell.forwardNavStack.length > 0) && (
                <div className="flex items-center gap-0.5 shrink-0">
                  {shell.navHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={shell.goBack}
                      className="p-2 min-w-[2.25rem] min-h-[2.25rem] flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors border border-slate-200 dark:border-slate-600"
                      title="Regresar"
                    >
                      <ArrowLeft size={16} />
                    </button>
                  )}
                  {shell.forwardNavStack.length > 0 && (
                    <button
                      type="button"
                      onClick={shell.goForward}
                      className="p-2 min-w-[2.25rem] min-h-[2.25rem] flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors border border-slate-200 dark:border-slate-600"
                      title="Avanzar"
                    >
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              )}
              <h2 className="min-w-0 flex-1 text-slate-800 dark:text-slate-100 font-black text-sm leading-tight truncate flex items-center gap-1.5">
                <span className="truncate">{shell.currentEvent?.name}</span>
                {shell.currentEvent?._isDebug && shell.currentEvent?._debugSessionId === shell.globalConfig?.debugSessionId && (
                  <Bug size={13} className="text-orange-500 shrink-0" title="Cambio no permanente" />
                )}
              </h2>
            </div>

            {/* Escritorio: flechas separadas */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              {shell.navHistory.length > 0 && (
                <button
                  type="button"
                  onClick={shell.goBack}
                  className="p-2.5 min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  title="Regresar"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              {shell.forwardNavStack.length > 0 && (
                <button
                  type="button"
                  onClick={shell.goForward}
                  className="p-2.5 min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  title="Avanzar"
                >
                  <ArrowRight size={18} />
                </button>
              )}
            </div>

            {/* Escritorio: título del evento */}
            <h2 className="hidden lg:flex flex-1 min-w-0 text-slate-800 dark:text-slate-100 font-black text-base leading-tight truncate items-center gap-1.5">
              <span className="truncate">{shell.currentEvent?.name}</span>
              {shell.currentEvent?._isDebug && shell.currentEvent?._debugSessionId === shell.globalConfig?.debugSessionId && (
                <Bug size={13} className="text-orange-500 shrink-0" title="Cambio no permanente" />
              )}
            </h2>
          </div>

          <div className="flex flex-col gap-2.5 w-full lg:w-auto lg:flex-row lg:items-center lg:justify-end lg:gap-3 lg:flex-shrink-0">
            <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 w-full lg:w-auto">
              {shell.isSuperUser ? (
                <AppVersionBadge variant="workspace-inline" currentUser={shell.currentUser} className="px-0.5" />
              ) : null}
              <button
                type="button"
                onClick={() => shell.goTo('events', null, 'Summary')}
                className="inline-flex items-center justify-center gap-1.5 min-h-[2.25rem] lg:min-h-[2.5rem] px-2.5 sm:px-3 rounded-full text-xs font-bold text-indigo-800 bg-indigo-100 hover:bg-indigo-200 border border-indigo-300 dark:border-indigo-700 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-700 transition-colors shadow-sm"
                title="Cambiar de Evento"
              >
                <LayoutDashboard size={14} className="shrink-0" />
                Eventos
              </button>
              {(shell.hasAdminRights || ['Editor', 'Lector'].includes(String(shell.currentUser?.role || ''))) && (
                <button
                  type="button"
                  onClick={() => shell.goTo('users', null, 'Summary')}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[2.25rem] px-2.5 sm:px-3 rounded-full text-xs font-bold text-indigo-800 bg-indigo-100 hover:bg-indigo-200 border border-indigo-300 dark:border-indigo-700 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-700 transition-colors shadow-sm"
                  title={shell.hasAdminRights ? 'Gestión de Usuarios' : 'Mi cuenta'}
                >
                  <UserCog size={14} className="shrink-0" />
                  {shell.hasAdminRights ? 'Usuarios' : 'Mi cuenta'}
                </button>
              )}
              <button
                type="button"
                onClick={shell.openExcelExportPicker}
                disabled={shell.isExporting}
                className="inline-flex items-center justify-center gap-1.5 min-h-[2.25rem] px-2.5 sm:px-3 rounded-full text-xs font-bold text-emerald-800 bg-emerald-200 hover:bg-emerald-300 border border-emerald-300 dark:border-emerald-700 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Exportar Todo a Excel"
              >
                {shell.isExporting ? <span className="animate-spin">?</span> : <FileSpreadsheet size={14} className="shrink-0" />}
                {shell.isExporting ? 'Generando...' : 'Excel'}
              </button>
              {shell.hasFinancialAccess && (
                <button
                  type="button"
                  onClick={() => shell.setShowMoney(!shell.showMoney)}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[2.25rem] px-2.5 sm:px-3 rounded-full text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title={shell.showMoney ? 'Ocultar Dinero' : 'Mostrar Dinero'}
                >
                  {shell.showMoney ? <EyeOff size={14} className="shrink-0" /> : <Eye size={14} className="shrink-0" />}
                  {shell.showMoney ? 'Ocultar $' : 'Mostrar $'}
                </button>
              )}
              {shell.isSuperUser && (
                <button
                  type="button"
                  onClick={shell.toggleDebugMode}
                  className={`inline-flex items-center justify-center gap-1.5 min-h-[2.25rem] px-2.5 sm:px-3 rounded-full text-xs font-bold transition-colors shadow-sm ${
                    shell.globalConfig?.isDebugMode
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-red-200'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                  title="Modo de prueba aislada"
                >
                  <Bug size={14} className="shrink-0" />
                  {shell.globalConfig?.isDebugMode ? 'Salir Dep.' : 'Depurar'}
                </button>
              )}
              {shell.currentUser?.role !== 'Lector' && (
                <button
                  type="button"
                  onClick={() => shell.goTo('logs', null, 'Summary')}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[2.25rem] px-2.5 sm:px-3 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Logs Globales"
                >
                  <History size={14} className="shrink-0" />
                  Logs
                </button>
              )}
              <button
                type="button"
                onClick={shell.handleLogout}
                className="inline-flex items-center justify-center gap-1.5 min-h-[2.25rem] px-2.5 sm:px-3 rounded-full text-xs font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 border border-rose-300 dark:border-rose-700 dark:bg-rose-600 dark:text-white dark:hover:bg-rose-700 transition-colors shadow-sm"
                title="Cerrar Sesión"
              >
                <LogOut size={14} className="shrink-0" />
                Salir
              </button>
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-600 max-w-full min-w-0 lg:hidden">
                <UserCircle size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[120px] sm:max-w-[180px]">
                  {shell.currentUser.username}
                </span>
                {shell.isSuperUser && (
                  <span
                    className="text-[8px] font-black uppercase tracking-wide text-emerald-800 bg-emerald-50 border border-emerald-200 dark:text-emerald-200 dark:bg-slate-900 dark:border-emerald-700 px-1.5 py-0.5 rounded-full whitespace-nowrap"
                    title="Sesiones activas en tiempo real"
                  >
                    {shell.superSessionCount} ses.
                  </span>
                )}
              </div>
            </div>

            <div className="hidden lg:flex lg:flex-wrap lg:items-center lg:justify-end lg:gap-2 lg:pl-2 lg:border-l lg:border-slate-200 dark:lg:border-slate-700">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-full border border-slate-200 dark:border-slate-600 max-w-full min-w-0">
                <UserCircle size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate max-w-[180px]">
                  {shell.currentUser.username}
                </span>
              </div>
              {shell.isSuperUser && (
                <span
                  className="text-[9px] font-black uppercase tracking-wide text-emerald-800 bg-emerald-50 border border-emerald-200 dark:text-emerald-200 dark:bg-slate-900 dark:border-emerald-700 px-2 py-1 rounded-full whitespace-nowrap"
                  title="Sesiones activas en tiempo real"
                >
                  Activo {shell.superSessionCount} sesión{shell.superSessionCount === 1 ? '' : 'es'}
                </span>
              )}
            </div>
          </div>
        </header>
        {editRegistryModalOpen ? (
          <div className="hidden md:flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden z-10 bg-white dark:bg-slate-950 animate-in fade-in duration-150">
            {renderEditRegistryModalChrome(
              'flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-6 lg:p-8 space-y-6'
            )}
          </div>
        ) : null}
        <div
          ref={mainScrollRef}
          data-vnpm-workspace-scroll
          className={`flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden overscroll-y-contain ${editRegistryModalOpen ? 'md:hidden' : ''}`}
        >
          {shell.activeTab === "Summary" && shell.isPanelNavSectionAllowed('dashboard') && shell.renderSummary()}
          {shell.activeTab === 'Bautizados' &&
            (shell.isCampa || shell.isBautizos) &&
            shell.isPanelNavSectionAllowed('bautizados') &&
            shell.renderBautizadosPage()}
          {shell.activeTab === 'ServersPage' &&
            (shell.isCampa || shell.isBautizos) &&
            shell.isPanelNavSectionAllowed('serversPage') &&
            shell.renderServerProfilesPage()}
          {shell.activeTab === 'Becados' &&
            !shell.isBautizos &&
            shell.isPanelNavSectionAllowed('becados') &&
            shell.renderBecadosPage()}
          {shell.activeTab === 'BautizosCompanions' &&
            shell.isPanelNavSectionAllowed('becados') &&
            shell.isBautizos &&
            shell.renderBautizosCompanionsPage()}
          {shell.activeTab === 'Responsivas' && shell.hasAdminRights && shell.isCampa && shell.renderResponsivasPage()}
          {shell.activeTab === 'PastoresPage' && shell.hasAdminRights && shell.renderPastoresPage()}
          {shell.activeTab === 'TransportPlanning' &&
            shell.isPanelNavSectionAllowed('transporte') &&
            shell.renderTransportPlanningPage()}
          {shell.activeTab === 'RegistroGlobal' && shell.isPanelNavSectionAllowed('registroGlobal') && shell.renderGlobalRegistryPage()}
          {shell.activeTab === "CashCut" && shell.isPanelNavSectionAllowed('cashCut') && shell.renderCashCutPage()}
          {shell.activeTab === "ExpenseList" && shell.canAccessExpenses && shell.isPanelNavSectionAllowed('expenseList') && shell.renderExpenseListPage()}
          {shell.visibleLocations.includes(shell.activeTab) && shell.isPanelNavSectionAllowed('locations') && shell.renderLocationSheet(shell.activeTab)}
        </div>
      </main>

      {/* EDIT REGISTRY MODAL — móvil: overlay centrado; escritorio: panel bajo el header en <main> */}
      {editRegistryModalOpen ? (
        <div className={`${uiOverlay.modal} md:hidden`}>
          <div className="bg-white dark:bg-slate-950 rounded-3xl shadow-2xl w-full max-w-4xl my-auto animate-in zoom-in-95 duration-200 overflow-hidden">
            {renderEditRegistryModalChrome('p-6 sm:p-8 space-y-6 max-h-[85vh] overflow-y-auto')}
          </div>
        </div>
      ) : null}

      {/* PRICING MODAL */}
      {shell.pricingModal.isOpen && (
        <div className={uiOverlay.modal}>
          <form
            className="bg-white rounded-3xl p-4 sm:p-5 shadow-2xl w-full max-w-3xl animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto"
            onSubmit={(e) => {
              e.preventDefault();
              void shell.handleSavePricing();
            }}
          >
            <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
              <Settings2 className="text-indigo-600 shrink-0" size={20} /> Configuración de precios
            </h3>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 mb-3">
              <label className={shell.labelClassesPhase}>Fecha límite de pago (opcional)</label>
              <input
                type="date"
                className={shell.inputClassesPhase}
                disabled={!shell.hasAdminRights}
                value={shell.pricingForm.paymentDeadlineDate || ''}
                onChange={(e) =>
                  shell.setPricingForm({ ...shell.pricingForm, paymentDeadlineDate: e.target.value })
                }
                max={getEventEffectiveEndDate(shell.currentEvent) || undefined}
              />
              <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                Último día para liquidar; se incluye en los recordatorios automáticos por WhatsApp (saldo pendiente). Las fases «Hasta» no pueden ser posteriores a esta fecha ni al fin del evento. Solo administradores pueden modificarla.
              </p>
            </div>
            <div className="space-y-2 mb-1">
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-2">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 shrink-0"><UserCircle size={14} /></div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900">Campista</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-indigo-950">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                        checked={shell.pricingForm.camperPricingMode === 'fixed'}
                        onChange={(e) => shell.setPricingForm({ ...shell.pricingForm, camperPricingMode: e.target.checked ? 'fixed' : 'dynamic' })}
                      />
                      Precio fijo
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                        checked={shell.pricingForm.camperPricingMode === 'dynamic'}
                        onChange={(e) => shell.setPricingForm({ ...shell.pricingForm, camperPricingMode: e.target.checked ? 'dynamic' : 'fixed' })}
                      />
                      Por fechas
                    </label>
                  </div>
                </div>
                {shell.pricingForm.camperPricingMode === 'fixed' ? (
                  <div className="bg-white rounded-lg border border-indigo-100/90 p-2 space-y-0.5">
                    <label className={shell.labelClassesPhase}>Costo base</label>
                    <input type="number" className={shell.inputClassesPhase} value={shell.pricingForm.globalCost} onChange={e => shell.setPricingForm({ ...shell.pricingForm, globalCost: e.target.value })} />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1 max-h-[min(9.5rem,32vh)] overflow-y-auto pr-0.5">
                      {shell.pricingForm.phases.map((phase, index) => (
                        <div key={phase.id} className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 items-end bg-white p-1.5 rounded-md border border-indigo-100">
                          <div className="sm:col-span-5">
                            <label className={shell.labelClassesPhase}>Hasta</label>
                            <input type="date" max={getPhaseDateMaxCap(shell.currentEvent, shell.pricingForm) || undefined} className={shell.inputClassesPhase} value={phase.dateUntil} onChange={e => { const newPhases = [...shell.pricingForm.phases]; newPhases[index].dateUntil = e.target.value; shell.setPricingForm({ ...shell.pricingForm, phases: newPhases }); }} />
                          </div>
                          <div className="sm:col-span-5">
                            <label className={shell.labelClassesPhase}>Costo</label>
                            <input type="number" className={shell.inputClassesPhase} value={phase.globalCost} onChange={e => { const newPhases = [...shell.pricingForm.phases]; newPhases[index].globalCost = e.target.value; shell.setPricingForm({ ...shell.pricingForm, phases: newPhases }); }} />
                          </div>
                          <div className="sm:col-span-2 flex justify-end pb-0.5">
                            <button type="button" onClick={() => { const newPhases = shell.pricingForm.phases.filter((_, i) => i !== index); shell.setPricingForm({ ...shell.pricingForm, phases: newPhases }); }} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Quitar fase"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => shell.setPricingForm({ ...shell.pricingForm, phases: [...shell.pricingForm.phases, { id: Date.now(), dateUntil: '', globalCost: 0 }] })} className="mt-1.5 w-full py-1.5 border border-dashed border-indigo-300 text-indigo-600 rounded-lg font-bold text-[10px] hover:bg-indigo-100/80 transition-colors flex items-center justify-center gap-1"><Plus size={12} /> Añadir fase</button>
                    <div className="mt-1.5 pt-1.5 border-t border-indigo-200/80 space-y-0.5">
                      <label className={shell.labelClassesPhase}>Costo final</label>
                      <input type="number" className={shell.inputClassesPhase} value={shell.pricingForm.globalCost} onChange={e => shell.setPricingForm({ ...shell.pricingForm, globalCost: e.target.value })} />
                    </div>
                  </>
                )}
              </div>
              {shell.isCampa && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2 dark:bg-amber-950 dark:border-amber-600">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 shrink-0 dark:bg-amber-400 dark:text-amber-950">
                        <Users size={14} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 dark:text-amber-100">
                        Servidor
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-amber-950 dark:text-amber-100">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded border-amber-400 text-amber-700 focus:ring-amber-500 shrink-0"
                          checked={shell.pricingForm.serverPricingMode === 'fixed'}
                          onChange={(e) =>
                            shell.setPricingForm((prev) => ({
                              ...prev,
                              serverPricingMode: e.target.checked ? 'fixed' : 'dynamic',
                              serverPhases: e.target.checked ? prev.serverPhases : (prev.serverPhases.length === 0 ? [{ id: Date.now(), dateUntil: '', serverCostTeens: '', serverCostJovenes: '', serverCostAmbos: '' }] : prev.serverPhases),
                            }))
                          }
                        />
                        Precio fijo
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded border-amber-400 text-amber-700 focus:ring-amber-500 shrink-0"
                          checked={shell.pricingForm.serverPricingMode === 'dynamic'}
                          onChange={(e) =>
                            shell.setPricingForm((prev) => ({
                              ...prev,
                              serverPricingMode: e.target.checked ? 'dynamic' : 'fixed',
                              serverPhases: e.target.checked && prev.serverPhases.length === 0 ? [{ id: Date.now(), dateUntil: '', serverCostTeens: '', serverCostJovenes: '', serverCostAmbos: '' }] : prev.serverPhases,
                            }))
                          }
                        />
                        Por fechas
                      </label>
                    </div>
                  </div>
                  {shell.pricingForm.serverPricingMode === 'fixed' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 bg-white rounded-lg border border-amber-100 p-2">
                      <div><label className={shell.labelClassesPhase}>Teens</label><input type="number" className={shell.inputClassesPhase} value={shell.pricingForm.serverCostTeens} onChange={e => shell.setPricingForm({ ...shell.pricingForm, serverCostTeens: e.target.value })} /></div>
                      <div><label className={shell.labelClassesPhase}>Jóvenes</label><input type="number" className={shell.inputClassesPhase} value={shell.pricingForm.serverCostJovenes} onChange={e => shell.setPricingForm({ ...shell.pricingForm, serverCostJovenes: e.target.value })} /></div>
                      <div><label className={shell.labelClassesPhase}>Ambos</label><input type="number" className={shell.inputClassesPhase} value={shell.pricingForm.serverCostAmbos} onChange={e => shell.setPricingForm({ ...shell.pricingForm, serverCostAmbos: e.target.value })} /></div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 pt-0.5">
                      <div className="space-y-1 max-h-[min(11rem,36vh)] overflow-y-auto pr-0.5">
                        {shell.pricingForm.serverPhases.map((phase, index) => (
                          <div key={phase.id} className="bg-white p-1.5 rounded-md border border-amber-100">
                            <div className="grid grid-cols-1 min-[480px]:grid-cols-12 gap-1.5 items-end">
                              <div className="min-[480px]:col-span-4">
                                <label className={shell.labelClassesPhase}>Hasta</label>
                                <input type="date" max={getPhaseDateMaxCap(shell.currentEvent, shell.pricingForm) || undefined} className={shell.inputClassesPhase} value={phase.dateUntil} onChange={e => { const sp = [...shell.pricingForm.serverPhases]; sp[index] = { ...sp[index], dateUntil: e.target.value }; shell.setPricingForm({ ...shell.pricingForm, serverPhases: sp }); }} />
                              </div>
                              <div className="min-[480px]:col-span-2">
                                <label className={shell.labelClassesPhase}>Teens</label>
                                <input type="number" className={shell.inputClassesPhase} value={phase.serverCostTeens ?? ''} onChange={e => { const sp = [...shell.pricingForm.serverPhases]; sp[index] = { ...sp[index], serverCostTeens: e.target.value }; shell.setPricingForm({ ...shell.pricingForm, serverPhases: sp }); }} />
                              </div>
                              <div className="min-[480px]:col-span-2">
                                <label className={shell.labelClassesPhase}>Jóvenes</label>
                                <input type="number" className={shell.inputClassesPhase} value={phase.serverCostJovenes ?? ''} onChange={e => { const sp = [...shell.pricingForm.serverPhases]; sp[index] = { ...sp[index], serverCostJovenes: e.target.value }; shell.setPricingForm({ ...shell.pricingForm, serverPhases: sp }); }} />
                              </div>
                              <div className="min-[480px]:col-span-2">
                                <label className={shell.labelClassesPhase}>Ambos</label>
                                <input type="number" className={shell.inputClassesPhase} value={phase.serverCostAmbos ?? ''} onChange={e => { const sp = [...shell.pricingForm.serverPhases]; sp[index] = { ...sp[index], serverCostAmbos: e.target.value }; shell.setPricingForm({ ...shell.pricingForm, serverPhases: sp }); }} />
                              </div>
                              <div className="min-[480px]:col-span-2 flex justify-end pb-0.5">
                                <button type="button" onClick={() => shell.setPricingForm({ ...shell.pricingForm, serverPhases: shell.pricingForm.serverPhases.filter((_, i) => i !== index) })} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Quitar fase"><Trash2 size={14} /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => shell.setPricingForm({ ...shell.pricingForm, serverPhases: [...shell.pricingForm.serverPhases, { id: Date.now(), dateUntil: '', serverCostTeens: '', serverCostJovenes: '', serverCostAmbos: '' }] })} className="w-full py-1.5 border border-dashed border-amber-300 text-amber-900 rounded-lg font-bold text-[10px] hover:bg-amber-100/80 transition-colors flex items-center justify-center gap-1"><Plus size={12} /> Añadir fase servidor</button>
                      <div className="pt-1.5 border-t border-amber-200/80">
                        <p className="text-[9px] font-black uppercase tracking-wider text-amber-950 dark:text-amber-100 mb-1">
                          Precio final servidor
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                          <div><label className={shell.labelClassesPhase}>Teens</label><input type="number" className={shell.inputClassesPhase} value={shell.pricingForm.serverCostTeens} onChange={e => shell.setPricingForm({ ...shell.pricingForm, serverCostTeens: e.target.value })} /></div>
                          <div><label className={shell.labelClassesPhase}>Jóvenes</label><input type="number" className={shell.inputClassesPhase} value={shell.pricingForm.serverCostJovenes} onChange={e => shell.setPricingForm({ ...shell.pricingForm, serverCostJovenes: e.target.value })} /></div>
                          <div><label className={shell.labelClassesPhase}>Ambos</label><input type="number" className={shell.inputClassesPhase} value={shell.pricingForm.serverCostAmbos} onChange={e => shell.setPricingForm({ ...shell.pricingForm, serverCostAmbos: e.target.value })} /></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-4 p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800"><Percent size={14} /></div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900">Campañas de descuento</span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                {(shell.pricingForm.campaigns || []).map((c, idx) => (
                  <div
                    key={c.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 bg-white p-1.5 rounded-lg border border-emerald-100 items-end"
                  >
                    <input className={`${shell.inputClasses} sm:col-span-3`} placeholder="Concepto" value={c.concept || ''} onChange={(e) => { const next = [...(shell.pricingForm.campaigns || [])]; next[idx] = { ...next[idx], concept: e.target.value }; shell.setPricingForm({ ...shell.pricingForm, campaigns: next }); }} />
                    <select className={`${shell.inputClasses} sm:col-span-2`} value={c.appliesTo || 'all'} onChange={(e) => { const next = [...(shell.pricingForm.campaigns || [])]; next[idx] = { ...next[idx], appliesTo: e.target.value }; shell.setPricingForm({ ...shell.pricingForm, campaigns: next }); }}>
                      <option value="all">Todos</option>
                      <option value="general">General</option>
                      <option value="server_ambos">Servidor Ambos</option>
                    </select>
                    <input type="number" className={`${shell.inputClasses} sm:col-span-2`} placeholder="Liquidar" value={c.finalAmount || ''} onChange={(e) => { const next = [...(shell.pricingForm.campaigns || [])]; next[idx] = { ...next[idx], finalAmount: e.target.value }; shell.setPricingForm({ ...shell.pricingForm, campaigns: next }); }} />
                    <div className="space-y-0.5 sm:col-span-2">
                      <label className="text-[9px] font-bold uppercase tracking-wide text-emerald-800/90">Inicio</label>
                      <input type="date" className={shell.inputClasses} value={c.startDate || ''} onChange={(e) => { const next = [...(shell.pricingForm.campaigns || [])]; next[idx] = { ...next[idx], startDate: e.target.value }; shell.setPricingForm({ ...shell.pricingForm, campaigns: next }); }} />
                    </div>
                    <div className="flex items-end gap-1.5 sm:col-span-3">
                      <div className="flex-1 space-y-0.5 min-w-0">
                        <label className="text-[9px] font-bold uppercase tracking-wide text-emerald-800/90">Fin</label>
                        <input type="date" className={shell.inputClasses} value={c.endDate || ''} onChange={(e) => { const next = [...(shell.pricingForm.campaigns || [])]; next[idx] = { ...next[idx], endDate: e.target.value }; shell.setPricingForm({ ...shell.pricingForm, campaigns: next }); }} />
                      </div>
                      <button type="button" onClick={() => shell.setPricingForm({ ...shell.pricingForm, campaigns: (shell.pricingForm.campaigns || []).filter((_, i) => i !== idx) })} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg shrink-0"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => shell.setPricingForm({ ...shell.pricingForm, campaigns: [...(shell.pricingForm.campaigns || []), { id: Date.now(), concept: '', appliesTo: 'all', finalAmount: 0, startDate: '', endDate: '', enabled: true }] })}
                className="w-full py-2 border border-dashed border-emerald-300 text-emerald-800 rounded-lg font-bold text-[11px] hover:bg-emerald-100/80 transition-colors"
              >
                + Añadir campaña
              </button>
            </div>
            <div className="flex gap-3 pt-4 mt-4 border-t border-slate-100">
              <button type="button" onClick={() => shell.setPricingModal({ isOpen: false })} className={shell.btnSecondary}>Cancelar</button>
              <button type="submit" className={shell.btnPrimary}><CheckCircle2 size={20} /> Guardar precios</button>
            </div>
          </form>
        </div>
      )}

      {shell.cashCutScheduleModal.isOpen && shell.currentEvent && (
        <div className={uiOverlay.modal}>
          <form
            className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
            onSubmit={(e) => {
              e.preventDefault();
              void shell.handleSaveCashCutScheduleByLocation();
            }}
          >
            <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
              <MapPin className="text-indigo-600" size={22} /> Horarios por sede
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              En cada sede activa los servicios que apliquen (Primero, Segundo, Tercero) y define inicio y fin de cada uno. Debe quedar al menos un servicio por sede. Si ya hay pagos con otro servicio, el corte puede mostrar esa columna igualmente.
            </p>
            <div className="space-y-5">
              {(shell.currentEvent.locations || []).map((loc) => (
                <div key={loc} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                  <p className="text-xs font-black text-slate-700 uppercase tracking-wider">{loc}</p>
                  {SERVICE_OPTIONS.map((svc) => {
                    const checked = !!(shell.cashCutScheduleForm[loc]?.[svc]);
                    return (
                      <div key={svc} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end bg-white border border-slate-100 rounded-xl p-3">
                        <label className="flex items-center gap-2 sm:col-span-4 cursor-pointer text-sm font-bold text-slate-700">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            checked={checked}
                            onChange={() => shell.toggleCashCutServiceForLoc(loc, svc)}
                          />
                          {svc}
                        </label>
                        <div className="space-y-1 sm:col-span-4">
                          <label className={shell.labelClasses}>Inicio</label>
                          <input
                            type="time"
                            disabled={!checked}
                            className={`${shell.inputClasses} ${!checked ? 'opacity-50' : ''}`}
                            value={shell.cashCutScheduleForm[loc]?.[svc]?.start || ''}
                            onChange={(e) => shell.setCashCutSlotTimeForLoc(loc, svc, 'start', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-4">
                          <label className={shell.labelClasses}>Fin</label>
                          <input
                            type="time"
                            disabled={!checked}
                            className={`${shell.inputClasses} ${!checked ? 'opacity-50' : ''}`}
                            value={shell.cashCutScheduleForm[loc]?.[svc]?.end || ''}
                            onChange={(e) => shell.setCashCutSlotTimeForLoc(loc, svc, 'end', e.target.value)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex gap-4 pt-6 mt-6 border-t border-slate-100">
              <button type="button" onClick={() => shell.setCashCutScheduleModal({ isOpen: false })} className={shell.btnSecondary}>Cancelar</button>
              <button type="submit" className={shell.btnPrimary}>
                <CheckCircle2 size={20} /> Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {shell.serveAreaOptionsModal.isOpen && (
        <div className={uiModal.overlayNested} role="dialog" aria-modal="true">
          <button
            type="button"
            className={uiModal.backdrop}
            onClick={() => shell.setServeAreaOptionsModal({ isOpen: false })}
            aria-label="Cerrar"
          />
          <form
            className={`${uiModal.panelMd} relative p-6 sm:p-8 animate-in zoom-in-95 duration-200`}
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              void shell.handleSaveServeAreaOptions();
            }}
          >
            <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2"><Users className="text-amber-600" /> Opciones: ¿En qué área les gustaría servir?</h3>
            <p className="text-sm text-slate-500 mb-4">Agrega o quita opciones. Debe incluirse &quot;Otro&quot; para la opción personalizada.</p>
            <div className="space-y-2 max-h-72 overflow-auto">
              {shell.serveAreaOptionsForm.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" className={shell.inputClasses + ' flex-1'} value={opt} onChange={e => shell.setServeAreaOptionsForm(prev => prev.map((o, j) => j === i ? e.target.value : o))} placeholder="Nombre de opción" />
                  <button type="button" onClick={() => shell.setServeAreaOptionsForm(prev => prev.filter((_, j) => j !== i))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Quitar"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => shell.setServeAreaOptionsForm(prev => [...prev, ''])} className="mt-3 text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-2">
              <Plus size={16} /> Agregar opción
            </button>
            <div className="flex gap-4 pt-6 mt-6 border-t border-slate-100">
              <button type="button" onClick={() => shell.setServeAreaOptionsModal({ isOpen: false })} className={shell.btnSecondary}>Cancelar</button>
              <button type="submit" className={shell.btnPrimary}><CheckCircle2 size={20} /> Guardar</button>
            </div>
          </form>
        </div>
      )}

      {shell.allergyOptionsModal.isOpen && (
        <div className={uiOverlay.modal}>
          <form
            className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-xl animate-in zoom-in-95 duration-200"
            onSubmit={(e) => {
              e.preventDefault();
              void shell.handleSaveAllergyOptions();
            }}
          >
            <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2"><Activity className="text-orange-600" /> Categorías de alergias</h3>
            <p className="text-sm text-slate-500 mb-4">Agrega o elimina categorías para seleccionar en el registro.</p>
            <div className="space-y-2 max-h-72 overflow-auto">
              {shell.allergyOptionsForm.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" className={shell.inputClasses + ' flex-1'} value={opt} onChange={e => shell.setAllergyOptionsForm(prev => prev.map((o, j) => j === i ? e.target.value : o))} placeholder="Nombre de categoría" />
                  <button type="button" onClick={() => shell.setAllergyOptionsForm(prev => prev.filter((_, j) => j !== i))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Quitar"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => shell.setAllergyOptionsForm(prev => [...prev, ''])} className="mt-3 text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-2">
              <Plus size={16} /> Agregar categoría
            </button>
            <div className="flex gap-4 pt-6 mt-6 border-t border-slate-100">
              <button type="button" onClick={() => shell.setAllergyOptionsModal({ isOpen: false })} className={shell.btnSecondary}>Cancelar</button>
              <button type="submit" className={shell.btnPrimary}><CheckCircle2 size={20} /> Guardar</button>
            </div>
          </form>
        </div>
      )}

      {shell.renderRegistryConfirmModal()}
      {shell.renderPromoteOverCapConfirmModal()}

      {/* PAYMENT MODAL */}
      {shell.paymentModal.isOpen && !shell.bautizosCarDataPrompt?.isOpen && (
        <div className={uiOverlay.modalLight}>
          <form
            className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm animate-in zoom-in-95 duration-200"
            onSubmit={(e) => {
              e.preventDefault();
              void shell.submitAbono();
            }}
          >
            <h3 className="text-lg font-bold text-slate-800 mb-1">Abonar Pago</h3>
            <p className="text-sm text-slate-500 mb-6">Registrando abono para <strong className="text-slate-700">{shell.paymentModal.personName}</strong></p>
            {(() => {
              const pm = shell.allParticipants.find((p) => String(p.id) === String(shell.paymentModal.id));
              return pm?.registeredCostManual ? (
                <p className="text-[10px] text-sky-800 font-semibold -mt-4 mb-4 leading-snug border border-sky-100 bg-sky-50/80 rounded-lg px-3 py-2">
                  Costo de lista fijado manualmente: puedes abonar por encima del costo; el excedente queda como saldo a favor y se refleja en gastos.
                </p>
              ) : null;
            })()}
            <div className="space-y-6">
              <div>
                <label className={shell.labelClasses}>Monto a abonar ($)</label>
                <div className="relative mt-1">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold ${shell.paymentModal.error ? 'text-red-400' : 'text-slate-400'}`}>$</span>
                  <input type="number" autoFocus className={`w-full pl-8 pr-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 font-bold ${shell.paymentModal.error ? 'border-red-300 text-red-700 focus:ring-red-500' : 'border-slate-200 text-green-700 focus:ring-green-500'}`} placeholder="0.00" value={shell.paymentModal.amount} onChange={e => shell.setPaymentModal({ ...shell.paymentModal, amount: e.target.value, error: '' })} />
                  {!shell.paymentModal.error && shell.paymentModal.baseCost > shell.paymentModal.currentPaid && (
                    <span className="text-[10px] text-red-500 font-bold px-1 absolute top-full left-0 mt-1 whitespace-nowrap z-10">
                      Resta para liquidar: ${shell.paymentModal.baseCost - shell.paymentModal.currentPaid}
                    </span>
                  )}
                </div>
                {shell.paymentModal.error && <p className="text-[10px] text-red-500 font-bold mt-1 px-1 animate-in slide-in-from-top-1">{shell.paymentModal.error}</p>}
              </div>

              <div>
                <div className="space-y-1">
                  <label className={shell.labelClasses}>Método</label>
                  {!paymentModalCardAllowed ? (
                    <div className={`${uiBanner('warning')} mb-2 gap-2 items-start`} role="status">
                      <AlertTriangle size={16} className="shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                      <span>El pago con tarjeta está deshabilitado para esta sede. Solo se acepta efectivo.</span>
                    </div>
                  ) : null}
                  <select
                    className={shell.inputClasses}
                    value={shell.paymentModal.paymentMethod}
                    onChange={(e) => {
                      const method = e.target.value === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
                      shell.setPaymentModal({ ...shell.paymentModal, paymentMethod: method, cardReference: method === 'Tarjeta' ? shell.paymentModal.cardReference : '' });
                    }}
                  >
                    {paymentModalMethodOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {shell.paymentModal.paymentMethod === 'Tarjeta' && (
                  <div className="space-y-1 mt-3">
                    <label className={shell.labelClasses}>Referencia de pago (opcional)</label>
                    <input
                      className={shell.inputClasses}
                      value={shell.paymentModal.cardReference}
                      placeholder="Ej. folio / transacción"
                      onChange={(e) => shell.setPaymentModal({ ...shell.paymentModal, cardReference: e.target.value })}
                    />
                  </div>
                )}

                <div className="space-y-1 mt-1">
                  <label className={shell.labelClasses}>Nota del abono (opcional)</label>
                  <textarea
                    className={`${shell.inputClasses} min-h-[64px] resize-y py-2`}
                    rows={2}
                    placeholder="Visible junto a quien registró el abono en el historial"
                    value={shell.paymentModal.abonoNote || ''}
                    onChange={(e) => shell.setPaymentModal({ ...shell.paymentModal, abonoNote: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => shell.setPaymentModal({ isOpen: false, loc: '', id: null, personName: '', amount: '', currentPaid: 0, error: '', isScholarship: 'No', baseCost: 0, paymentMethod: 'Efectivo', paymentService: shell.getAutoPaymentService(new Date()), cardReference: '', abonoNote: '' })} className={shell.btnSecondary}>Cancelar</button>
                <button type="submit" className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-green-200 text-sm flex justify-center items-center gap-2"><CreditCard size={18} /> Guardar</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {shell.bautizosCarDataPrompt?.isOpen ? (
        <BautizosCarDataPromptModal
          isOpen
          hostPerson={shell.bautizosCarDataPrompt.hostPerson}
          companions={shell.bautizosCarDataPrompt.companions}
          plan={shell.currentEvent?.transportPlanning}
          hostSourceKey={shell.bautizosCarDataPrompt.hostSourceKey}
          colorSuggestions={collectCarColorSuggestions(shell.currentEvent?.transportPlanning)}
          onCancel={() => {
            const resolve = shell.bautizosCarDataPrompt.onResolve;
            shell.setBautizosCarDataPrompt({
              isOpen: false,
              hostPerson: null,
              companions: [],
              hostSourceKey: '',
              onResolve: null,
            });
            resolve?.(false);
          }}
          onConfirm={(patches) => {
            const resolve = shell.bautizosCarDataPrompt.onResolve;
            shell.setBautizosCarDataPrompt({
              isOpen: false,
              hostPerson: null,
              companions: [],
              hostSourceKey: '',
              onResolve: null,
            });
            resolve?.(patches);
          }}
        />
      ) : null}

      {shell.registrationCommentModal?.isOpen && (
        <div className={uiOverlay.modalLight}>
          <form
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-700"
            onSubmit={(e) => {
              e.preventDefault();
              void shell.submitRegistrationCommentModal();
            }}
          >
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
              <MessageSquare size={18} className="text-slate-500 shrink-0" aria-hidden />
              Comentario del registro
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Para <strong className="text-slate-700 dark:text-slate-200">{shell.registrationCommentModal.personName}</strong>
            </p>
            <textarea
              className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800 dark:text-slate-100 min-h-[100px] resize-y"
              rows={4}
              autoFocus
              placeholder="Escribe un comentario…"
              value={shell.registrationCommentModal.draft}
              onChange={(e) => shell.setRegistrationCommentModal((prev) => ({ ...prev, draft: e.target.value }))}
            />
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => shell.setRegistrationCommentModal({ isOpen: false, personId: null, personName: '', loc: '', draft: '' })}
                className={shell.btnSecondary}
              >
                Cancelar
              </button>
              <button type="submit" className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-sm">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {shell.abonoNoteEditModal?.isOpen && (
        <div className={uiOverlay.modalLight}>
          <form
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-700"
            onSubmit={(e) => {
              e.preventDefault();
              void shell.saveAbonoNoteFromModal();
            }}
          >
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Nota del abono</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Se muestra junto a quien registró el movimiento.</p>
            <textarea
              className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800 dark:text-slate-100 min-h-[88px] resize-y"
              rows={3}
              autoFocus
              placeholder="Escribe o borra la nota…"
              value={shell.abonoNoteEditModal.draft}
              onChange={(e) => shell.setAbonoNoteEditModal((prev) => ({ ...prev, draft: e.target.value }))}
            />
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => shell.setAbonoNoteEditModal({ isOpen: false, personId: null, loc: '', paymentIndex: null, draft: '' })}
                className={shell.btnSecondary}
              >
                Cancelar
              </button>
              <button type="submit" className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-sm">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {shell.paymentMethodEditModal.isOpen && shell.hasAdminRights && (
        <div className={uiOverlay.modalLight}>
          <form
            className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm animate-in zoom-in-95 duration-200"
            onSubmit={(e) => {
              e.preventDefault();
              void shell.handleSavePaymentMethodEdit();
            }}
          >
            <h3 className="text-lg font-bold text-slate-800 mb-1">Cambiar tipo de abono</h3>
            <p className="text-sm text-slate-500 mb-5">
              Movimiento de <strong className="text-slate-700">{shell.paymentMethodEditModal.personName}</strong> ? Monto {shell.formatMoney(shell.paymentMethodEditModal.amount || 0)}
            </p>
            <div className="space-y-4">
              {shell.isSuperUser && (
                <div className="space-y-1">
                  <label className={shell.labelClasses}>Monto del abono</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={shell.inputClasses}
                    value={shell.paymentMethodEditModal.amountInput}
                    onChange={(e) => shell.setPaymentMethodEditModal((prev) => ({ ...prev, amountInput: e.target.value }))}
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className={shell.labelClasses}>Método</label>
                {!paymentEditCardAllowed ? (
                  <div className={`${uiBanner('warning')} mb-2 gap-2 items-start`} role="status">
                    <AlertTriangle size={16} className="shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                    <span>El pago con tarjeta está deshabilitado para esta sede. Solo se acepta efectivo.</span>
                  </div>
                ) : null}
                <select
                  className={shell.inputClasses}
                  value={shell.paymentMethodEditModal.paymentMethod}
                  onChange={(e) => {
                    const method = e.target.value === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
                    shell.setPaymentMethodEditModal((prev) => ({
                      ...prev,
                      paymentMethod: method,
                      cardReference: method === 'Tarjeta' ? prev.cardReference : '',
                    }));
                  }}
                >
                  {paymentEditMethodOptions.map((m) => (
                    <option key={`edit-method-${m}`} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              {shell.paymentMethodEditModal.paymentMethod === 'Tarjeta' && (
                <div className="space-y-1">
                  <label className={shell.labelClasses}>Referencia de pago (opcional)</label>
                  <input
                    className={shell.inputClasses}
                    value={shell.paymentMethodEditModal.cardReference}
                    placeholder="Ej. folio / transacción"
                    onChange={(e) => shell.setPaymentMethodEditModal((prev) => ({ ...prev, cardReference: e.target.value }))}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-6">
              <button type="button" onClick={shell.closePaymentMethodEditModal} className={shell.btnSecondary}>Cancelar</button>
              <button type="submit" className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-sm">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* WHATSAPP MODAL */}
      {shell.whatsAppModal.isOpen && (
        <div className={uiOverlay.modalLight}>
          <form
            className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-lg animate-in zoom-in-95 duration-200"
            onSubmit={(e) => {
              e.preventDefault();
              void shell.sendWhatsAppMessage();
            }}
          >
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
              <MessageCircle size={18} className="text-[#25D366]" aria-hidden />
              Enviar WhatsApp
            </h3>
            <p className="text-sm text-slate-500 mb-1">Mensaje para <strong className="text-slate-700">{shell.whatsAppModal.personName}</strong>.</p>
            {shell.whatsAppModal.pendingMergeMarkKeys?.length ? (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mb-3">
                Hay {shell.whatsAppModal.pendingMergeMarkKeys.length} aviso(s) en cola: se muestran fusionados en un solo mensaje (registro, abono, promoción desde espera, beca pendiente o baja, con fechas y montos por bloque). Al abrir WhatsApp sin editar el texto, se marcan todos como enviados.
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 mb-3">Sin avisos en cola: mensaje genérico de saldo. Tras registro, abono o promoción, aquí se precarga el texto fusionado de los pendientes.</p>
            )}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className={shell.labelClasses}>Teléfono (WhatsApp)</label>
                <input
                  type="text"
                  className={shell.inputClasses}
                  value={shell.whatsAppModal.phone}
                  onChange={(e) =>
                    shell.setWhatsAppModal({ ...shell.whatsAppModal, phone: shell.formatPhoneNumber(e.target.value), error: '' })
                  }
                  placeholder="55-1234-5678 o +52..."
                />
              </div>
              <div className="space-y-1">
                <label className={shell.labelClasses}>Mensaje</label>
                <textarea
                  rows={7}
                  className={`${shell.inputClasses} resize-y`}
                  value={shell.whatsAppModal.message}
                  onChange={(e) => {
                    const next = e.target.value;
                    const unchanged =
                      shell.whatsAppModal.pendingMergeMarkKeys?.length > 0 &&
                      shell.whatsAppModal.whatsAppQueuedMessageSnapshot != null &&
                      next.trim() === String(shell.whatsAppModal.whatsAppQueuedMessageSnapshot).trim();
                    shell.setWhatsAppModal({
                      ...shell.whatsAppModal,
                      message: next,
                      error: '',
                      ...(unchanged
                        ? {}
                        : { pendingMergeMarkKeys: null, whatsAppQueuedMessageSnapshot: null }),
                    });
                  }}
                  placeholder="Escribe el mensaje a enviar..."
                />
              </div>
              {shell.whatsAppModal.error && <p className="text-[11px] text-red-600 font-bold">{shell.whatsAppModal.error}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    shell.setWhatsAppModal({
                      isOpen: false,
                      personId: null,
                      personName: '',
                      eventName: '',
                      loc: '',
                      phone: '',
                      message: '',
                      error: '',
                      pendingMergeMarkKeys: null,
                      whatsAppQueuedMessageSnapshot: null,
                    })
                  }
                  className={shell.btnSecondary}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 border border-[#1DA851] bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold rounded-xl transition-colors shadow-sm text-sm flex justify-center items-center gap-2"
                >
                  <MessageCircle size={18} /> Abrir WhatsApp
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* CUSTOM FIELDS MODAL */}
      {shell.customFieldsModal.isOpen && (
        <div className={uiOverlay.modalLight}>
          <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <div><h3 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-2"><ListPlus size={24} className="text-indigo-600" /> Campos Personalizados</h3><p className="text-sm text-slate-500">Añade o elimina preguntas extra para este evento.</p></div>
              <button type="button" onClick={() => shell.setCustomFieldsModal({ isOpen: false })} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><XCircle size={20} /></button>
            </div>
            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto">
              {shell.currentEvent?.customFields && shell.currentEvent.customFields.length > 0 ? (
                shell.currentEvent.customFields.map((field, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl">
                    <span className="font-bold text-slate-700 text-sm truncate">{field}</span>
                    <button type="button" onClick={() => shell.handleRemoveCustomField(field)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><Trash2 size={16} /></button>
                  </div>
                ))
              ) : <p className="text-center text-sm italic text-slate-400 py-4">No hay campos extra configurados.</p>}
            </div>
            <form
              className="space-y-2 pt-4 border-t border-slate-100"
              onSubmit={(e) => {
                e.preventDefault();
                shell.handleAddCustomField();
              }}
            >
              <label className={shell.labelClasses}>Añadir Nuevo Campo</label>
              <div className="flex gap-2">
                <input type="text" className={shell.inputClasses} placeholder="Ej. Talla de playera" value={shell.newCustomField} onChange={e => shell.setNewCustomField(e.target.value)} />
                <button type="submit" disabled={!shell.newCustomField.trim()} className={shell.btnPrimary}><Plus size={18} /></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DONATION MODAL */}
      {shell.donationModal.isOpen && (() => {
        const eventLocs = Array.isArray(shell.currentEvent?.locations) ? shell.currentEvent.locations : [];
        const tabStr = String(shell.activeTab || '').trim();
        const activeTabIsSede = eventLocs.some((l) => String(l).trim() === tabStr);
        const amountOk = shell.donationModal.amount && parseFloat(shell.donationModal.amount) > 0;
        const locOk = eventLocs.length === 0 || String(shell.donationModal.location || '').trim().length > 0;
        const resetDonationModal = () => shell.setDonationModal({ isOpen: false, amount: '', donorName: '', location: '' });
        return (
        <div className={uiModal.overlayNested} role="dialog" aria-modal="true" aria-labelledby="donation-modal-title">
          <button type="button" className={uiModal.backdrop} onClick={resetDonationModal} aria-label="Cerrar" />
          <form
            className="relative bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-600"
            onSubmit={(e) => {
              e.preventDefault();
              void shell.handleAddDonation();
            }}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 id="donation-modal-title" className="text-xl font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
                  <Receipt size={24} className="text-green-600" /> Registrar Donación
                </h3>
                <p className="text-sm text-slate-500">Suma una cantidad al total recaudado.</p>
              </div>
              <button type="button" onClick={resetDonationModal} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><XCircle size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className={shell.labelClasses}>Cantidad *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  autoFocus
                  className={shell.inputClasses}
                  placeholder="$0.00"
                  value={shell.donationModal.amount}
                  onChange={e => shell.setDonationModal({ ...shell.donationModal, amount: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className={shell.labelClasses}>Nombre del donador <span className="text-slate-400 font-normal">(opcional)</span></label>
                <input
                  type="text"
                  className={shell.inputClasses}
                  placeholder="Ej. Juan Pérez"
                  value={shell.donationModal.donorName}
                  onChange={e => shell.setDonationModal({ ...shell.donationModal, donorName: e.target.value })}
                />
              </div>
              {eventLocs.length > 0 ? (
                <div className="space-y-1">
                  <label className={shell.labelClasses}>
                    Sede{' '}
                    {activeTabIsSede ? (
                      <span className="text-slate-400 font-normal">(registro en esta sede)</span>
                    ) : (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  {activeTabIsSede ? (
                    <p className="text-sm font-semibold text-slate-800 py-2.5 px-3 rounded-xl bg-slate-100 border border-slate-200">
                      {String(shell.donationModal.location || tabStr).trim() || '—'}
                    </p>
                  ) : (
                    <select
                      className={shell.inputClasses}
                      value={shell.donationModal.location || ''}
                      onChange={(e) => shell.setDonationModal({ ...shell.donationModal, location: e.target.value })}
                    >
                      <option value="">Selecciona sede…</option>
                      {eventLocs.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  )}
                </div>
              ) : null}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetDonationModal} className={shell.btnSecondary}>Cancelar</button>
                <button type="submit" disabled={!amountOk || !locOk} className={shell.btnPrimary}>
                  <Plus size={18} /> Registrar
                </button>
              </div>
            </div>
          </form>
        </div>
        );
      })()}

      {shell.publicQrModalOpen && shell.hasAdminRights && shell.currentEvent && (
        <div className={uiOverlay.modalLight}>
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-2">
                  <QrCode size={24} className="text-indigo-600" /> Formulario público
                </h3>
              </div>
              <button type="button" onClick={() => shell.setPublicQrModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full shrink-0">
                <XCircle size={20} />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Genera o actualiza el enlace y el código QR. Abajo configuras qué secciones del formulario público están activas para
              este evento.
            </p>
            {shell.publicQrUrl ? (
              <div className="flex flex-col items-center gap-3 mb-4">
                {shell.publicQrDataUrl ? (
                  <img
                    src={shell.publicQrDataUrl}
                    alt="Código QR"
                    className="w-56 h-56 mx-auto border border-slate-200 dark:border-slate-600 rounded-xl !bg-white p-2"
                  />
                ) : (
                  <p className="text-xs text-slate-400">Generando QR…</p>
                )}
                {shell.publicQrDataUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      const safeId = String(
                        getPublicRegistrationUrlSlug(shell.currentEvent) || shell.currentEvent?.id || 'evento'
                      ).replace(/[^a-zA-Z0-9._-]/g, '_');
                      const a = document.createElement('a');
                      a.href = shell.publicQrDataUrl;
                      a.download = `qr-registro-publico-${safeId}.png`;
                      a.rel = 'noopener';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      shell.showToast('Imagen descargada. Puedes imprimirla desde el visor de fotos o el explorador.');
                    }}
                    className={`${shell.btnSecondary} w-full sm:w-auto inline-flex items-center justify-center gap-2`}
                  >
                    <Download size={18} />
                    Descargar QR (PNG)
                  </button>
                ) : null}
                <div className="w-full">
                  <label className={shell.labelClasses}>URL</label>
                  <div className="flex gap-2">
                    <input readOnly value={shell.publicQrUrl} className={`${shell.inputClasses} text-xs font-mono`} />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(shell.publicQrUrl).then(() => shell.showToast('Enlace copiado.')).catch(() => shell.showToast('No se pudo copiar.'));
                      }}
                      className={shell.btnSecondary}
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic mb-4 text-center border border-dashed border-slate-200 rounded-xl py-4 px-3">
                Tras el primer guardado o al cargar el enlace, aquí verás el QR y la URL.
              </p>
            )}
            <p className="text-xs text-slate-600 leading-relaxed mb-2">
              <strong>Formulario público.</strong> Marca las secciones que quieres mostrar. Cada sección activa es obligatoria de
              completar; el resto se omite. No puedes activar lo que el panel haya deshabilitado en «Nuevo registro» para este
              tipo o evento.
            </p>
            <div className="space-y-4 mb-4 max-h-[min(52vh,28rem)] overflow-y-auto border border-slate-100 rounded-xl p-3 bg-slate-50/80">
              {(() => {
                const rows = publicOptionalKeysForEventType(shell.currentEvent?.eventType);
                const byGroup = {};
                for (const r of rows) {
                  if (!byGroup[r.group]) byGroup[r.group] = [];
                  byGroup[r.group].push(r);
                }
                return PUBLIC_OPTIONAL_GROUP_ORDER.filter((g) => byGroup[g]?.length).map((g) => (
                  <div key={g} className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{PUBLIC_OPTIONAL_GROUP_LABELS[g] || g}</p>
                    <div className="space-y-2 pl-0.5">
                      {byGroup[g].map((row) => (
                        <label
                          key={row.key}
                          className="flex items-start gap-2.5 text-sm font-semibold text-slate-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={shell.publicQrOptional[row.key] !== false}
                            onChange={() =>
                              shell.setPublicQrOptional((prev) => ({
                                ...prev,
                                [row.key]: !(prev[row.key] !== false),
                              }))
                            }
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 shrink-0"
                          />
                          <span className="leading-snug font-medium">{row.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button type="button" onClick={() => shell.setPublicQrModalOpen(false)} className={`${shell.btnSecondary} flex-1`}>
                Cerrar
              </button>
              <button
                type="button"
                disabled={shell.publicQrBusy}
                onClick={async () => {
                  if (!shell.currentEvent) return;
                  shell.setPublicQrBusy(true);
                  try {
                    const eventSnapshot = {
                      id: shell.currentEvent.id,
                      name: shell.currentEvent.name,
                      eventType: shell.currentEvent.eventType,
                      date: shell.currentEvent.date,
                      locations: shell.currentEvent.locations,
                      regStatus: shell.currentEvent.regStatus,
                      locationCaps: shell.currentEvent.locationCaps,
                      eventTotalCap: shell.currentEvent.eventTotalCap,
                      minDeposit: shell.currentEvent.minDeposit,
                      pricingType: shell.currentEvent.pricingType,
                      globalCost: shell.currentEvent.globalCost,
                      serverCost: shell.currentEvent.serverCost,
                      serverCostTeens: shell.currentEvent.serverCostTeens,
                      serverCostJovenes: shell.currentEvent.serverCostJovenes,
                      serverCostAmbos: shell.currentEvent.serverCostAmbos ?? shell.currentEvent.serverCost,
                      dynamicPrices: shell.currentEvent.dynamicPrices,
                      dynamicServerPrices: shell.currentEvent.dynamicServerPrices,
                      discountCampaigns: shell.currentEvent.discountCampaigns,
                      customFields: shell.currentEvent.customFields,
                      cashCutScheduleByLocation: shell.currentEvent.cashCutScheduleByLocation,
                      cashCutServicesByLocation: shell.currentEvent.cashCutServicesByLocation,
                      /** Registro público: misma visibilidad que «Nuevo registro» (panel). */
                      editorRegistrationFields: shell.currentEvent.editorRegistrationFields,
                    };
                    const globalSnapshot = {
                      cardCommissionRate: shell.globalConfig?.cardCommissionRate,
                      serviceSlots: shell.globalConfig?.serviceSlots,
                      cashCutScheduleByLocation: shell.globalConfig?.cashCutScheduleByLocation,
                      allergyOptions: shell.globalConfig?.allergyOptions,
                      serveAreaOptions: shell.globalConfig?.serveAreaOptions,
                      editorRegistrationFieldsByType: shell.globalConfig?.editorRegistrationFieldsByType,
                    };
                    await shell.setDoc(
                      shell.getDocRef('app_public_registration_links', shell.currentEvent.id),
                      shell.omitUndefinedDeep({
                        eventId: shell.currentEvent.id,
                        urlSlug: getPublicRegistrationUrlSlug(shell.currentEvent) || undefined,
                        optionalVisibility: normalizeOptionalVisibility(shell.publicQrOptional),
                        eventSnapshot: shell.omitUndefinedDeep(eventSnapshot),
                        globalSnapshot: shell.omitUndefinedDeep(globalSnapshot),
                        updatedAt: Date.now(),
                        updatedBy: shell.currentUser?.username || '',
                      }),
                      { merge: true }
                    );
                    shell.addLog(
                      'Registro público',
                      `Actualizó enlace / QR de registro público para "${shell.currentEvent.name}".`,
                      null,
                      null,
                      { collectionName: 'app_public_registration_links', docId: shell.currentEvent.id, action: 'update', previousData: null }
                    );
                    shell.showToast('Configuración guardada.');
                    const url = getPublicRegistrationPageUrl(shell.currentEvent);
                    shell.setPublicQrUrl(url);
                    const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 2 });
                    shell.setPublicQrDataUrl(dataUrl);
                  } catch (e) {
                    console.error(e);
                    shell.showToast('No se pudo guardar.');
                  } finally {
                    shell.setPublicQrBusy(false);
                  }
                }}
                className={`${shell.btnPrimary} flex-1`}
              >
                {shell.publicQrBusy ? 'Guardando…' : 'Guardar y actualizar QR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DONATIONS LIST MODAL */}
      {shell.donationsListOpen && (() => {
        const eventDonationsList = shell.mergeEventDonationsForEvent(shell.currentEvent?.id, shell.donations, shell.allParticipants);
        const totalAllDon = eventDonationsList.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
        const totalAdditiveDon = eventDonationsList.filter(donationAddsToRecaudacionBalance).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
        return (
        <div className={uiOverlay.modalLight}>
          <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-2">
                  <Receipt size={24} className="text-green-600" /> Donaciones
                </h3>
                <p className="text-sm text-slate-500">
                  {`${eventDonationsList.length} registro${eventDonationsList.length !== 1 ? 's' : ''} · Total: ${shell.formatMoney(totalAllDon)} (suma al recaudado global: ${shell.formatMoney(totalAdditiveDon)})`}
                </p>
              </div>
              <button onClick={() => shell.setDonationsListOpen(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><XCircle size={20} /></button>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2">
              {eventDonationsList.length === 0 ? (
                <p className="text-center text-sm italic text-slate-400 py-8">No hay donaciones registradas.</p>
              ) : (
                eventDonationsList
                  .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
                  .map(don => (
                    <div key={don.id} className="flex flex-col sm:flex-row sm:items-stretch justify-between gap-2 bg-slate-50 border border-slate-200 p-3 rounded-xl">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          <p className="font-bold text-slate-800 text-sm">{shell.formatMoney(don.amount)}</p>
                          {don.fromCancelledRefundDonation ? (
                            <span className="text-[9px] font-black uppercase tracking-wide bg-emerald-100 text-emerald-900 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                              Saldo a favor · baja{don._syntheticCancelledRefund ? ' · legado' : ''} · {don.location || 'sede ?'}
                            </span>
                          ) : null}
                          {don.fromArchivedManualCredit ? (
                            <span className="text-[9px] font-black uppercase tracking-wide bg-emerald-100 text-emerald-900 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                              Saldo a favor · archivo{don._syntheticArchivedCredit ? ' · legado' : ''} · {don.location || 'sede ?'}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-500 break-words">
                          {don.donorName ? don.donorName : <span className="italic">Sin nombre</span>}
                          {' · '}{don.createdBy} · {don.createdAt ? new Date(don.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          {String(don.location || '').trim() ? (
                            <> · Sede: <span className="font-semibold text-slate-600">{String(don.location).trim()}</span></>
                          ) : donationIsSuperEditable(don) ? (
                            <> · <span className="text-amber-600 font-semibold">Sin sede (no aparece por sede en visualización)</span></>
                          ) : null}
                        </p>
                        {superDonationEdit?.id === don.id && shell.isSuperUser && donationIsSuperEditable(don) ? (
                          <div className="mt-2 space-y-2 border-t border-slate-200 pt-2">
                            <div className="space-y-1">
                              <label className={shell.labelClasses}>Monto</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className={shell.inputClasses}
                                value={superDonationEdit.amount}
                                onChange={(e) => setSuperDonationEdit((prev) => (prev ? { ...prev, amount: e.target.value } : null))}
                              />
                            </div>
                            {Array.isArray(shell.currentEvent?.locations) && shell.currentEvent.locations.length > 0 ? (
                              <div className="space-y-1">
                                <label className={shell.labelClasses}>Sede</label>
                                <select
                                  className={shell.inputClasses}
                                  value={superDonationEdit.location || ''}
                                  onChange={(e) => setSuperDonationEdit((prev) => (prev ? { ...prev, location: e.target.value } : null))}
                                >
                                  <option value="">Selecciona sede…</option>
                                  {shell.currentEvent.locations.map((loc) => (
                                    <option key={loc} value={loc}>{loc}</option>
                                  ))}
                                </select>
                              </div>
                            ) : null}
                            <div className="flex flex-wrap gap-2 pt-1">
                              <button
                                type="button"
                                className={shell.btnPrimary}
                                onClick={async () => {
                                  const ok = await shell.handleUpdateDonationSuper(superDonationEdit);
                                  if (ok) setSuperDonationEdit(null);
                                }}
                              >
                                Guardar
                              </button>
                              <button type="button" className={shell.btnSecondary} onClick={() => setSuperDonationEdit(null)}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-end gap-1 shrink-0 self-end sm:self-start">
                        {shell.isSuperUser && donationIsSuperEditable(don) && superDonationEdit?.id !== don.id ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSuperDonationEdit({
                                id: don.id,
                                amount: String(don.amount ?? ''),
                                location: String(don.location || ''),
                              })
                            }
                            className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors"
                            title="Corregir monto o sede (SuperUsuario)"
                          >
                            <Edit3 size={16} />
                          </button>
                        ) : null}
                        {shell.hasAdminRights && !don._syntheticArchivedCredit && !don._syntheticCancelledRefund && (
                          <button
                            onClick={() => shell.openDeleteDonationConfirm(don)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                            title="Eliminar donación"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
            <div className="flex gap-3 pt-4 mt-4 border-t border-slate-100">
              <button onClick={() => shell.setDonationsListOpen(false)} className={`${shell.btnSecondary} flex-1`}>Cerrar</button>
              {shell.hasAdminRights && (
                <button onClick={() => { shell.setDonationsListOpen(false); shell.setDonationModal({ isOpen: true, amount: '', donorName: '', location: '' }); }} className={`${shell.btnPrimary} flex-1`}>
                  <Plus size={18} /> Nueva Donación
                </button>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {shell.superDateEditModal.isOpen && shell.canEditRegistryDates && (
        <div className={uiOverlay.modalLight}>
          <form
            className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200"
            onSubmit={(e) => {
              e.preventDefault();
              void shell.handleSuperSaveDateEdit();
            }}
          >
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Calendar size={24} className="text-violet-600" />
                {shell.superDateEditModal.mode === 'registration' ? 'Fecha de registro' : 'Fecha del movimiento'}
              </h3>
              <button type="button" onClick={shell.closeSuperDateEditModal} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><XCircle size={20} /></button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              {shell.isSuperUser
                ? 'SuperUsuario: la hora se interpreta según la zona horaria de este equipo.'
                : 'Tu cuenta tiene permiso para corregir fechas. La hora se interpreta según la zona horaria de este equipo.'}
            </p>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Fecha y hora</label>
            <input
              type="datetime-local"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-violet-500 outline-none"
              value={shell.superDateEditModal.datetimeLocal}
              onChange={(e) => shell.setSuperDateEditModal((prev) => ({ ...prev, datetimeLocal: e.target.value }))}
            />
            <div className="flex gap-3 pt-6">
              <button type="button" onClick={shell.closeSuperDateEditModal} className={shell.btnSecondary}>Cancelar</button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} /> Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EXPENSE EDIT MODAL */}
      {shell.expenseEditModal.isOpen && (
        <div className={uiOverlay.modalLight}>
          <form
            className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200"
            onSubmit={(e) => {
              e.preventDefault();
              void shell.handleEditExpense();
            }}
          >
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Edit3 size={24} className="text-indigo-600" /> Editar Gasto</h3>
              <button type="button" onClick={() => shell.setExpenseEditModal({ isOpen: false, id: null, name: '', quantity: 1, unitPrice: '' })} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><XCircle size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Nombre</label>
                <input type="text" autoFocus value={shell.expenseEditModal.name} onChange={e => shell.setExpenseEditModal({ ...shell.expenseEditModal, name: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Cantidad</label>
                  <input type="number" min="1" value={shell.expenseEditModal.quantity} onChange={e => shell.setExpenseEditModal({ ...shell.expenseEditModal, quantity: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Precio unitario</label>
                  <input type="number" min="0" step="0.01" value={shell.expenseEditModal.unitPrice} onChange={e => shell.setExpenseEditModal({ ...shell.expenseEditModal, unitPrice: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Nuevo total: </span>
                <span className="text-lg font-black text-slate-800">${((parseInt(shell.expenseEditModal.quantity) || 0) * (parseFloat(shell.expenseEditModal.unitPrice) || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => shell.setExpenseEditModal({ isOpen: false, id: null, name: '', quantity: 1, unitPrice: '' })} className={shell.btnSecondary}>Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"><CheckCircle2 size={18} /> Guardar</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* EXPENSE PARTIAL PAYMENT MODAL */}
      {shell.expensePartialModal.isOpen && (() => {
        const exp = shell.expenses.find(e => e.id === shell.expensePartialModal.expenseId);
        const remaining = exp ? (exp.totalPrice || 0) - (exp.paidAmount || 0) : 0;
        return (
          <div className={uiOverlay.modalLight}>
            <form
              className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200"
              onSubmit={(e) => {
                e.preventDefault();
                void shell.handleExpensePartialPayment();
              }}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-2"><DollarSign size={24} className="text-emerald-600" /> Abono Parcial</h3>
                  <p className="text-sm text-slate-500">{exp && shell.canSeeExpenseConceptForRow(exp) ? (exp?.name || 'Gasto') : shell.MASKED_EXPENSE_CONCEPT_LABEL}</p>
                  <p className="text-xs text-slate-400 mt-1">Pendiente: <span className="font-bold text-amber-600">${remaining.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></p>
                </div>
                <button type="button" onClick={() => shell.setExpensePartialModal({ isOpen: false, expenseId: null, amount: '' })} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><XCircle size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Cantidad a abonar</label>
                  <input type="number" min="0" max={remaining} step="0.01" autoFocus placeholder="$0.00" value={shell.expensePartialModal.amount} onChange={e => shell.setExpensePartialModal({ ...shell.expensePartialModal, amount: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-lg font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => shell.setExpensePartialModal({ isOpen: false, expenseId: null, amount: '' })} className={shell.btnSecondary}>Cancelar</button>
                  <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"><CheckCircle2 size={18} /> Abonar</button>
                </div>
              </div>
            </form>
          </div>
        );
      })()}

      {/* ADD LOCATION MODAL */}
      {shell.isAddLocModalOpen && (
        <div className={uiOverlay.modalLight}>
          <form
            className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm animate-in zoom-in-95 duration-200"
            onSubmit={(e) => {
              e.preventDefault();
              void shell.handleAddLocation();
            }}
          >
            <h3 className="text-lg font-bold text-slate-800 mb-1">Añadir Nueva Sede</h3>
            <p className="text-sm text-slate-500 mb-6">Ingresa el nombre de la nueva ubicación para este evento.</p>
            <div className="space-y-4">
              <input type="text" autoFocus className={shell.inputClasses} placeholder="Ej. Querétaro" value={shell.newLocationName} onChange={e => shell.setNewLocationName(e.target.value)} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { shell.setIsAddLocModalOpen(false); shell.setNewLocationName(''); }} className={shell.btnSecondary}>Cancelar</button>
                <button type="submit" disabled={!shell.newLocationName.trim()} className={shell.btnPrimary}><Plus size={18} /> Añadir</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {shell.editorRegFieldsModalEl}
      {shell.excelExportModalEl}
      {shell.panelNavModalEl}
      {shell.privacyNoticeModalEl}

    </div>
  );
}
