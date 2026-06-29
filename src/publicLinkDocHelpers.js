import { mergeEditorRegistrationFieldVisibility } from './registrationFormEditorConfig.js';
import { normalizeOptionalVisibility, applyEditorVisibilityToPublicOptional } from './publicRegistrationLogic.js';

/** Igual que el `useMemo` de visibilidad opcional en `PublicRegistrationPage`. */
export function buildOptionalVisibilityFromPublicLinkDoc(linkDoc) {
  if (!linkDoc || typeof linkDoc !== 'object') return normalizeOptionalVisibility(null);
  const fromLink = normalizeOptionalVisibility(linkDoc.optionalVisibility);
  const ev = linkDoc.eventSnapshot;
  const g = linkDoc.globalSnapshot || {};
  const evType = ev?.eventType;
  const byType = g.editorRegistrationFieldsByType;
  const typeRaw = evType && byType && typeof byType === 'object' ? byType[evType] : null;
  const typeVis = mergeEditorRegistrationFieldVisibility(typeRaw);
  const eventObj =
    ev?.editorRegistrationFields && typeof ev.editorRegistrationFields === 'object' ? ev.editorRegistrationFields : {};
  const editorVis = { ...typeVis, ...eventObj };
  return applyEditorVisibilityToPublicOptional(fromLink, editorVis);
}
