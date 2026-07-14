import React, { createContext, useContext } from 'react';

/**
 * @typedef {Object} ParticipantMutationsContextValue
 * @property {(e: React.FormEvent) => void | Promise<void>} handleUpdateEntry
 * @property {(loc: string, entrySource?: Record<string, unknown>) => void | Promise<void>} handleAddEntry
 * @property {(loc: string, calledInternally?: boolean, waitlistOptions?: Record<string, unknown> | null, entrySource?: Record<string, unknown>) => void | Promise<void>} handleAddToWaitlist
 * @property {() => void} resetEditRegistryModal
 * @property {(loc: string, amount: number, opts?: Record<string, unknown>) => void | Promise<void>} [submitAbono]
 * @property {() => void | Promise<void>} [submitRegistrationCommentModal]
 * @property {() => void | Promise<void>} [saveAbonoNoteFromModal]
 * @property {(participant: Record<string, unknown>) => void} [openRegistrationCommentModal]
 * @property {(participant: Record<string, unknown>) => void} [openAbonoNoteEditModal]
 * @property {(name: string) => void | Promise<void>} [handleAddLocation]
 * @property {(name: string) => void | Promise<void>} [handleDeleteLocation]
 * @property {() => void | Promise<void>} [handleAddCustomField]
 * @property {(fieldKey: string) => void | Promise<void>} [handleRemoveCustomField]
 */

const ParticipantMutationsContext = createContext(
  /** @type {ParticipantMutationsContextValue | null} */ (null)
);

/** Acciones de mutación sobre participantes y registro. Espejo gradual del shell del workspace. */
export function ParticipantMutationsProvider({ value, children }) {
  return (
    <ParticipantMutationsContext.Provider value={value}>{children}</ParticipantMutationsContext.Provider>
  );
}

/** @returns {ParticipantMutationsContextValue} */
export function useParticipantMutations() {
  const ctx = useContext(ParticipantMutationsContext);
  if (ctx == null) {
    throw new Error('useParticipantMutations: fuera de ParticipantMutationsProvider');
  }
  return ctx;
}
