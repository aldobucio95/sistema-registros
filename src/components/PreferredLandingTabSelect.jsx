import React, { useMemo } from 'react';
import { buildPreferredLandingTabOptionGroups } from '../preferredLandingTab.js';

/**
 * Selector de ventana inicial: secciones del menú lateral + sedes accesibles.
 */
export default function PreferredLandingTabSelect({
  value,
  onChange,
  className,
  user,
  events = [],
  globalPanelNav = {},
  allKnownLocationNames = [],
  editorConfig = null,
  sessionIsSuperUser = false,
  hasAdminRights = false,
  dashboardOptionLabel = 'Dashboard',
}) {
  const { sectionOptions, locationOptions } = useMemo(
    () =>
      buildPreferredLandingTabOptionGroups({
        user,
        events,
        globalPanelNav,
        allKnownLocationNames,
        editorConfig,
        sessionIsSuperUser,
        hasAdminRights,
      }),
    [user, events, globalPanelNav, allKnownLocationNames, editorConfig, sessionIsSuperUser, hasAdminRights]
  );

  const currentValue = value || 'Summary';
  const hasCurrent =
    currentValue === 'Summary' ||
    sectionOptions.some((o) => o.value === currentValue) ||
    locationOptions.some((o) => o.value === currentValue);

  return (
    <select className={className} value={hasCurrent ? currentValue : 'Summary'} onChange={(e) => onChange(e.target.value)}>
      <option value="Summary">{dashboardOptionLabel}</option>
      {sectionOptions.length > 0 ? (
        <optgroup label="Secciones del menú">
          {sectionOptions.map((opt) => (
            <option key={`landing-section-${opt.value}`} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </optgroup>
      ) : null}
      {locationOptions.length > 0 ? (
        <optgroup label="Sedes">
          {locationOptions.map((opt) => (
            <option key={`landing-loc-${opt.value}`} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </optgroup>
      ) : null}
    </select>
  );
}
