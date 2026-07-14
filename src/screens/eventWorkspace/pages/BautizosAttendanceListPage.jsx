import React, { useMemo } from 'react';
import { Users } from 'lucide-react';
import { BAUTIZOS_ATTENDANCE, getBautizosAttendanceTypeLabel } from '../../../bautizos/bautizosAttendance.js';
import { flattenBautizosParticipantsForRead } from '../../../bautizos/bautizosLegacyReadAdapter.js';
import { buildLocationScopeSet, participantInLocationScope } from '../../../rbac/permissions.js';
import {
  uiEmptyState,
  uiListMobile,
  uiPageHeader,
  uiPageHeaderIcon,
  uiRosterMobile,
  uiShell,
  uiTable,
} from '../../../ui/uiFormatClasses.js';
import ListMobileCard from '../../../components/ListMobileCard.jsx';
import ParticipantAssistanceBadges from '../../../components/roster/ParticipantAssistanceBadges.jsx';
import BautizosAttendanceTypeChip from '../../../components/roster/BautizosAttendanceTypeChip.jsx';

function rowMatchesAttendanceTypes(row, attendanceTypes) {
  const types = new Set((attendanceTypes || []).map((t) => String(t).trim()).filter(Boolean));
  if (types.size === 0) return true;
  const att = String(row?.bautizosAttendanceType || '').trim();
  if (types.has(att)) return true;
  if (types.has(BAUTIZOS_ATTENDANCE.bautizado) && row?.__legacyCompanionBaptized) return true;
  if (types.has(BAUTIZOS_ATTENDANCE.acompanante) && row?.__legacyCompanionRow) return true;
  return false;
}

/**
 * Lista plana por tipo(s) de asistencia Bautizos (modelo 1 doc = 1 persona + lectura legada).
 */
export default function BautizosAttendanceListPage({
  title = 'Participantes',
  icon: Icon = Users,
  attendanceTypes = [],
  currentEvent,
  allParticipants,
  visibleLocations = [],
  participantIsActiveInEvent,
  participantIsActiveInRoster,
  applyGlobalRegistryLikeFilters,
  globalLocationFilters,
  renderGlobalRegistryListToolbar,
  emptyHint = 'No hay registros en este segmento.',
}) {
  const eventId = currentEvent?.id;
  const locationScopeSet = useMemo(() => buildLocationScopeSet(visibleLocations), [visibleLocations]);

  const baseRowsForToolbar = useMemo(() => {
    if (!eventId) return [];
    const roster = (allParticipants || []).filter(
      (p) =>
        String(p.eventId) === String(eventId) &&
        participantIsActiveInEvent(p) &&
        participantIsActiveInRoster(p) &&
        participantInLocationScope(p, locationScopeSet)
    );
    const flat = flattenBautizosParticipantsForRead(roster);
    return flat.filter((p) => rowMatchesAttendanceTypes(p, attendanceTypes));
  }, [
    allParticipants,
    attendanceTypes,
    eventId,
    locationScopeSet,
    participantIsActiveInEvent,
    participantIsActiveInRoster,
  ]);

  const rows = useMemo(() => {
    let flat = applyGlobalRegistryLikeFilters(baseRowsForToolbar);
    if (globalLocationFilters.length > 0) {
      flat = flat.filter((p) => globalLocationFilters.includes(p.location));
    }
    return flat;
  }, [applyGlobalRegistryLikeFilters, baseRowsForToolbar, globalLocationFilters]);

  const filtersNote = `Búsqueda y filtros globales (misma barra que Registro global). Solo ${String(title || 'participantes').toLowerCase()} en este listado.`;

  return (
    <div className={uiShell.page}>
      <header className={uiPageHeader.root}>
        <div className={uiPageHeader.titleRow}>
          <span className={uiPageHeaderIcon.wrap}>
            <Icon className={uiPageHeaderIcon.icon} aria-hidden />
          </span>
          <div>
            <h1 className={uiPageHeader.title}>{title}</h1>
            <p className={uiPageHeader.subtitle}>{rows.length} registro{rows.length === 1 ? '' : 's'}</p>
          </div>
        </div>
      </header>

      {typeof renderGlobalRegistryListToolbar === 'function'
        ? renderGlobalRegistryListToolbar(baseRowsForToolbar, filtersNote)
        : null}

      {rows.length === 0 ? (
        <div className={uiEmptyState.wrap}>
          <p className={uiEmptyState.text}>{emptyHint}</p>
        </div>
      ) : (
        <>
          <div className={`${uiTable.wrap} hidden md:block`}>
            <table className={uiTable.table}>
              <thead>
                <tr>
                  <th className={uiTable.th}>Nombre</th>
                  <th className={uiTable.th}>Sede</th>
                  <th className={uiTable.th}>Tipo</th>
                  <th className={uiTable.th}>Asistencia</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className={uiTable.tr}>
                    <td className={uiTable.td}>
                      <div className="font-medium">{p.name || '—'}</div>
                      {p.__sourceRegistrantName ? (
                        <div className="text-xs text-slate-500">Registro: {p.__sourceRegistrantName}</div>
                      ) : null}
                    </td>
                    <td className={uiTable.td}>{p.location || '—'}</td>
                    <td className={uiTable.td}>
                      <BautizosAttendanceTypeChip personLike={p} />
                    </td>
                    <td className={uiTable.td}>
                      <ParticipantAssistanceBadges person={p} eventType="Bautizos" compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className={`${uiRosterMobile.list} ${uiListMobile.list} md:hidden`}>
            {rows.map((p) => (
              <li key={p.id}>
                <ListMobileCard
                  title={p.name || '—'}
                  subtitle={[p.location, getBautizosAttendanceTypeLabel(p)].filter(Boolean).join(' · ')}
                  badges={<ParticipantAssistanceBadges person={p} eventType="Bautizos" compact />}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
