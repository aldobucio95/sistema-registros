import React, { useDeferredValue, useSyncExternalStore } from 'react';
import {
  readRosterLocationSearchTerm,
  subscribeRosterLocationSearchTerm,
} from '../../rosterLocationSearchBus.js';

/**
 * Re-renderiza solo la hoja de roster por sede cuando cambia la búsqueda aplicada,
 * sin volver a montar todo App.jsx.
 */
export default function LocationRosterSheetContainer({ loc, renderLocationSheet }) {
  const appliedSearch = useSyncExternalStore(
    subscribeRosterLocationSearchTerm,
    readRosterLocationSearchTerm,
    readRosterLocationSearchTerm
  );
  const deferredAppliedSearch = useDeferredValue(appliedSearch);
  return renderLocationSheet(loc, { appliedSearch: deferredAppliedSearch });
}
