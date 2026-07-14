import React, { createContext, useContext } from 'react';

/**
 * @typedef {Object} EventDataContextValue
 * @property {Record<string, unknown> | null | undefined} currentEvent
 * @property {Record<string, unknown> | null | undefined} summary
 * @property {Record<string, unknown> | null | undefined} data
 * @property {Record<string, unknown>[]} allParticipants
 * @property {string[]} visibleLocations
 * @property {boolean} isBautizos
 * @property {boolean} isCampa
 * @property {boolean} hasAdminRights
 * @property {boolean} [hasFinancialAccess]
 * @property {boolean} [canAccessExpenses]
 * @property {boolean} [canEditRegistryDates]
 * @property {Record<string, unknown> | null | undefined} [globalConfig]
 * @property {Record<string, unknown> | null | undefined} [currentUser]
 * @property {import('firebase/auth').User | null | undefined} [fbUser]
 * @property {number} [superSessionCount]
 * @property {boolean} [isSuperUser]
 * @property {boolean} [debugToast]
 * @property {Record<string, unknown>} [workspaceSidebarBadges]
 * @property {(sectionKey: string) => boolean} [isPanelNavSectionAllowed]
 * @property {Record<string, boolean>} [isLocOpen]
 * @property {string | null} [locError]
 * @property {boolean} [showMoney]
 * @property {(next: boolean) => void} [setShowMoney]
 * @property {string} [eventDateDraft]
 * @property {(next: string) => void} [setEventDateDraft]
 * @property {() => void | Promise<void>} [handleSaveEventDates]
 * @property {boolean} [isExporting]
 * @property {boolean} [syncFirestoreBusy]
 * @property {() => void | Promise<void>} [syncFirestoreFromServer]
 * @property {string} [newCustomField]
 * @property {(next: string) => void} [setNewCustomField]
 * @property {string} [newLocationName]
 * @property {(next: string) => void} [setNewLocationName]
 * @property {boolean} [isAddLocModalOpen]
 * @property {(next: boolean) => void} [setIsAddLocModalOpen]
 */

const EventDataContext = createContext(
  /** @type {EventDataContextValue | null} */ (null)
);

/** Datos del evento activo (lectura). Espejo gradual de `mergeWorkspaceShellParts`. */
export function EventDataProvider({ value, children }) {
  return <EventDataContext.Provider value={value}>{children}</EventDataContext.Provider>;
}

/** @returns {EventDataContextValue} */
export function useEventData() {
  const ctx = useContext(EventDataContext);
  if (ctx == null) {
    throw new Error('useEventData: fuera de EventDataProvider');
  }
  return ctx;
}
