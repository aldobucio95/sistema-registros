import React from 'react';
import { DollarSign, Calendar, EyeOff, MessageCircle, FileSignature, Scissors } from 'lucide-react';
import { normalizeRole, viewerCanSeeTargetPermissionMeta } from './roles.js';
import {
  getPanelNavKeysEnabledInAnyEvent,
  userCanAccessExpenseList,
  hasFinancialAccess,
  userCanSendWhatsAppQuickAction,
  userCanMarkResponsivaLocalQuickAction,
  userCanSendResponsivaDigitalQuickAction,
  canMarkPersonsOfInterest,
  canCancelRegistrations,
} from './permissions.js';
import { PANEL_KEY_LABELS } from './userAccessScope.js';

/** Mismo orden que el chip «Menú: …» antes del arreglo por evento. */
const MENU_BADGE_KEY_ORDER = [
  'dashboard',
  'bautizados',
  'serversPage',
  'becados',
  'cashCut',
  'registroGlobal',
  'transporte',
  'locations',
  'responsivas',
];

const chip = 'text-[9px] px-1.5 py-0.5 rounded-md font-black dark:font-normal border';

/** Etiquetas compactas; el detalle por evento/sede está en UserAccessScopePanel (clic en el usuario). */
export default function UserPermissionBadges({ viewer, targetUser, globalPanelNav = {}, events = [], globalConfig = null }) {
  if (!targetUser || !viewerCanSeeTargetPermissionMeta(viewer, targetUser)) return null;

  const r = normalizeRole(targetUser.role);
  if (r === 'SuperUsuario') {
    return (
      <span className={`${chip} bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-600 dark:text-white dark:border-amber-700`} title="Acceso total del sistema">
        Acceso total
      </span>
    );
  }

  const enabledMenuKeys = getPanelNavKeysEnabledInAnyEvent(targetUser, events, globalPanelNav, globalConfig);
  const showFinanzasBadge = hasFinancialAccess(targetUser) && r !== 'SuperUsuario';
  const canHidden = !!targetUser.canViewHiddenDonations;
  const showWaQuick = userCanSendWhatsAppQuickAction(targetUser);
  const showRespLocal = userCanMarkResponsivaLocalQuickAction(targetUser);
  const showRespDigital = userCanSendResponsivaDigitalQuickAction(targetUser);
  const canExp = userCanAccessExpenseList(targetUser, false);
  const showExpenseList = canExp;
  const canDates = !!targetUser.canEditRegistryDates;
  const canMarkInterest = canMarkPersonsOfInterest(targetUser);
  const canCancel = canCancelRegistrations(targetUser) && r === 'Editor';
  const hideConcepts = targetUser.hideMyExpenseConcepts !== false;

  const sections = [];
  for (const k of MENU_BADGE_KEY_ORDER) {
    if (enabledMenuKeys.has(k)) sections.push(PANEL_KEY_LABELS[k] || k);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {showFinanzasBadge && (
        <span
          className={`chip-finanzas-perm ${chip} bg-green-100 text-green-800 border-green-200 flex items-center gap-1 dark:bg-emerald-600 dark:text-white dark:border-emerald-700`}
          title="Puede ver información financiera"
        >
          <DollarSign size={10} /> Finanzas
        </span>
      )}
      {showWaQuick && (
        <span className={`${chip} bg-sky-50 text-sky-900 border-sky-200 flex items-center gap-1 dark:bg-sky-600 dark:text-white dark:border-sky-700`} title="Puede usar envío por WhatsApp desde acciones rápidas del registro">
          <MessageCircle size={10} /> WhatsApp
        </span>
      )}
      {showRespLocal && (
        <span className={`${chip} bg-teal-50 text-teal-900 border-teal-200 flex items-center gap-1 dark:bg-teal-600 dark:text-white dark:border-teal-700`} title="Puede marcar entrega de responsiva física en sitio (acciones rápidas)">
          <FileSignature size={10} /> Resp. local
        </span>
      )}
      {showRespDigital && (
        <span className={`${chip} bg-cyan-50 text-cyan-900 border-cyan-200 flex items-center gap-1 dark:bg-cyan-600 dark:text-white dark:border-cyan-700`} title="Puede enviar enlace de responsiva digital (acciones rápidas)">
          <FileSignature size={10} /> Resp. digital
        </span>
      )}
      {canHidden && (
        <span className={`${chip} bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-600 dark:text-white dark:border-indigo-700`} title="Donaciones ocultas">
          Donac. ocultas
        </span>
      )}
      {showExpenseList && (
        <span className={`${chip} bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-600 dark:text-white dark:border-emerald-700`} title="Acceso a lista de gastos del evento">
          Lista gastos
        </span>
      )}
      {canDates && (
        <span className={`${chip} bg-violet-50 text-violet-800 border-violet-200 flex items-center gap-1 dark:bg-violet-600 dark:text-white dark:border-violet-700`} title="Delegación: editar fechas de registro y de abonos (Administrador)">
          <Calendar size={11} /> Fechas / abonos
        </span>
      )}
      {canMarkInterest && (
        <span className={`${chip} bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-600 dark:text-white dark:border-rose-700`} title="Puede marcar personas de interés (bloquea precarga y registro)">
          Personas de interés
        </span>
      )}
      {canCancel && (
        <span
          className={`${chip} bg-amber-50 text-amber-900 border-amber-200 flex items-center gap-1 dark:bg-amber-600 dark:text-white dark:border-amber-700`}
          title="Puede dar de baja registros en el roster (no archivar)"
        >
          <Scissors size={10} /> Dar de baja
        </span>
      )}
      {sections.length > 0 && (
        <span className={`${chip} bg-slate-100 text-slate-700 border-slate-200`} title="Secciones del menú lateral habilitadas (resumen)">
          Menú: {sections.join(', ')}
        </span>
      )}
      {hideConcepts && (
        <span className={`${chip} bg-amber-50 text-amber-800 border-amber-200 flex items-center gap-1 dark:bg-amber-600 dark:text-white dark:border-amber-700`} title="Oculta concepto de sus gastos a otros">
          <EyeOff size={12} /> Gastos ocultos
        </span>
      )}
    </div>
  );
}
