import React, { createContext, useContext } from 'react';

/**
 * @typedef {Object} EventHubContextValue
 * @property {boolean} [debugToast]
 * @property {string[]} [navHistory]
 * @property {string[]} [forwardNavStack]
 * @property {() => void} [goBack]
 * @property {() => void} [goForward]
 * @property {string} [systemView]
 * @property {Record<string, unknown> | null | undefined} [currentUser]
 * @property {import('firebase/auth').User | null} [fbUser]
 * @property {number} [superSessionCount]
 * @property {boolean} [isSuperUser]
 * @property {Record<string, unknown> | null | undefined} [globalConfig]
 * @property {() => void} [toggleDebugMode]
 * @property {(path: string, opts?: Record<string, unknown>) => void} [goTo]
 * @property {boolean} [hasAdminRights]
 * @property {() => void | Promise<void>} [handleLogout]
 * @property {Record<string, unknown>[]} [archivedParticipantsForView]
 * @property {Record<string, unknown>[]} [archivedParticipantsArchiveViewList]
 * @property {string} [archiveViewSearch]
 * @property {(next: string) => void} [setArchiveViewSearch]
 * @property {string} [archiveViewSort]
 * @property {(next: string) => void} [setArchiveViewSort]
 * @property {Record<string, unknown>[]} [events]
 * @property {(person: Record<string, unknown>) => void} [openPermanentDeleteArchivedParticipantConfirm]
 * @property {Record<string, unknown>[]} [visibleEvents]
 * @property {Record<string, number>} [activeRosterUnitsByEventId]
 * @property {(snapshot: Record<string, unknown>) => Record<string, unknown>} [getPricingFromSnapshot]
 * @property {string | null} [draggedEventId]
 * @property {(next: string | null) => void} [setDraggedEventId]
 * @property {(e: React.DragEvent) => void} [handleDragOver]
 * @property {(e: React.DragEvent, targetEventId: string) => void} [handleDrop]
 * @property {(eventDoc: Record<string, unknown>) => string} [resolvePreferredLandingTab]
 * @property {(iso: string) => string} [formatDisplayDate]
 * @property {(entry: Record<string, unknown>) => void | Promise<void>} [addLog]
 * @property {(ref: unknown, patch: Record<string, unknown>) => void | Promise<void>} [updateDoc]
 * @property {(collectionPath: string, docId: string) => unknown} [getDocRef]
 * @property {(next: Record<string, unknown> | null) => void} [setRenameModal]
 * @property {(next: Record<string, unknown> | null) => void} [setDeleteEventModal]
 * @property {Record<string, unknown> | null} [deleteEventModal]
 * @property {() => void | Promise<void>} [confirmDeleteEvent]
 * @property {Record<string, unknown> | null} [renameModal]
 * @property {() => void | Promise<void>} [handleRenameEvent]
 * @property {Record<string, unknown>} [newEventData]
 * @property {(next: Record<string, unknown>) => void} [setNewEventData]
 * @property {boolean} [isAddEventModalOpen]
 * @property {(next: boolean) => void} [setIsAddEventModalOpen]
 * @property {() => void | Promise<void>} [handleCreateEvent]
 * @property {() => void | Promise<void>} [handleBackfillEventActiveRosterTotals]
 * @property {boolean} [backfillActiveRosterBusy]
 * @property {string} [btnPrimary]
 * @property {string} [btnSecondary]
 * @property {string} [inputClasses]
 * @property {string} [labelClasses]
 * @property {Record<string, unknown> | null} [restoreModal]
 * @property {(next: Record<string, unknown> | null) => void} [setRestoreModal]
 * @property {() => void | Promise<void>} [confirmRestore]
 * @property {React.ReactNode} [registryConfirmModalEl]
 * @property {React.ReactNode} [promoteOverCapConfirmModalEl]
 * @property {React.ReactNode} [editorRegFieldsModalEl]
 * @property {React.ReactNode} [panelNavModalEl]
 * @property {React.ReactNode} [privacyNoticeModalEl]
 * @property {Record<string, unknown> | null} [editingUser]
 * @property {(next: Record<string, unknown> | null) => void} [setEditingUser]
 * @property {() => void | Promise<void>} [handleUpdateUser]
 * @property {Record<string, unknown>[]} [users]
 * @property {Record<string, unknown>[]} [sortedEvents]
 * @property {string[]} [allKnownLocationNames]
 * @property {unknown[]} [PANEL_NAV_CONFIG_ITEMS]
 * @property {unknown[]} [PANEL_NAV_SIDEBAR_ITEMS]
 * @property {Record<string, unknown>} [DEFAULT_PANEL_NAV]
 * @property {Record<string, unknown>} [EDITOR_LECTOR_PANEL_DEFAULT]
 * @property {boolean} [editingUserPlainPwdVisible]
 * @property {(next: boolean) => void} [setEditingUserPlainPwdVisible]
 * @property {(message: string, type?: string, durationMs?: number) => void} [showToast]
 * @property {Record<string, unknown> | null} [toast]
 * @property {boolean} [darkMode]
 * @property {() => void} [toggleDarkMode]
 * @property {boolean} [needsFirestoreResyncAfterBulk]
 * @property {boolean} [bulkResyncBusy]
 * @property {() => void | Promise<void>} [onReloadAfterBulkRestore]
 */

const EventHubContext = createContext(
  /** @type {EventHubContextValue | null} */ (null)
);

/** Proveedor del hub de eventos (sin evento seleccionado). Sustituye `setAppShellBindings` para EventHubScreen. */
export function EventHubProvider({ value, children }) {
  return <EventHubContext.Provider value={value}>{children}</EventHubContext.Provider>;
}

/** @returns {EventHubContextValue} */
export function useEventHub() {
  const ctx = useContext(EventHubContext);
  if (ctx == null) {
    throw new Error('useEventHub: fuera de EventHubProvider');
  }
  return ctx;
}
