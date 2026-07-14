import React, { createContext, useContext } from 'react';

/**
 * @typedef {Object} WorkspaceToastState
 * @property {string} [message]
 * @property {'success' | 'error' | 'info' | string} [type]
 * @property {number} [durationMs]
 */

/**
 * @typedef {Object} WorkspaceUIContextValue
 * @property {WorkspaceToastState | null} toast
 * @property {(message: string, type?: string, durationMs?: number) => void} showToast
 * @property {Record<string, unknown> | null} [editRegistryModal]
 * @property {Record<string, unknown> | null} [paymentModal]
 * @property {Record<string, unknown> | null} [registrationCommentModal]
 * @property {Record<string, unknown> | null} [abonoNoteEditModal]
 * @property {Record<string, unknown> | null} [donationModal]
 * @property {Record<string, unknown> | null} [expenseEditModal]
 * @property {Record<string, unknown> | null} [expensePartialModal]
 * @property {Record<string, unknown> | null} [paymentMethodEditModal]
 * @property {Record<string, unknown> | null} [pricingModal]
 * @property {Record<string, unknown> | null} [customFieldsModal]
 * @property {Record<string, unknown> | null} [allergyOptionsModal]
 * @property {Record<string, unknown> | null} [serveAreaOptionsModal]
 * @property {Record<string, unknown> | null} [cashCutScheduleModal]
 * @property {Record<string, unknown> | null} [superDateEditModal]
 * @property {Record<string, unknown> | null} [whatsAppModal]
 * @property {boolean} [publicQrModalOpen]
 * @property {boolean} [donationsListOpen]
 * @property {React.ReactNode} [editorRegFieldsModalEl]
 * @property {React.ReactNode} [panelNavModalEl]
 * @property {React.ReactNode} [privacyNoticeModalEl]
 * @property {React.ReactNode} [excelExportModalEl]
 * @property {(next: Record<string, unknown> | null) => void} [setPaymentModal]
 * @property {(next: Record<string, unknown> | null) => void} [setRegistrationCommentModal]
 * @property {(next: Record<string, unknown> | null) => void} [setAbonoNoteEditModal]
 * @property {(next: Record<string, unknown> | null) => void} [setDonationModal]
 * @property {(next: Record<string, unknown> | null) => void} [setExpenseEditModal]
 * @property {(next: Record<string, unknown> | null) => void} [setExpensePartialModal]
 * @property {(next: Record<string, unknown> | null) => void} [setPaymentMethodEditModal]
 * @property {(next: Record<string, unknown> | null) => void} [setPricingModal]
 * @property {(next: Record<string, unknown> | null) => void} [setCustomFieldsModal]
 * @property {(next: Record<string, unknown> | null) => void} [setAllergyOptionsModal]
 * @property {(next: Record<string, unknown> | null) => void} [setServeAreaOptionsModal]
 * @property {(next: Record<string, unknown> | null) => void} [setCashCutScheduleModal]
 * @property {(next: Record<string, unknown> | null) => void} [setSuperDateEditModal]
 * @property {(next: Record<string, unknown> | null) => void} [setWhatsAppModal]
 * @property {(next: boolean) => void} [setPublicQrModalOpen]
 * @property {(next: boolean) => void} [setDonationsListOpen]
 * @property {boolean} [isMobileMenuOpen]
 * @property {(next: boolean) => void} [setIsMobileMenuOpen]
 * @property {boolean} [darkMode]
 * @property {() => void} [toggleDarkMode]
 * @property {boolean} [needsFirestoreResyncAfterBulk]
 * @property {boolean} [bulkResyncBusy]
 * @property {() => void | Promise<void>} [onReloadAfterBulkRestore]
 */

const WorkspaceUIContext = createContext(
  /** @type {WorkspaceUIContextValue | null} */ (null)
);

/** Estado de modales, toast y chrome de UI del workspace. Espejo gradual del shell. */
export function WorkspaceUIProvider({ value, children }) {
  return <WorkspaceUIContext.Provider value={value}>{children}</WorkspaceUIContext.Provider>;
}

/** @returns {WorkspaceUIContextValue} */
export function useWorkspaceUI() {
  const ctx = useContext(WorkspaceUIContext);
  if (ctx == null) {
    throw new Error('useWorkspaceUI: fuera de WorkspaceUIProvider');
  }
  return ctx;
}
