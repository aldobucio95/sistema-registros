import React, { useEffect, useState } from 'react';
import {
  Bug, ArrowLeft, ArrowRight, LayoutDashboard, UserCog, Archive, History, LogOut, UserCircle,
  Search, Trash2, CalendarRange, Edit3, Plus, GripVertical, ShieldAlert, Eye, EyeOff,
  Undo, Database, Moon, Sun, WifiOff, ChevronDown, Lock, SlidersHorizontal,
} from 'lucide-react';
import { useAppShellBindings } from '../shellRuntime.js';
import { EVENT_TYPES, SI_LABEL } from '../appConstants.js';
import { formatEventDateRangeLabel } from '../eventDateHelpers.js';
import { canViewSystemLogs, mergePanelSectionLayers } from '../rbac/permissions.js';
import AdvancedUserPermissionsPanel from '../rbac/AdvancedUserPermissionsPanel.jsx';
import { usernameToAuthEmail, AUTH_EMAIL_DOMAIN } from '../firebaseConfig.js';
import { resolvePanelNavConfigItemCopy, panelNavSidebarItemAppliesToEvent } from '../panelNavUi.js';
import { uiButtons, uiModal, uiShell, uiUserEdit, uiUserAccountForm, uiFeedback, uiBadgeSoft, uiMobileMenu, uiHubHeader } from '../ui/uiFormatClasses.js';
import UserAccountModalShell from '../components/UserAccountModalShell.jsx';
import { closedEditingUserState } from '../userAccountFormDefaults.js';
import PwaInstallControl from '../components/PwaInstallControl.jsx';
import BulkRestoreResyncBanner from '../components/BulkRestoreResyncBanner.jsx';
import PanelNoticeToast from '../components/PanelNoticeToast.jsx';
import MobileCompactToolbar, { MobileCompactToolbarPanel } from '../components/mobile/MobileCompactToolbar.jsx';
import MobileMenuSection from '../components/mobile/MobileMenuSection.jsx';
import MobileSearchField from '../components/mobile/MobileSearchField.jsx';

/** Valores del documento Firestore del participante archivado (incl. objetos anidados). */
function formatArchiveDetailValue(value) {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '—';
  if (typeof value === 'string') return value || '—';
  if (value && typeof value.toDate === 'function') {
    try {
      return value.toDate().toLocaleString('es-MX');
    } catch {
      /* fall through */
    }
  }
  if (value && typeof value.toMillis === 'function') {
    try {
      return new Date(value.toMillis()).toLocaleString('es-MX');
    } catch {
      /* fall through */
    }
  }
  if (typeof value === 'object' && value.seconds != null) {
    const ms = value.seconds * 1000 + (value.nanoseconds || 0) / 1e6;
    return new Date(ms).toLocaleString('es-MX');
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return JSON.stringify(value, null, 2);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

const ARCHIVE_FIELD_LABELS = {
  name: 'Nombre',
  alias: 'Alias / nombre preferido',
  phone: 'Teléfono',
  email: 'Correo',
  vnpPersonId: 'ID VNPM',
  dharmName: 'Nombre espiritual / Dharma',
  spiritualName: 'Nombre espiritual',
  eventId: 'ID evento',
  location: 'Sede',
  archivedFromLocation: 'Sede al archivar',
  status: 'Estatus',
  archivedAt: 'Fecha de archivo',
  archivedReason: 'Motivo de archivo',
  age: 'Edad',
  gender: 'Género',
  dateOfBirth: 'Fecha de nacimiento',
  bloodType: 'Tipo de sangre',
  canSwim: 'Nado',
  hasAllergy: 'Alergias (sí/no)',
  allergyDetails: 'Detalle alergias',
  hasDisease: 'Enfermedades (sí/no)',
  diseaseDetails: 'Detalle enfermedades',
  diseaseMedication: 'Medicamento',
  hasDisability: 'Discapacidad (sí/no)',
  disabilityDetails: 'Detalle discapacidad',
  emergencyContact: 'Contacto de emergencia',
  emergencyPhone: 'Tel. emergencia',
  emergencyRelationship: 'Parentesco emergencia',
  isScholarship: 'Becado',
  isServer: 'Servidor',
  serverAssignment: 'Asignación servidor',
  campAssignment: 'Asignación campamento',
  willBeBaptized: 'Bautizo',
  paid: 'Pagado',
  paidNet: 'Pagado (neto)',
  registeredCost: 'Costo registrado',
  registeredAt: 'Fecha de registro',
  notes: 'Notas',
  customData: 'Campos personalizados',
  paymentHistory: 'Historial de pagos',
  whatsAppFinanceNotifications: 'Avisos WhatsApp (finanzas)',
  responsivaDigital: 'Responsiva digital',
  _mergedFromCount: 'Registros fusionados (misma persona)',
  _sourceEventNames: 'Eventos de origen',
  _sourceEventIds: 'IDs de eventos de origen',
  _sourceParticipantIds: 'IDs de documento (Firebase)',
  _earliestArchivedAt: 'Archivo más antiguo (referencia)',
};

const ARCHIVE_FIELD_ORDER = [
  'name',
  'alias',
  'phone',
  'email',
  'vnpPersonId',
  'eventId',
  'location',
  'archivedFromLocation',
  'status',
  'archivedAt',
  'age',
  'gender',
  'dateOfBirth',
  'bloodType',
  'canSwim',
  'hasAllergy',
  'allergyDetails',
  'hasDisease',
  'diseaseDetails',
  'diseaseMedication',
  'hasDisability',
  'disabilityDetails',
  'emergencyContact',
  'emergencyPhone',
  'emergencyRelationship',
  'isScholarship',
  'isServer',
  'serverAssignment',
  'campAssignment',
  'willBeBaptized',
  'paid',
  'paidNet',
  'registeredCost',
  'registeredAt',
  'notes',
  '_mergedFromCount',
  '_sourceEventNames',
  '_sourceEventIds',
  '_sourceParticipantIds',
  '_earliestArchivedAt',
];

function buildOrderedArchiveKeys(person) {
  const keys = Object.keys(person || {});
  const seen = new Set();
  const out = [];
  for (const k of ARCHIVE_FIELD_ORDER) {
    if (keys.includes(k)) {
      out.push(k);
      seen.add(k);
    }
  }
  const rest = keys.filter((k) => !seen.has(k)).sort((a, b) => a.localeCompare(b, 'es'));
  return [...out, ...rest];
}

function ArchivedParticipantDetailPanel({
  person,
  hasAdminRights,
  isSuperUser,
  openPermanentDeleteArchivedParticipantConfirm,
}) {
  if (!hasAdminRights) {
    return (
      <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
        El detalle de los datos del archivo solo lo pueden ver <strong>Administrador</strong> y <strong>SuperUsuario</strong>.
      </div>
    );
  }

  const orderedKeys = buildOrderedArchiveKeys(person);

  return (
    <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
      {isSuperUser && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openPermanentDeleteArchivedParticipantConfirm(person);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
          >
            <Trash2 size={14} />
            Eliminar definitivamente…
          </button>
        </div>
      )}
      <dl className="grid grid-cols-1 gap-3 text-sm">
        {orderedKeys.map((key) => (
          <div key={key} className="rounded-lg bg-slate-50/80 px-3 py-2 border border-slate-100">
            <dt className="text-[10px] font-black uppercase tracking-wide text-slate-500">
              {ARCHIVE_FIELD_LABELS[key] || key}
            </dt>
            <dd className="mt-1 text-slate-800 font-medium whitespace-pre-wrap break-words leading-snug">
              {formatArchiveDetailValue(person[key])}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function EventHubScreen() {
  const {
    debugToast, navHistory, forwardNavStack, goBack, goForward, systemView, currentUser, superSessionCount, isSuperUser,
    globalConfig, toggleDebugMode, goTo, hasAdminRights, handleLogout, renderUsers, renderLogs,
    archivedParticipantsForView, archivedParticipantsArchiveViewList, archiveViewSearch,
    setArchiveViewSearch, archiveViewSort, setArchiveViewSort, events,
    openPermanentDeleteArchivedParticipantConfirm, visibleEvents, activeRosterUnitsByEventId, getPricingFromSnapshot,
    draggedEventId, setDraggedEventId, handleDragOver, handleDrop, resolvePreferredLandingTab,
    formatDisplayDate, addLog, updateDoc, getDocRef, setRenameModal, setDeleteEventModal,
    deleteEventModal, confirmDeleteEvent, renameModal, handleRenameEvent, newEventData,
    setNewEventData, isAddEventModalOpen, setIsAddEventModalOpen, handleCreateEvent,
    btnPrimary, btnSecondary, inputClasses, labelClasses, restoreModal, setRestoreModal, confirmRestore,
    renderRegistryConfirmModal, editorRegFieldsModalEl, panelNavModalEl, privacyNoticeModalEl, editingUser,
    setEditingUser, handleUpdateUser, users, sortedEvents, allKnownLocationNames,
    editingUserPlainPwdVisible, setEditingUserPlainPwdVisible,     showToast, toast,
    PANEL_NAV_SIDEBAR_ITEMS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT,
    darkMode,
    toggleDarkMode,
    needsFirestoreResyncAfterBulk,
    bulkResyncBusy,
    onReloadAfterBulkRestore,
    handleBackfillEventActiveRosterTotals,
    backfillActiveRosterBusy,
  } = useAppShellBindings();

  const [networkOnline, setNetworkOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [hubMobileOptionsOpen, setHubMobileOptionsOpen] = useState(false);
  useEffect(() => {
    const onUp = () => setNetworkOnline(true);
    const onDown = () => setNetworkOnline(false);
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    return () => {
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
    };
  }, []);

  const hubTitle =
    systemView === 'users'
      ? hasAdminRights
        ? 'Gestión de Usuarios'
        : 'Mi cuenta'
      : systemView === 'logs'
        ? 'Registro de Actividad'
        : systemView === 'archive'
          ? 'Archivo de registros'
          : 'Selecciona un Evento';

  const hubSubtitle =
    systemView === 'users'
      ? hasAdminRights
        ? 'Administra los accesos al sistema global.'
        : 'Consulta y edita solo tu perfil.'
      : systemView === 'logs'
        ? 'Historial global de acciones en el sistema.'
        : systemView === 'archive'
          ? 'Solo lectura: registros archivados en Firebase (todos los campos).'
          : 'Elige el evento que deseas administrar o crea uno nuevo.';

  const hubPillIndigo = `${uiHubHeader.pillBase} ${uiHubHeader.pillIndigo}`;
  const hubPillSlate = `${uiHubHeader.pillBase} ${uiHubHeader.pillSlate}`;
  const hubPillRose = `${uiHubHeader.pillBase} ${uiHubHeader.pillRose}`;
  const hubPillEmerald = `${uiHubHeader.pillBase} ${uiHubHeader.pillEmerald}`;
  const hubPanelBtnIndigo = `${uiHubHeader.panelBtn} ${uiHubHeader.pillIndigo}`;
  const hubPanelBtnEmerald = `${uiHubHeader.panelBtn} ${uiHubHeader.pillEmerald}`;
  const hubPanelBtnDanger = `${uiHubHeader.panelBtn} ${globalConfig?.isDebugMode ? uiHubHeader.pillDangerActive : uiHubHeader.pillDanger}`;
  const canOpenUsers = (hasAdminRights || ['Editor', 'Lector'].includes(String(currentUser?.role || ''))) && systemView !== 'users';
  const canOpenArchive = systemView === 'events' && currentUser?.role !== 'Lector';
  const canOpenLogs = systemView !== 'logs' && currentUser && canViewSystemLogs(currentUser);
  const hubHasPanelTools = isSuperUser || systemView === 'events';
  const hubDesktopHasNav =
    systemView !== 'events' || canOpenUsers || canOpenArchive || canOpenLogs;
  const hubDesktopHasTools = isSuperUser || systemView === 'events';
  const hubPillDanger = `${uiHubHeader.pillBase} ${
    globalConfig?.isDebugMode ? uiHubHeader.pillDangerActive : uiHubHeader.pillDanger
  }`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 relative text-slate-900 dark:text-slate-100">
        {toast && (
          <div className={uiFeedback.toast}>
            <ShieldAlert size={20} className="text-amber-400 shrink-0 mt-0.5" />
            <span className="whitespace-pre-line leading-snug font-semibold">{toast}</span>
          </div>
        )}
        {debugToast && <PanelNoticeToast notice={debugToast} />}

        <div className="max-w-5xl mx-auto space-y-8">
          <header className={`p-3 sm:p-6 md:p-0 min-w-0 overflow-hidden ${uiShell.card}`}>
            {/* Escritorio: identidad + barra de herramientas */}
            <div className={uiHubHeader.desktopShell}>
              <div className={uiHubHeader.desktopTopRow}>
                <div className={uiHubHeader.desktopBrandRow}>
                  {(navHistory.length > 0 || forwardNavStack.length > 0) && (
                    <div className={uiHubHeader.desktopNavGroup}>
                      {navHistory.length > 0 && (
                        <button type="button" onClick={goBack} className={uiHubHeader.navIconBtn} title="Regresar">
                          <ArrowLeft size={16} />
                        </button>
                      )}
                      {forwardNavStack.length > 0 && (
                        <button type="button" onClick={goForward} className={uiHubHeader.navIconBtn} title="Avanzar">
                          <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  )}
                  <div className={uiHubHeader.desktopCopy}>
                    <h1 className={uiHubHeader.desktopTitle}>{hubTitle}</h1>
                    <p className={uiHubHeader.desktopSubtitle}>{hubSubtitle}</p>
                  </div>
                </div>

                <div className={uiHubHeader.desktopMeta}>
                  <div className={uiHubHeader.userChip}>
                    <UserCircle size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className={uiHubHeader.userName}>{currentUser.username}</span>
                    {isSuperUser && (
                      <span className={uiHubHeader.sessionBadge} title="Sesiones activas en tiempo real">
                        {superSessionCount} ses.
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={toggleDarkMode}
                    className={uiHubHeader.navIconBtn}
                    title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                  >
                    {darkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-400" />}
                  </button>
                  <button type="button" onClick={handleLogout} className={hubPillRose} title="Cerrar sesión">
                    <LogOut size={14} />
                    Salir
                  </button>
                </div>
              </div>

              {systemView === 'events' && !networkOnline && (
                <div
                  className={uiHubHeader.offlineBanner}
                  title="Firestore guarda los cambios en este dispositivo y los sube al recuperar la conexión"
                >
                  <WifiOff size={14} className="shrink-0" aria-hidden />
                  Sin conexión · modo local
                </div>
              )}

              {(hubDesktopHasNav || hubDesktopHasTools) && (
                <div className={uiHubHeader.desktopToolbar}>
                  {hubDesktopHasNav && (
                    <div className={uiHubHeader.desktopToolGroup}>
                      <span className={uiHubHeader.desktopToolLabel}>Ir a</span>
                      {systemView !== 'events' && (
                        <button type="button" onClick={() => goTo('events', null, 'Summary')} className={hubPillIndigo}>
                          <LayoutDashboard size={14} />
                          Eventos
                        </button>
                      )}
                      {canOpenUsers && (
                        <button type="button" onClick={() => goTo('users', null, 'Summary')} className={hubPillIndigo}>
                          <UserCog size={14} />
                          {hasAdminRights ? 'Usuarios' : 'Mi cuenta'}
                        </button>
                      )}
                      {canOpenArchive && (
                        <button type="button" onClick={() => goTo('archive', null, 'Summary')} className={hubPillSlate}>
                          <Archive size={14} />
                          Archivo
                        </button>
                      )}
                      {canOpenLogs && (
                        <button type="button" onClick={() => goTo('logs', null, 'Summary')} className={hubPillSlate}>
                          <History size={14} />
                          Logs
                        </button>
                      )}
                    </div>
                  )}

                  {hubDesktopHasTools && (
                    <div className={uiHubHeader.desktopToolGroup}>
                      <span className={uiHubHeader.desktopToolLabel}>Herramientas</span>
                      {isSuperUser && (
                        <button type="button" onClick={toggleDebugMode} className={hubPillDanger} title="Modo de prueba aislada">
                          <Bug size={14} />
                          {globalConfig?.isDebugMode ? 'Salir depuración' : 'Depurar'}
                        </button>
                      )}
                      {systemView === 'events' && isSuperUser && (
                        <button
                          type="button"
                          disabled={!!backfillActiveRosterBusy}
                          onClick={() => handleBackfillEventActiveRosterTotals?.()}
                          className={`${hubPillEmerald} disabled:opacity-50 disabled:pointer-events-none`}
                          title="Recalcula activeRosterUnitsTotal en todos los eventos"
                        >
                          <Database size={14} className={backfillActiveRosterBusy ? 'animate-pulse' : ''} aria-hidden />
                          {backfillActiveRosterBusy ? 'Actualizando…' : 'Rellenar contadores'}
                        </button>
                      )}
                      {systemView === 'events' && (
                        <PwaInstallControl showToast={showToast} className={hubPillIndigo} />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Móvil: cabecera compacta unificada */}
            <div className={uiHubHeader.mobileWrap}>
              <div className={uiHubHeader.titleRow}>
                {(navHistory.length > 0 || forwardNavStack.length > 0) && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    {navHistory.length > 0 && (
                      <button type="button" onClick={goBack} className={uiHubHeader.navIconBtn} title="Regresar">
                        <ArrowLeft size={16} />
                      </button>
                    )}
                    {forwardNavStack.length > 0 && (
                      <button type="button" onClick={goForward} className={uiHubHeader.navIconBtn} title="Avanzar">
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                )}
                <h1 className={uiHubHeader.title}>{hubTitle}</h1>
                <div className={uiHubHeader.quickActions}>
                  <button
                    type="button"
                    onClick={toggleDarkMode}
                    className={uiHubHeader.navIconBtn}
                    title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                  >
                    {darkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-400" />}
                  </button>
                  {hubHasPanelTools ? (
                    <button
                      type="button"
                      onClick={() => setHubMobileOptionsOpen((open) => !open)}
                      className={uiHubHeader.optionsBtn(hubMobileOptionsOpen)}
                      title="Más opciones"
                      aria-expanded={hubMobileOptionsOpen}
                      aria-label="Más opciones"
                    >
                      <SlidersHorizontal size={16} />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className={uiHubHeader.userRow}>
                <div className={uiHubHeader.userChip}>
                  <UserCircle size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className={uiHubHeader.userName}>{currentUser.username}</span>
                  {isSuperUser && (
                    <span className={uiHubHeader.sessionBadge} title="Sesiones activas en tiempo real">
                      {superSessionCount} ses.
                    </span>
                  )}
                </div>
              </div>

              {systemView === 'events' && !networkOnline && (
                <div className={uiHubHeader.offlineBanner} title="Firestore guarda los cambios en este dispositivo y los sube al recuperar la conexión">
                  <WifiOff size={14} aria-hidden />
                  Sin conexión · modo local
                </div>
              )}

              <div className={uiHubHeader.navScroll}>
                {systemView !== 'events' && (
                  <button
                    type="button"
                    onClick={() => {
                      setHubMobileOptionsOpen(false);
                      goTo('events', null, 'Summary');
                    }}
                    className={hubPillIndigo}
                  >
                    <LayoutDashboard size={14} />
                    Eventos
                  </button>
                )}
                {canOpenUsers && (
                  <button
                    type="button"
                    onClick={() => {
                      setHubMobileOptionsOpen(false);
                      goTo('users', null, 'Summary');
                    }}
                    className={hubPillIndigo}
                  >
                    <UserCog size={14} />
                    {hasAdminRights ? 'Usuarios' : 'Mi cuenta'}
                  </button>
                )}
                {canOpenArchive && (
                  <button
                    type="button"
                    onClick={() => {
                      setHubMobileOptionsOpen(false);
                      goTo('archive', null, 'Summary');
                    }}
                    className={hubPillSlate}
                  >
                    <Archive size={14} />
                    Archivo
                  </button>
                )}
                {canOpenLogs && (
                  <button
                    type="button"
                    onClick={() => {
                      setHubMobileOptionsOpen(false);
                      goTo('logs', null, 'Summary');
                    }}
                    className={hubPillSlate}
                  >
                    <History size={14} />
                    Logs
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setHubMobileOptionsOpen(false);
                    handleLogout();
                  }}
                  className={hubPillRose}
                >
                  <LogOut size={14} />
                  Salir
                </button>
              </div>

              <MobileCompactToolbarPanel open={hubMobileOptionsOpen}>
                {isSuperUser && (
                  <MobileMenuSection label="SuperUsuario" tone="amber" grid2>
                    <button type="button" onClick={toggleDebugMode} className={hubPanelBtnDanger}>
                      <Bug size={14} />
                      {globalConfig?.isDebugMode ? 'Salir depuración' : 'Depurar'}
                    </button>
                    {systemView === 'events' && (
                      <button
                        type="button"
                        disabled={!!backfillActiveRosterBusy}
                        onClick={() => handleBackfillEventActiveRosterTotals?.()}
                        className={`${hubPanelBtnEmerald} disabled:opacity-50 disabled:pointer-events-none`}
                      >
                        <Database size={14} className={backfillActiveRosterBusy ? 'animate-pulse' : ''} />
                        {backfillActiveRosterBusy ? 'Actualizando…' : 'Rellenar contadores'}
                      </button>
                    )}
                  </MobileMenuSection>
                )}
                {systemView === 'events' && (
                  <MobileMenuSection label="Aplicación" tone="indigo" grid2>
                    <PwaInstallControl
                      showToast={showToast}
                      className={`${hubPanelBtnIndigo} !shadow-none`}
                    />
                  </MobileMenuSection>
                )}
              </MobileCompactToolbarPanel>
            </div>
          </header>

          {globalConfig?.isDebugMode && systemView === 'events' && (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex items-start gap-3 shadow-sm animate-in fade-in">
              <div className="bg-orange-100 p-2 rounded-lg"><Bug className="text-orange-500" size={20} /></div>
              <div>
                <h4 className="text-sm font-black text-orange-800">Modo de Depuración Activo</h4>
                <p className="text-xs text-orange-700 mt-1">
                  Las modificaciones marcadas con el insecto no son permanentes y se eliminarán al salir de este modo.
                </p>
              </div>
            </div>
          )}

          {needsFirestoreResyncAfterBulk && (
            <BulkRestoreResyncBanner onResync={onReloadAfterBulkRestore} busy={bulkResyncBusy} />
          )}

          {systemView === 'users' ? (
            <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6">{renderUsers()}</div>
          ) : systemView === 'logs' ? (
            <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6">{renderLogs()}</div>
          ) : systemView === 'archive' ? (
            <div className="space-y-3 max-w-4xl">
              <p className="text-xs text-slate-500">
                {archivedParticipantsArchiveViewList.length} registro(s) archivado(s)
                {archiveViewSearch.trim() && archivedParticipantsArchiveViewList.length !== archivedParticipantsForView.length
                  ? ` · ${archivedParticipantsArchiveViewList.length} con este filtro`
                  : ''}
                .
                {hasAdminRights
                  ? isSuperUser
                    ? ' Administrador y SuperUsuario: despliega cada fila para ver todos los datos. Como SuperUsuario puedes eliminar definitivamente un registro en Firebase (irreversible).'
                    : ' Administrador: despliega cada fila para ver todos los datos del registro archivado.'
                  : ' Vista de lista; el detalle completo solo para Administrador y SuperUsuario.'}
              </p>
              {archivedParticipantsForView.length > 0 ? (
                <>
                  <div className="hidden sm:flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <div className="relative flex-1 min-w-0">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="search"
                        value={archiveViewSearch}
                        onChange={(e) => setArchiveViewSearch(e.target.value)}
                        placeholder="Buscar por nombre, alias, teléfono, ID VNPM, evento, sede…"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300"
                        autoComplete="off"
                      />
                    </div>
                    <label className="flex items-center gap-2 shrink-0 text-sm text-slate-600">
                      <span className="text-[10px] font-black uppercase text-slate-500 whitespace-nowrap">Orden</span>
                      <select
                        value={archiveViewSort}
                        onChange={(e) => setArchiveViewSort(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/30"
                      >
                        <option value="name">Nombre (A–Z)</option>
                        <option value="date">Fecha de archivo</option>
                      </select>
                    </label>
                  </div>
                  <div className="sm:hidden">
                    <MobileCompactToolbar
                      searchSlot={(
                        <MobileSearchField
                          id="archive-hub-search-mobile"
                          placeholder="Buscar archivo…"
                          value={archiveViewSearch}
                          onChange={(e) => setArchiveViewSearch(e.target.value)}
                        />
                      )}
                      primarySlot={(
                        <>
                          <span className={uiMobileMenu.primaryLabel}>Orden</span>
                          <select
                            value={archiveViewSort}
                            onChange={(e) => setArchiveViewSort(e.target.value)}
                            className={`${uiMobileMenu.selectCompact} max-w-[6.5rem]`}
                            aria-label="Orden del archivo"
                          >
                            <option value="name">A–Z</option>
                            <option value="date">Fecha</option>
                          </select>
                        </>
                      )}
                      metaSlot={(
                        <span className={uiMobileMenu.metaRight} title="Registros visibles">
                          {archivedParticipantsArchiveViewList.length}
                        </span>
                      )}
                    />
                  </div>
                </>
              ) : null}
              {archivedParticipantsForView.length === 0 ? (
                <p className="text-sm text-slate-400">No hay registros archivados.</p>
              ) : archivedParticipantsArchiveViewList.length === 0 ? (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  Ningún registro coincide con la búsqueda. Prueba otro término o borra el filtro.
                </p>
              ) : (
                archivedParticipantsArchiveViewList.map((p) => {
                  const sourceEventNames =
                    p._sourceEventNames && p._sourceEventNames.length > 0
                      ? p._sourceEventNames.join(', ')
                      : events.find((e) => e.id === p.eventId)?.name || 'Evento desconocido';

                  const archivedAt = p.archivedAt
                    ? new Date(
                        typeof p.archivedAt?.toMillis === 'function'
                          ? p.archivedAt.toMillis()
                          : Number(p.archivedAt) || 0
                      )
                    : null;

                  const mergedCount = p._mergedFromCount || 1;

                  return (
                    <details
                      key={p.id}
                      className="group rounded-2xl border border-slate-200 bg-white shadow-sm open:shadow-md open:border-indigo-200 transition-shadow"
                    >
                      <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
                        <span className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-indigo-700 font-black truncate max-w-[min(100%,28rem)]">{p.name || 'Sin nombre'}</span>
                          <span className="text-slate-400 font-normal">·</span>
                          <span className="text-slate-600 font-medium">{sourceEventNames}</span>
                          {mergedCount > 1 && (
                            <span className="ml-0.5 rounded-lg bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800">
                              {mergedCount} registros
                            </span>
                          )}
                          {archivedAt && !Number.isNaN(archivedAt.getTime()) ? (
                            <span className="text-slate-500 font-normal text-xs">
                              · {archivedAt.toLocaleDateString('es-MX')}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 group-open:hidden shrink-0">
                          Ver datos
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-500 hidden group-open:inline shrink-0">
                          Ocultar
                        </span>
                      </summary>
                      <div className="px-4 pb-4">
                        <ArchivedParticipantDetailPanel
                          person={p}
                          hasAdminRights={hasAdminRights}
                          isSuperUser={isSuperUser}
                          openPermanentDeleteArchivedParticipantConfirm={openPermanentDeleteArchivedParticipantConfirm}
                        />
                      </div>
                    </details>
                  );
                })
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleEvents.map(ev => {
                const evtPricing = getPricingFromSnapshot(ev);
                return (
                  <div
                    key={ev.id}
                    draggable={hasAdminRights}
                    onDragStart={(e) => { if (hasAdminRights) { setDraggedEventId(ev.id); e.dataTransfer.effectAllowed = "move"; } }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, ev.id)}
                    onDragEnd={() => setDraggedEventId(null)}
                    className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 transition-all relative group flex flex-col justify-between ${hasAdminRights ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${draggedEventId === ev.id ? 'opacity-40 scale-95' : 'opacity-100 scale-100'}`}
                    onClick={() => goTo('events', ev.id, resolvePreferredLandingTab(currentUser, ev))}
                  >
                    {hasAdminRights && <div className="absolute top-3 right-3 text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"><GripVertical size={18} /></div>}
                    <div>
                      <div className="bg-indigo-50 text-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center mb-2.5"><CalendarRange size={20} /></div>
                      
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <h3 className="text-base font-bold text-slate-800 leading-tight pr-2 flex items-center gap-2">
                          {ev.name}
                          {ev._isDebug && ev._debugSessionId === globalConfig?.debugSessionId && <Bug size={14} className="text-orange-500" title="Cambio no permanente" />}
                        </h3>
                        {hasAdminRights && (
                          <button onClick={(e) => { e.stopPropagation(); setRenameModal({isOpen: true, id: ev.id, name: ev.name}); }} className="text-slate-300 hover:text-indigo-600 p-1 flex-shrink-0">
                            <Edit3 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <span className={uiBadgeSoft('indigo')}>{ev.eventType}</span>
                        
                        {hasAdminRights ? (
                          <label className="relative flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 px-2.5 py-1 rounded-full border border-slate-200 hover:border-indigo-200 transition-colors uppercase cursor-pointer group shadow-sm overflow-hidden" onClick={e => e.stopPropagation()} title="Cambiar fecha del evento">
                            <span className="max-w-[11rem] truncate" title={formatEventDateRangeLabel(ev)}>
                              {formatEventDateRangeLabel(ev)}
                            </span>
                            <Edit3 size={12} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            <input
                              type="date"
                              defaultValue={ev.date || ''}
                              onChange={async (e) => {
                                const newVal = e.target.value;
                                if (newVal !== (ev.date || '')) {
                                  const payload = { date: newVal, dateStart: newVal, dateEnd: newVal };
                                  if (globalConfig?.isDebugMode) { payload._isDebug = true; payload._debugSessionId = globalConfig.debugSessionId; }
                                  await updateDoc(getDocRef('app_events', ev.id), payload);
                                  addLog('Gestión de Eventos', `Cambió fecha de evento "${ev.name}": "${ev.date || 'Sin fecha'}" -> "${newVal}"`, null, ev, { collectionName: 'app_events', docId: ev.id, action: 'update', previousData: ev });
                                }
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                            />
                          </label>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200 uppercase shadow-sm max-w-[11rem] truncate" title={formatEventDateRangeLabel(ev)}>
                            {formatEventDateRangeLabel(ev)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-end mt-4">
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Costo base</p>
                        <p className="text-base font-black text-green-600 truncate">${evtPricing.global}</p>
                      </div>
                      <div
                        className="space-y-1 text-center min-w-0"
                        title={
                          ev.eventType === 'Bautizos'
                            ? 'Igual que «Registros totales» del dashboard (modo Todos): filas activas en sedes del evento más acompañantes canónicos con nombre (cada persona una vez).'
                            : 'Igual que «Registros totales» del dashboard (modo Todos): inscritos activos en sedes del evento. En Campa, servidor «Ambos» puede contar ×2 si está activada la opción en costo real.'
                        }
                      >
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Registros totales</p>
                        <p className="text-base font-black text-indigo-600 tabular-nums">
                          {activeRosterUnitsByEventId?.[ev.id] ?? 0}
                        </p>
                      </div>
                      <div className="space-y-1 text-right min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sedes</p>
                        <p className="text-sm font-bold text-slate-700 tabular-nums">{ev.locations ? ev.locations.length : 0}</p>
                      </div>
                    </div>
                    {hasAdminRights && (
                      <button onClick={(e) => { e.stopPropagation(); setDeleteEventModal({ isOpen: true, id: ev.id, name: ev.name }); }} className="absolute bottom-6 right-6 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all z-10"><Trash2 size={18} /></button>
                    )}
                  </div>
                );
              })}
              {hasAdminRights && (
                <div className="bg-indigo-50/50 rounded-3xl p-6 border-2 border-dashed border-indigo-200 flex flex-col justify-center items-center text-indigo-500 hover:bg-indigo-50 hover:border-indigo-400 cursor-pointer transition-all min-h-[200px] dark:border-indigo-600 dark:bg-slate-900/80 dark:text-indigo-400 dark:hover:bg-slate-800 dark:hover:border-indigo-500" onClick={() => setIsAddEventModalOpen(true)}>
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-sm dark:shadow-none dark:border dark:border-indigo-500/40 mb-3"><Plus size={24} className="text-indigo-600 dark:text-indigo-400" /></div>
                  <span className="font-bold text-sm">Crear Nuevo Evento</span>
                </div>
              )}
            </div>
          )}
        </div>

        {deleteEventModal.isOpen && (
          <div className={`${uiModal.overlay} z-50`}>
            <button type="button" className={uiModal.backdrop} onClick={() => setDeleteEventModal({ isOpen: false, id: null, name: '' })} aria-label="Cerrar modal eliminar evento" />
            <form
              className={`${uiModal.panel} max-w-sm p-8 animate-in zoom-in-95 duration-200 text-center`}
              onSubmit={(e) => {
                e.preventDefault();
                confirmDeleteEvent();
              }}
            >
              <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><ShieldAlert size={32} className="text-red-500" /></div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Eliminar Evento</h3>
              <p className="text-sm text-slate-500 mb-6">
                ¿Estás seguro de que deseas eliminar <strong>&ldquo;{deleteEventModal.name}&rdquo;</strong>? Todos los registros del evento se archivarán antes de borrarlo. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setDeleteEventModal({ isOpen: false, id: null, name: '' })} className={btnSecondary}>Cancelar</button>
                <button type="submit" className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors text-sm shadow-lg shadow-red-200">{SI_LABEL}, eliminar</button>
              </div>
            </form>
          </div>
        )}

        {isAddEventModalOpen && (
          <div className={`${uiModal.overlay} z-50`}>
            <button type="button" className={uiModal.backdrop} onClick={() => { setIsAddEventModalOpen(false); setNewEventData({ name: '', type: 'Campa', date: '', baseCost: '' }); }} aria-label="Cerrar modal nuevo evento" />
            <form
              className={`${uiModal.panel} max-w-sm p-8 animate-in zoom-in-95 duration-200`}
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateEvent();
              }}
            >
              <h3 className="text-xl font-black text-slate-800 mb-2">Nuevo Evento</h3>
              <p className="text-sm text-slate-500 mb-6">Ingresa los detalles para el nuevo evento.</p>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className={labelClasses}>Título del Evento</label>
                  <input type="text" autoFocus className={inputClasses} placeholder="Ej. Campamento Jóvenes 2027" value={newEventData.name} onChange={e => setNewEventData({ ...newEventData, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className={labelClasses}>Costo Base ($) Inicial</label>
                  <input type="number" className={inputClasses} placeholder="Ej. 150" value={newEventData.baseCost} onChange={e => setNewEventData({ ...newEventData, baseCost: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className={labelClasses}>Fecha del Evento (Opcional)</label>
                  <input type="date" className={inputClasses} value={newEventData.date} onChange={e => setNewEventData({ ...newEventData, date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className={labelClasses}>Tipo de Evento</label>
                  <select className={inputClasses} value={newEventData.type} onChange={e => setNewEventData({ ...newEventData, type: e.target.value })}>
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => { setIsAddEventModalOpen(false); setNewEventData({ name: '', type: 'Campa', date: '', baseCost: '' }); }} className={btnSecondary}>Cancelar</button>
                  <button type="submit" disabled={!newEventData.name.trim()} className={btnPrimary}><Plus size={18} /> Crear</button>
                </div>
              </div>
            </form>
          </div>
        )}

        {editingUser.isOpen && (
          <UserAccountModalShell
            open={editingUser.isOpen}
            onClose={() => setEditingUser(closedEditingUserState())}
            onSubmit={handleUpdateUser}
            formId="edit-user-form"
            title={
              String(currentUser?.id) === String(editingUser.id) &&
              ['Editor', 'Lector'].includes(String(currentUser?.role || '').trim()) &&
              !hasAdminRights
                ? 'Mi cuenta'
                : 'Editar usuario'
            }
            subtitle={
              String(currentUser?.id) === String(editingUser.id) &&
              ['Editor', 'Lector'].includes(String(currentUser?.role || '').trim()) &&
              !hasAdminRights
                ? 'Cambia tu usuario, contraseña, ventana inicial y visibilidad de tus conceptos de gasto.'
                : 'Perfil, permisos, accesos por evento/sede y seguridad.'
            }
            headerIcon={
              <span className={uiUserAccountForm.headerIconWrapEdit}>
                <UserCog size={20} />
              </span>
            }
            submitLabel="Guardar cambios"
          >
              <div className="space-y-3">
                {(() => {
                  const isSelfEdit = String(currentUser?.id) === String(editingUser.id);
                  const editorLectorSelfProfile =
                    isSelfEdit &&
                    ['Editor', 'Lector'].includes(String(currentUser?.role || '').trim()) &&
                    !hasAdminRights;
                  const isTargetSuperUser = editingUser.role === 'SuperUsuario';
                  const backupPwd = users.find((x) => String(x.id) === String(editingUser.id))?.plainPasswordBackup;
                  
                  const focusInputClasses = uiUserAccountForm.input;
                  
                  const registeredPasswordRow = (
                    <div className="space-y-1">
                      <label className={`${labelClasses} font-bold text-slate-600 dark:text-slate-400`}>Contraseña registrada</label>
                      <div className="flex gap-2 items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all">
                        <span className="text-slate-400 pl-2 shrink-0"><Lock size={15} /></span>
                        <input
                          readOnly
                          type={editingUserPlainPwdVisible ? 'text' : 'password'}
                          className="font-mono text-sm bg-transparent border-0 outline-none flex-1 min-w-[12rem] text-slate-800 dark:text-slate-100 px-2 py-1"
                          value={backupPwd || ''}
                          placeholder="Sin respaldo"
                        />
                        <button
                          type="button"
                          onClick={() => setEditingUserPlainPwdVisible((v) => !v)}
                          className="p-2 rounded-lg bg-white dark:bg-slate-850 border border-slate-200/60 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all shrink-0"
                          title={editingUserPlainPwdVisible ? "Ocultar" : "Mostrar"}
                        >
                          {editingUserPlainPwdVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!backupPwd) {
                              showToast('No hay contraseña para copiar.');
                              return;
                            }
                            navigator.clipboard.writeText(backupPwd).then(() => showToast('Copiada.')).catch(() => showToast('No se pudo copiar.'));
                          }}
                          className="px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100/50 dark:border-indigo-900/30 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 active:scale-95 transition-all shrink-0"
                        >
                          Copiar
                        </button>
                      </div>
                    </div>
                  );

                  if (editorLectorSelfProfile) {
                    return (
                      <>
                        <div className="space-y-3">
                          <div className={uiUserAccountForm.section}>
                            <div className="space-y-1">
                              <label className={`${labelClasses} font-bold text-slate-600 dark:text-slate-400`}>Usuario</label>
                              <input
                                type="text"
                                required
                                className={focusInputClasses}
                                value={editingUser.username}
                                onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-3 sm:p-3.5 shadow-sm space-y-2.5">
                            <div className="space-y-1">
                              <label className={`${labelClasses} font-bold text-slate-600 dark:text-slate-400`}>Correo de acceso (Firebase)</label>
                              <input
                                type="email"
                                readOnly
                                className={`${focusInputClasses} bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed`}
                                value={
                                  users.find((x) => String(x.id) === String(editingUser.id))?.authEmail ||
                                  usernameToAuthEmail(editingUser.username)
                                }
                              />
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Para cambiarlo, pide a un administrador.</p>
                          </div>

                          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-3 sm:p-3.5 shadow-sm space-y-2.5">
                            <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                              <Lock size={15} className="text-indigo-500" />
                              Cambio de contraseña
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <label className={`${labelClasses} font-bold text-slate-600 dark:text-slate-400`}>Contraseña actual</label>
                                <input type="password" className={focusInputClasses} value={editingUser.currentPasswordInput} onChange={(e) => setEditingUser({ ...editingUser, currentPasswordInput: e.target.value })} />
                              </div>
                              <div className="space-y-1">
                                <label className={`${labelClasses} font-bold text-slate-600 dark:text-slate-400`}>Nueva contraseña</label>
                                <input type="password" className={focusInputClasses} value={editingUser.newPassword} onChange={(e) => setEditingUser({ ...editingUser, newPassword: e.target.value })} />
                              </div>
                              <div className="space-y-1">
                                <label className={`${labelClasses} font-bold text-slate-600 dark:text-slate-400`}>Confirmar</label>
                                <input type="password" className={focusInputClasses} value={editingUser.confirmPassword} onChange={(e) => setEditingUser({ ...editingUser, confirmPassword: e.target.value })} />
                              </div>
                            </div>
                          </div>

                          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-3 sm:p-3.5 shadow-sm space-y-2">
                            <label className={`${labelClasses} font-bold text-slate-600 dark:text-slate-400`}>Ventana de inicio preferida</label>
                            <select className={focusInputClasses} value={editingUser.preferredLandingTab || 'Summary'} onChange={(e) => setEditingUser({ ...editingUser, preferredLandingTab: e.target.value })}>
                              <option value="Summary">Dashboard principal</option>
                              {(() => {
                                let locs = ['Administrador', 'SuperUsuario'].includes(editingUser.role)
                                  ? allKnownLocationNames
                                  : ((editingUser.allowedLocations || []).length ? editingUser.allowedLocations : allKnownLocationNames);
                                const p = String(editingUser.preferredLandingTab || '').trim();
                                if (p && p !== 'Summary' && !locs.includes(p)) locs = [...locs, p];
                                return locs.map((loc) => (
                                  <option key={`pref-edit-self-${loc}`} value={loc}>
                                    {loc}
                                  </option>
                                ));
                              })()}
                            </select>
                          </div>

                          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-3 sm:p-3.5 shadow-sm">
                            <label className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                className="accent-indigo-600 w-4 h-4 rounded"
                                checked={editingUser.hideMyExpenseConcepts !== false}
                                onChange={(e) => setEditingUser({ ...editingUser, hideMyExpenseConcepts: e.target.checked })}
                              />
                              <span>Ocultar mis conceptos de gastos para otros usuarios</span>
                            </label>
                          </div>
                        </div>
                      </>
                    );
                  }

                  const isTargetSuper = editingUser.role === 'SuperUsuario';
                  const isTargetAdmin = editingUser.role === 'Administrador';
                  const badgeGradient = isTargetSuper 
                    ? 'from-amber-500 to-yellow-600 shadow-amber-500/10'
                    : isTargetAdmin 
                      ? 'from-violet-500 to-indigo-600 shadow-indigo-500/10' 
                      : 'from-indigo-500 to-teal-600 shadow-indigo-500/10';

                  return (
                    <>
                      <div className="space-y-3">
                        <div className={uiUserAccountForm.section}>
                          <p className={`${uiUserAccountForm.sectionTitle} flex flex-wrap items-center gap-2`}>
                            Identidad y acceso
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white bg-gradient-to-r ${badgeGradient}`}>
                              {editingUser.role}
                            </span>
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className={`${labelClasses} font-bold text-slate-600 dark:text-slate-400`}>Usuario</label>
                              <input
                                type="text"
                                required
                                disabled={!isSelfEdit && !hasAdminRights}
                                className={`${focusInputClasses} ${!isSelfEdit && !hasAdminRights ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed' : ''}`}
                                value={editingUser.username}
                                onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className={`${labelClasses} font-bold text-slate-600 dark:text-slate-400`}>Correo de acceso (Firebase)</label>
                              <input
                                type="email"
                                className={focusInputClasses}
                                value={editingUser.authEmail || ''}
                                onChange={(e) => setEditingUser({ ...editingUser, authEmail: e.target.value })}
                                disabled={!hasAdminRights}
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-snug">
                            El correo de acceso puede diferir del nombre de usuario. Dominio interno por defecto: @{AUTH_EMAIL_DOMAIN}.
                          </p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-3 sm:p-3.5 shadow-sm space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                            <div className="space-y-1">
                              <label className={`${labelClasses} font-bold text-slate-600 dark:text-slate-400`}>Rol del Sistema</label>
                              <select
                                disabled={isTargetSuperUser}
                                className={`${focusInputClasses} ${isTargetSuperUser ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed' : ''}`}
                                value={editingUser.role}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  const latestEvent = sortedEvents.length ? sortedEvents[sortedEvents.length - 1] : null;
                                  const latestLoc = latestEvent?.locations?.length ? latestEvent.locations[latestEvent.locations.length - 1] : '';
                                  if (v === 'Administrador') {
                                    setEditingUser({
                                      ...editingUser,
                                      role: v,
                                      maxConcurrentSessions: '1',
                                      allowedEventIds: [],
                                      allowedLocations: [],
                                      allowedLocationsByEvent: {},
                                      allowedPanelSections: { ...DEFAULT_PANEL_NAV, expenseList: false },
                                      allowedPanelSectionsByEvent: {},
                                      canViewExpenses: false,
                                      canViewFinances: true,
                                      canSendWhatsAppQuickAction: true,
                                      canMarkResponsivaLocalQuickAction: true,
                                      canSendResponsivaDigitalQuickAction: true,
                                    });
                                    return;
                                  }
                                  if (v === 'Editor' || v === 'Lector') {
                                    setEditingUser({
                                      ...editingUser,
                                      role: v,
                                      allowedEventIds: latestEvent ? [latestEvent.id] : [],
                                      allowedLocations: latestLoc ? [latestLoc] : [],
                                      allowedLocationsByEvent: latestEvent && latestLoc ? { [latestEvent.id]: [latestLoc] } : {},
                                      allowedPanelSections: { ...EDITOR_LECTOR_PANEL_DEFAULT },
                                      allowedPanelSectionsByEvent: latestEvent ? { [latestEvent.id]: { ...EDITOR_LECTOR_PANEL_DEFAULT } } : {},
                                      canViewExpenses: false,
                                      canViewFinances: false,
                                      canSendWhatsAppQuickAction: false,
                                      canMarkResponsivaLocalQuickAction: true,
                                      canSendResponsivaDigitalQuickAction: false,
                                      canCancelRegistrations: v === 'Editor' ? !!editingUser.canCancelRegistrations : false,
                                    });
                                    return;
                                  }
                                  setEditingUser({ ...editingUser, role: v });
                                }}
                              >
                                {editingUser.role === 'SuperUsuario' && <option value="SuperUsuario">SuperUsuario</option>}
                                <option value="Administrador">Administrador</option>
                                <option value="Editor">Editor</option>
                                <option value="Lector">Lector</option>
                              </select>
                            </div>

                            {editingUser.role === 'Administrador' && !isTargetSuperUser && (
                              <div className="space-y-1">
                                <label className={`${labelClasses} font-bold text-slate-600 dark:text-slate-400`}>Sesiones activas simultáneas</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={20}
                                  disabled={!isSuperUser}
                                  className={`${focusInputClasses} ${!isSuperUser ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : ''}`}
                                  value={editingUser.maxConcurrentSessions}
                                  onChange={(e) => setEditingUser({ ...editingUser, maxConcurrentSessions: e.target.value })}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {(isSelfEdit || isSuperUser) && (
                          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-3 sm:p-3.5 shadow-sm space-y-2.5">
                            <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                              <Lock size={15} className="text-indigo-500" />
                              Seguridad y Cambio de Contraseña
                            </p>
                            {isSelfEdit ? (
                              <div className="space-y-2.5">
                                {isSuperUser ? registeredPasswordRow : null}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                  <div className="space-y-1">
                                    <label className={`${labelClasses} font-bold text-slate-600 dark:text-slate-400`}>Contraseña actual</label>
                                    <input type="password" className={focusInputClasses} value={editingUser.currentPasswordInput} onChange={e => setEditingUser({ ...editingUser, currentPasswordInput: e.target.value })} />
                                  </div>
                                  <div className="space-y-1">
                                    <label className={`${labelClasses} font-bold text-slate-600 dark:text-slate-400`}>Nueva contraseña</label>
                                    <input type="password" className={focusInputClasses} value={editingUser.newPassword} onChange={e => setEditingUser({ ...editingUser, newPassword: e.target.value })} />
                                  </div>
                                  <div className="space-y-1">
                                    <label className={`${labelClasses} font-bold text-slate-600 dark:text-slate-400`}>Confirmar nueva</label>
                                    <input type="password" className={focusInputClasses} value={editingUser.confirmPassword} onChange={e => setEditingUser({ ...editingUser, confirmPassword: e.target.value })} />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                {registeredPasswordRow}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className={`${labelClasses} font-bold text-slate-600 dark:text-slate-400`}>Nueva contraseña</label>
                                    <input
                                      type="password"
                                      autoComplete="new-password"
                                      className={focusInputClasses}
                                      value={editingUser.adminNewPassword}
                                      onChange={(e) => setEditingUser({ ...editingUser, adminNewPassword: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className={`${labelClasses} font-bold text-slate-600 dark:text-slate-400`}>Confirmar nueva</label>
                                    <input
                                      type="password"
                                      autoComplete="new-password"
                                      className={focusInputClasses}
                                      value={editingUser.adminConfirmPassword}
                                      onChange={(e) => setEditingUser({ ...editingUser, adminConfirmPassword: e.target.value })}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                                  <label className={`${labelClasses} font-bold text-slate-600 dark:text-slate-400`}>Contraseña actual en Firebase (si no hay respaldo)</label>
                                  <input
                                    type="password"
                                    autoComplete="off"
                                    className={focusInputClasses}
                                    value={editingUser.adminTargetCurrentPassword || ''}
                                    onChange={(e) => setEditingUser({ ...editingUser, adminTargetCurrentPassword: e.target.value })}
                                    placeholder="Opcional si el respaldo arriba es la clave vigente"
                                  />
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">
                                    Guardar aplica el cambio en Firebase y actualiza el respaldo cuando la verificación sea correcta.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-3 sm:p-3.5 shadow-sm space-y-2">
                          <label className={`${labelClasses} font-bold text-slate-600 dark:text-slate-400`}>Ventana de Inicio Preferida</label>
                          <select className={focusInputClasses} value={editingUser.preferredLandingTab || 'Summary'} onChange={e => setEditingUser({ ...editingUser, preferredLandingTab: e.target.value })}>
                            <option value="Summary">Dashboard principal</option>
                            {(() => {
                              let locs = ['Administrador', 'SuperUsuario'].includes(editingUser.role)
                                ? allKnownLocationNames
                                : ((editingUser.allowedLocations || []).length ? editingUser.allowedLocations : allKnownLocationNames);
                              const p = String(editingUser.preferredLandingTab || '').trim();
                              if (p && p !== 'Summary' && !locs.includes(p)) locs = [...locs, p];
                              return locs.map((loc) => <option key={`pref-edit-${loc}`} value={loc}>{loc}</option>);
                            })()}
                          </select>
                        </div>
{editingUser.role !== 'SuperUsuario' && (
                          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-3 sm:p-3.5 shadow-sm space-y-3">
                            <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                              <CalendarRange size={15} className="text-indigo-500" />
                              Alcance de Eventos y Sedes
                            </p>

                            <div className="space-y-2.5">
                              {/* Control de Todos los Eventos */}
                              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Todos los eventos disponibles</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    disabled={!isSuperUser}
                                    checked={(editingUser.allowedEventIds || []).length === 0}
                                    onChange={(e) => {
                                      const nextEventIds = e.target.checked ? [] : (sortedEvents[0] ? [sortedEvents[0].id] : []);
                                      const nextLocationsByEvent = { ...(editingUser.allowedLocationsByEvent || {}) };
                                      const nextPanelsByEvent = { ...(editingUser.allowedPanelSectionsByEvent || {}) };
                                      if (nextEventIds.length > 0) {
                                        const set = new Set(nextEventIds.map((id) => String(id)));
                                        Object.keys(nextLocationsByEvent).forEach((id) => { if (!set.has(String(id))) delete nextLocationsByEvent[id]; });
                                        Object.keys(nextPanelsByEvent).forEach((id) => { if (!set.has(String(id))) delete nextPanelsByEvent[id]; });
                                      }
                                      setEditingUser({ ...editingUser, allowedEventIds: nextEventIds, allowedLocationsByEvent: nextLocationsByEvent, allowedPanelSectionsByEvent: nextPanelsByEvent });
                                    }}
                                  />
                                  <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                                </label>
                              </div>

                              {/* Lista de Selección de Eventos Individuales */}
                              {((editingUser.allowedEventIds || []).length > 0) && (
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                    Selección de Eventos Activos
                                  </label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 border border-slate-100 dark:border-slate-800/80 rounded-lg p-2 bg-slate-50/50 dark:bg-slate-955/10">
                                    {sortedEvents.map((ev) => {
                                      const checked = (editingUser.allowedEventIds || []).includes(ev.id);
                                      return (
                                        <label key={ev.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs font-bold cursor-pointer transition-all ${
                                          checked 
                                            ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 shadow-sm shadow-indigo-500/5' 
                                            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}>
                                          <input
                                            type="checkbox"
                                            className="accent-indigo-600 w-4 h-4 rounded"
                                            disabled={!isSuperUser}
                                            checked={checked}
                                            onChange={(e) => {
                                              const prev = editingUser.allowedEventIds || [];
                                              const next = e.target.checked ? [...prev, ev.id] : prev.filter((id) => id !== ev.id);
                                              const nextLocationsByEvent = { ...(editingUser.allowedLocationsByEvent || {}) };
                                              const nextPanelsByEvent = { ...(editingUser.allowedPanelSectionsByEvent || {}) };
                                              if (next.length > 0) {
                                                const set = new Set(next.map((id) => String(id)));
                                                Object.keys(nextLocationsByEvent).forEach((id) => { if (!set.has(String(id))) delete nextLocationsByEvent[id]; });
                                                Object.keys(nextPanelsByEvent).forEach((id) => { if (!set.has(String(id))) delete nextPanelsByEvent[id]; });
                                              }
                                              setEditingUser({ ...editingUser, allowedEventIds: next, allowedLocationsByEvent: nextLocationsByEvent, allowedPanelSectionsByEvent: nextPanelsByEvent });
                                            }}
                                          />
                                          <span className="truncate">{ev.name}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Configuración de Sedes por Evento (Acordeones Premium) */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                  Configuración detallada de sedes y secciones
                                </label>
                                <div className="space-y-2">
                                  {(
                                    (editingUser.allowedEventIds || []).length === 0
                                      ? sortedEvents
                                      : sortedEvents.filter((ev) => (editingUser.allowedEventIds || []).includes(ev.id))
                                  ).map((ev) => {
                                    const selected = Array.isArray(editingUser.allowedLocationsByEvent?.[ev.id]) ? editingUser.allowedLocationsByEvent[ev.id] : [];
                                    const basePanelEdit =
                                      editingUser.role === 'Editor' || editingUser.role === 'Lector'
                                        ? EDITOR_LECTOR_PANEL_DEFAULT
                                        : { ...DEFAULT_PANEL_NAV, expenseList: false };
                                    const selectedPanel = mergePanelSectionLayers(
                                      basePanelEdit,
                                      editingUser.allowedPanelSections,
                                      editingUser.allowedPanelSectionsByEvent?.[ev.id]
                                    );
                                    const locList = ev.locations || [];
                                    const allLocsSelected = locList.length > 0 && locList.every((loc) => selected.includes(loc));
                                    const someLocsSelected = locList.some((loc) => selected.includes(loc));

                                    return (
                                      <details key={`edit-ev-loc-${ev.id}`} className="group rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm shadow-slate-100/50 dark:shadow-none transition-all duration-300">
                                        <summary className="list-none cursor-pointer select-none flex items-center justify-between px-3.5 py-2 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/70 transition-colors border-b border-transparent group-open:border-slate-100 dark:group-open:border-slate-800">
                                          <div className="flex items-center gap-2">
                                            <span className="w-1 h-5 rounded-full bg-indigo-500"></span>
                                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">{ev.name}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">
                                              {selected.length} / {locList.length} sedes
                                            </span>
                                            <span className="text-slate-400 transition-transform duration-300 group-open:rotate-180">
                                              <ChevronDown size={16} />
                                            </span>
                                          </div>
                                        </summary>
                                        <div className="p-3 space-y-3">
                                          {locList.length > 0 && (
                                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                                              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Restricción de sedes</span>
                                              <label className="flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  className="accent-indigo-600 w-4 h-4 rounded"
                                                  disabled={!isSuperUser}
                                                  checked={allLocsSelected}
                                                  ref={(input) => {
                                                    if (input) input.indeterminate = someLocsSelected && !allLocsSelected;
                                                  }}
                                                  onChange={(e) => {
                                                    setEditingUser({
                                                      ...editingUser,
                                                      allowedLocationsByEvent: {
                                                        ...(editingUser.allowedLocationsByEvent || {}),
                                                        [ev.id]: e.target.checked ? [...locList] : [],
                                                      },
                                                    });
                                                  }}
                                                />
                                                Todas las sedes
                                              </label>
                                            </div>
                                          )}

                                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                            {(ev.locations || []).map((loc) => {
                                              const isLocChecked = selected.includes(loc);
                                              return (
                                                <label key={`edit-${ev.id}-${loc}`} className={`flex items-center gap-2 px-2 py-1.5 rounded-md border text-xs font-semibold cursor-pointer transition-all ${
                                                  isLocChecked
                                                    ? 'bg-slate-50 dark:bg-slate-900 border-indigo-500/50 text-indigo-700 dark:text-indigo-400'
                                                    : 'bg-white dark:bg-slate-955 border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-800'
                                                }`}>
                                                  <input
                                                    type="checkbox"
                                                    className="accent-indigo-600 w-3 h-3 rounded"
                                                    disabled={!isSuperUser}
                                                    checked={isLocChecked}
                                                    onChange={(e) => {
                                                      const prev = Array.isArray(editingUser.allowedLocationsByEvent?.[ev.id]) ? editingUser.allowedLocationsByEvent[ev.id] : [];
                                                      const next = e.target.checked ? [...prev, loc] : prev.filter((x) => x !== loc);
                                                      setEditingUser({
                                                        ...editingUser,
                                                        allowedLocationsByEvent: { ...(editingUser.allowedLocationsByEvent || {}), [ev.id]: next },
                                                      });
                                                    }}
                                                  />
                                                  <span className="truncate">{loc}</span>
                                                </label>
                                              );
                                            })}
                                          </div>

                                          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                              Acceso a Secciones del Menú Lateral
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-50/50 dark:bg-slate-955/20 border border-slate-100/50 dark:border-slate-800 rounded-lg p-2">
                                              {(PANEL_NAV_SIDEBAR_ITEMS || [])
                                                .filter((item) => panelNavSidebarItemAppliesToEvent(item.key, ev.eventType))
                                                .map((item) => {
                                                  const { label, hint } = resolvePanelNavConfigItemCopy(item, ev.eventType);
                                                  const isSectionChecked = selectedPanel[item.key] !== false;
                                                  return (
                                                    <label
                                                      key={`edit-panel-${ev.id}-${item.key}`}
                                                      className={`flex items-start gap-2 px-2.5 py-1.5 rounded-md border text-[11px] font-semibold cursor-pointer transition-all ${
                                                        isSectionChecked
                                                          ? 'bg-white dark:bg-slate-900 border-indigo-500/20 text-slate-700 dark:text-slate-200'
                                                          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-955 text-slate-400 dark:text-slate-600'
                                                      }`}
                                                      title={hint || undefined}
                                                    >
                                                      <input
                                                        type="checkbox"
                                                        className="accent-indigo-600 w-3.5 h-3.5 rounded mt-0.5"
                                                        disabled={!isSuperUser || isTargetSuperUser}
                                                        checked={isSectionChecked}
                                                        onChange={e => setEditingUser({
                                                          ...editingUser,
                                                          allowedPanelSectionsByEvent: {
                                                            ...(editingUser.allowedPanelSectionsByEvent || {}),
                                                            [ev.id]: {
                                                              ...selectedPanel,
                                                              [item.key]: e.target.checked,
                                                            },
                                                          },
                                                        })}
                                                      />
                                                      <span className="leading-snug">{label}</span>
                                                    </label>
                                                  );
                                                })}
                                            </div>
                                          </div>
                                        </div>
                                      </details>
                                    );
                                  })}
                                 </div>
                               </div>
                             </div>
                           </div>
                         )}

                         {isSuperUser && !isTargetSuperUser && (
                          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-955 border border-slate-800/80 rounded-xl p-3.5 sm:p-4 shadow-lg shadow-indigo-950/20 text-white space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-800/60">
                              <ShieldAlert size={18} className="text-indigo-400 shrink-0" />
                              <div>
                                <p className="text-xs font-black uppercase tracking-wider">Centro de Seguridad y Permisos Avanzados</p>
                                <p className="text-[10px] text-slate-400 leading-snug">
                                  Solo visible para el SuperUsuario. La lista de gastos se configura aquí, no en el menú lateral.
                                </p>
                              </div>
                            </div>

                            <AdvancedUserPermissionsPanel
                              value={editingUser}
                              fieldsDisabled={isTargetSuperUser}
                              onChange={(patch) => setEditingUser((prev) => ({ ...prev, ...patch }))}
                            />
                          </div>
                        )}

                        {hasAdminRights && !isSuperUser && editingUser.role === 'Editor' && (
                          <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-amber-950 border border-slate-800/80 rounded-xl p-3.5 sm:p-4 shadow-lg shadow-amber-950/20 text-white space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-800/60">
                              <ShieldAlert size={18} className="text-amber-400 shrink-0" />
                              <div>
                                <p className="text-xs font-black uppercase tracking-wider">Permisos de registro (Editor)</p>
                                <p className="text-[10px] text-slate-400 leading-snug">
                                  Puede delegar dar de baja en el roster. Archivar sigue reservado a administradores.
                                </p>
                              </div>
                            </div>
                            <AdvancedUserPermissionsPanel
                              value={editingUser}
                              delegateMode="roster-only"
                              onChange={(patch) => setEditingUser((prev) => ({ ...prev, ...patch }))}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
          </UserAccountModalShell>
        )}


        {renameModal.isOpen && (
          <div className={`${uiModal.overlay} z-50`}>
            <button type="button" className={uiModal.backdrop} onClick={() => setRenameModal({isOpen: false, id: null, name: ''})} aria-label="Cerrar modal renombrar evento" />
            <form
              className={`${uiModal.panel} max-w-sm p-6 animate-in zoom-in-95 duration-200`}
              onSubmit={(e) => {
                e.preventDefault();
                handleRenameEvent();
              }}
            >
              <h3 className="text-lg font-bold text-slate-800 mb-1">Renombrar Evento</h3>
              <p className="text-sm text-slate-500 mb-6">Ingresa el nuevo nombre para este evento.</p>
              <div className="space-y-4">
                <input type="text" autoFocus className={inputClasses} placeholder="Nombre del Evento" value={renameModal.name} onChange={e => setRenameModal({...renameModal, name: e.target.value})} />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setRenameModal({isOpen: false, id: null, name: ''})} className={btnSecondary}>Cancelar</button>
                  <button type="submit" disabled={!renameModal.name.trim()} className={btnPrimary}>Guardar</button>
                </div>
              </div>
            </form>
          </div>
        )}

        {restoreModal.isOpen && (
          <div className={`${uiModal.overlay} z-50`}>
            <button type="button" className={uiModal.backdrop} onClick={() => setRestoreModal({ isOpen: false, log: null, type: 'single' })} aria-label="Cerrar modal confirmar acción" />
            <form
              className={`${uiModal.panel} max-w-sm p-8 animate-in zoom-in-95 duration-200 text-center`}
              onSubmit={(e) => {
                e.preventDefault();
                confirmRestore();
              }}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${restoreModal.type === 'single' || restoreModal.type === 'backup' ? 'bg-indigo-50 text-indigo-500' : 'bg-red-50 text-red-500'}`}>
                {restoreModal.type === 'single' ? <Undo size={32} /> : restoreModal.type === 'rollback' ? <History size={32} /> : restoreModal.type === 'backup' ? <Database size={32} /> : <Trash2 size={32} />}
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">
                {restoreModal.type === 'single'
                  ? 'Restaurar Cambio'
                  : restoreModal.type === 'rollback'
                    ? 'Revertir Cambios'
                    : restoreModal.type === 'backup'
                      ? 'Restaurar Copia de Seguridad'
                      : restoreModal.type === 'cleanByCount'
                        ? 'Borrar por cantidad (antiguos)'
                        : 'Limpiar Registros'}
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                {restoreModal.type === 'single'
                  ? `¿Deseas deshacer la acción específica: "${restoreModal.log?.action}"?`
                  : restoreModal.type === 'rollback'
                    ? `¿Estás seguro de deshacer TODOS los cambios desde el evento "${restoreModal.log?.action}" hasta ahora? Esta acción revertirá múltiples operaciones.`
                    : restoreModal.type === 'backup'
                      ? `ATENCIÓN: Estás a punto de restaurar la base de datos a la versión del: ${restoreModal.log?.revertInfo?.backupId}. Esto sobrescribirá todos los participantes y eventos actuales. ¿Deseas continuar?`
                      : restoreModal.type === 'cleanOld'
                        ? `¿Estás seguro de eliminar todos los registros de actividad con más de 30 días de antigüedad? Esta acción no se puede deshacer.`
                        : restoreModal.type === 'cleanRecent'
                          ? `ATENCIÓN SUPERUSUARIO: ¿Estás seguro de eliminar todos los registros RECIENTES (menos de 30 días)? Esta acción es irreversible.`
                          : restoreModal.type === 'cleanByCount'
                            ? `¿Eliminar los ${restoreModal.deleteCount ?? 50} registros de actividad más antiguos (por fecha en el sistema), sin contar referencias de copia automática? Esta acción es irreversible.`
                            : ''}
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setRestoreModal({ isOpen: false, log: null, type: 'single' })} className={`flex-1 py-3 px-4 text-sm ${uiButtons.secondary}`}>Cancelar</button>
                <button type="submit" className={`flex-1 py-3 px-4 text-white font-bold rounded-xl transition-colors text-sm shadow-lg ${restoreModal.type === 'single' || restoreModal.type === 'backup' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-red-500 hover:bg-red-600 shadow-red-200'}`}>
                  {SI_LABEL}, Confirmar
                </button>
              </div>
            </form>
          </div>
        )}
        {renderRegistryConfirmModal()}
        {editorRegFieldsModalEl}
        {panelNavModalEl}
        {privacyNoticeModalEl}
    </div>
  );
}
