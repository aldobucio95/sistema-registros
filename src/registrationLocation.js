const normalizeLocationValue = (value) => String(value ?? '').trim();

export const getValidEventLocations = (eventLocations) =>
  Array.isArray(eventLocations)
    ? eventLocations.map(normalizeLocationValue).filter(Boolean)
    : [];

export const resolveRegistrationLocation = (entryLocation, fallbackLocation, eventLocations) => {
  const validLocations = getValidEventLocations(eventLocations);
  const fallback = normalizeLocationValue(fallbackLocation);
  const requested = normalizeLocationValue(entryLocation);
  const candidate = requested || fallback;

  if (!candidate) return validLocations[0] || '';
  if (!validLocations.length || validLocations.includes(candidate)) return candidate;
  if (fallback && validLocations.includes(fallback)) return fallback;
  return validLocations[0] || '';
};

const remapLinkedTravelLocation = (value, previousLocation, nextLocation) => {
  const normalized = normalizeLocationValue(value);
  if (!normalized || normalized === previousLocation) return nextLocation;
  return value;
};

export const remapDraftRegistrationLocation = (draft, nextLocation, fallbackLocation = '') => {
  if (!draft || typeof draft !== 'object') return draft;
  const previousLocation = resolveRegistrationLocation(draft.location, fallbackLocation, []);
  const resolvedNextLocation = resolveRegistrationLocation(nextLocation, fallbackLocation, []);
  if (!resolvedNextLocation || resolvedNextLocation === previousLocation) {
    return { ...draft, location: resolvedNextLocation || previousLocation };
  }

  const companions = Array.isArray(draft.bautizosCompanions)
    ? draft.bautizosCompanions.map((row) => {
        if (!row || typeof row !== 'object') return row;
        return {
          ...row,
          travelFrom: remapLinkedTravelLocation(row.travelFrom, previousLocation, resolvedNextLocation),
          travelTo: remapLinkedTravelLocation(row.travelTo, previousLocation, resolvedNextLocation),
        };
      })
    : draft.bautizosCompanions;

  return {
    ...draft,
    location: resolvedNextLocation,
    travelFrom: remapLinkedTravelLocation(draft.travelFrom, previousLocation, resolvedNextLocation),
    travelTo: remapLinkedTravelLocation(draft.travelTo, previousLocation, resolvedNextLocation),
    bautizosCompanions: companions,
  };
};
