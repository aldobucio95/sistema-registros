import React, { useMemo, useState } from 'react';
import {
  CalendarRange,
  ChevronDown,
  Church,
  DollarSign,
  Link2,
  Link2Off,
  MapPin,
  Save,
  UserRound,
  Users,
} from 'lucide-react';
import {
  eventSupportsPastorStayDates,
  getPastorRealCostAmount,
  isPastorParticipant,
  normalizePastorStayDate,
} from '../pastorAttendance.js';
import { compareIsoDates, getEventEffectiveEndDate, getEventEffectiveStartDate } from '../eventDateHelpers.js';
import { getBautizosCompanionsArray } from '../bautizosParty.js';
import { resolveBautizosCarDataAnchor } from '../bautizosCarMeta.js';
import BautizosCarDataSummaryCard from '../components/transport/BautizosCarDataSummaryCard.jsx';
import CopyButton from '../components/CopyButton.jsx';
import { formatBirthDateExcelLabel } from '../birthDateIsoUtils.js';
import { createEmptyPastoresUiPrefs } from '../userListFiltersPrefs.js';
import {
  uiBadgeMini,
  uiBadgeSoft,
  uiControls,
  uiEmptyState,
  uiForm,
  uiKbd,
  uiListMobile,
  uiPageHeader,
  uiPageHeaderIcon,
  uiRosterMobile,
  uiSectionPanel,
  uiShell,
  uiStat,
  uiStatTile,
  uiTonalButton,
  uiTonalSolid,
  uiTypography,
} from '../ui/uiFormatClasses.js';

const inputDateCompact = `${uiForm.inputCompact} w-[8.75rem] max-w-full py-1`;
const inputMoneyCompact = `${uiForm.inputCompact} w-24 py-1`;

function companionDraftKey(hostId, companionId) {
  return `${hostId}::${companionId}`;
}

function buildDraftFromPerson(person, prevDraft) {
  if (prevDraft) return { ...prevDraft };
  return {
    pastorRealCost: getPastorRealCostAmount(person) ? String(getPastorRealCostAmount(person)) : '',
    pastorStayStart: normalizePastorStayDate(person?.pastorStayStart),
    pastorStayEnd: normalizePastorStayDate(person?.pastorStayEnd),
  };
}

function buildCompanionDraftFromRow(companion, prevDraft) {
  if (prevDraft) return { ...prevDraft };
  return {
    pastorStayStart: normalizePastorStayDate(companion?.pastorStayStart),
    pastorStayEnd: normalizePastorStayDate(companion?.pastorStayEnd),
  };
}

function listPastorCompanions(person) {
  return getBautizosCompanionsArray(person).filter((c) => String(c?.name || '').trim());
}

function displayLocation(person) {
  return String(person?.location || '').trim() || 'Sin sede';
}

function DetailRow({ label, value, copyLabel = null }) {
  const text = value == null ? '' : String(value).trim();
  if (!text || text === '—') return null;
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5 min-w-0 leading-snug">
      <span className={`${uiForm.labelXs} shrink-0`}>{label}:</span>
      <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 min-w-0 break-words">
        {text}
        {copyLabel ? <CopyButton text={text} label={copyLabel} /> : null}
      </span>
    </div>
  );
}

function transportDetailRows(companion) {
  const rows = [];
  const rel = String(companion?.relationship || companion?.linkedCompanionRelationship || '').trim();
  if (rel) rows.push({ key: 'rel', label: 'Parentesco', value: rel });
  if (companion?.llegaEnCarro) rows.push({ key: 'go-car', label: 'Transporte ida', value: 'Llega en carro' });
  else if (companion?.wantsBautizosTransport === 'Si' || companion?.wantsBautizosTransport === 'Sí') {
    rows.push({ key: 'go-bus', label: 'Transporte ida', value: 'Transporte del evento' });
  }
  if (companion?.regresaEnCarro) rows.push({ key: 'ret-car', label: 'Transporte regreso', value: 'Regresa en carro' });
  const from = String(companion?.travelFrom || '').trim();
  const to = String(companion?.travelTo || '').trim();
  if (from) rows.push({ key: 'from', label: 'Sede salida', value: from, copyLabel: 'sede de salida' });
  if (to) rows.push({ key: 'to', label: 'Sede regreso', value: to, copyLabel: 'sede de regreso' });
  const cars = companion?.carrosLlegada;
  if (cars != null && String(cars).trim() !== '') {
    rows.push({ key: 'cars', label: 'Carros', value: String(cars) });
  }
  return rows;
}

function PersonDetailsPanel({ person, isCompanion = false }) {
  const birth = formatBirthDateExcelLabel(person?.birthDate);
  return (
    <div className={`${uiSectionPanel('slate')} !p-2 !space-y-0.5 !shadow-none`}>
      {!isCompanion ? (
        <DetailRow label="Sede" value={displayLocation(person)} copyLabel="sede" />
      ) : null}
      <DetailRow label="Teléfono" value={person?.phone} copyLabel="teléfono" />
      <DetailRow label="ID VNPM" value={person?.vnpPersonId} copyLabel="ID VNPM" />
      <DetailRow label="Edad" value={person?.age != null && String(person.age).trim() !== '' ? String(person.age) : ''} />
      <DetailRow label="Género" value={person?.gender} />
      <DetailRow label="Nacimiento" value={birth && birth !== '—' ? birth : ''} copyLabel="fecha de nacimiento" />
    </div>
  );
}

function CollapsibleSection({
  title,
  icon: Icon = null,
  open,
  onToggle,
  children,
  tone = 'slate',
}) {
  const isViolet = tone === 'violet';
  const wrapClass = isViolet
    ? `${uiControls.collapsibleWrap} border-violet-200/90 dark:border-violet-500/45 bg-violet-50/25 dark:bg-violet-950/10`
    : uiControls.collapsibleWrap;
  const summaryClass = isViolet
    ? `${uiControls.collapsibleSummary} text-violet-800 dark:text-violet-200 hover:bg-violet-100/70 dark:hover:bg-violet-950/35`
    : uiControls.collapsibleSummary;
  const bodyClass = isViolet
    ? `${uiControls.collapsibleBody} border-violet-100/80 dark:border-violet-500/25 bg-violet-50/15 dark:bg-slate-900/80`
    : uiControls.collapsibleBody;

  return (
    <div className={wrapClass}>
      <button
        type="button"
        onClick={onToggle}
        className={summaryClass}
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <ChevronDown
            size={14}
            className={`shrink-0 text-slate-400 dark:text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
          {Icon ? <Icon size={13} className="shrink-0 opacity-80" /> : null}
          <span className="truncate">{title}</span>
        </span>
      </button>
      {open ? <div className={`${bodyClass} !space-y-1.5`}>{children}</div> : null}
    </div>
  );
}

/**
 * Administración de pastores del evento: costo real individual, fechas de estancia y grupo familiar.
 * Solo visible para administradores.
 */
export default function PastoresPage({
  event,
  participants,
  roster = [],
  visibleLocations,
  formatMoney,
  onSavePastorFields,
  savingPastorId = '',
  pastoresUiPrefs = createEmptyPastoresUiPrefs(),
  onPastoresUiPrefsChange = null,
}) {
  const eventType = event?.eventType;
  const isBautizos = eventType === 'Bautizos';
  const showStayDates = eventSupportsPastorStayDates(event);
  const eventStart = getEventEffectiveStartDate(event) || '';
  const eventEnd = getEventEffectiveEndDate(event) || '';

  const rows = useMemo(() => {
    const locSet =
      Array.isArray(visibleLocations) && visibleLocations.length > 0
        ? new Set(visibleLocations.map((l) => String(l).trim()))
        : null;
    return (participants || [])
      .filter((p) => isPastorParticipant(p, eventType))
      .filter((p) => {
        if (!locSet) return true;
        return locSet.has(String(p.location || '').trim());
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es'));
  }, [participants, eventType, visibleLocations]);

  const expandedPastorIds = useMemo(
    () => new Set(pastoresUiPrefs?.expandedPastorIds || []),
    [pastoresUiPrefs?.expandedPastorIds]
  );
  const expandedSectionKeys = useMemo(
    () => new Set(pastoresUiPrefs?.expandedSectionKeys || []),
    [pastoresUiPrefs?.expandedSectionKeys]
  );

  const [draftById, setDraftById] = useState({});
  const [companionDraftByKey, setCompanionDraftByKey] = useState({});
  const [unsyncedCompanionKeys, setUnsyncedCompanionKeys] = useState(() => new Set());

  const sectionKey = (pastorId, section) => `${pastorId}::${section}`;

  const isSectionOpen = (pastorId, section) => expandedSectionKeys.has(sectionKey(pastorId, section));

  const toggleSection = (pastorId, section) => {
    if (typeof onPastoresUiPrefsChange !== 'function') return;
    const key = sectionKey(pastorId, section);
    onPastoresUiPrefsChange((prev) => {
      const set = new Set(prev?.expandedSectionKeys || []);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...prev, expandedSectionKeys: [...set] };
    });
  };

  const isPastorExpanded = (pastorId) => expandedPastorIds.has(pastorId);

  const togglePastorExpanded = (pastorId) => {
    if (typeof onPastoresUiPrefsChange !== 'function') return;
    onPastoresUiPrefsChange((prev) => {
      const set = new Set(prev?.expandedPastorIds || []);
      if (set.has(pastorId)) set.delete(pastorId);
      else set.add(pastorId);
      return { ...prev, expandedPastorIds: [...set] };
    });
  };

  const isCompanionSynced = (hostId, companionId) =>
    !unsyncedCompanionKeys.has(companionDraftKey(hostId, companionId));

  const getDraft = (person) => {
    const id = String(person?.id || '').trim();
    return buildDraftFromPerson(person, draftById[id]);
  };

  const getCompanionDraft = (hostPerson, companion) => {
    const hostId = String(hostPerson?.id || '').trim();
    const cid = String(companion?.id || '').trim();
    const key = companionDraftKey(hostId, cid);
    const base = buildCompanionDraftFromRow(companion, companionDraftByKey[key]);
    if (showStayDates && isCompanionSynced(hostId, cid)) {
      const hostDraft = getDraft(hostPerson);
      return {
        ...base,
        pastorStayStart: hostDraft.pastorStayStart,
        pastorStayEnd: hostDraft.pastorStayEnd,
      };
    }
    return base;
  };

  const patchDraft = (person, patch) => {
    const id = String(person?.id || '').trim();
    if (!id) return;
    setDraftById((prev) => ({
      ...prev,
      [id]: { ...buildDraftFromPerson(person, prev[id]), ...patch },
    }));
    if (patch.pastorStayStart !== undefined || patch.pastorStayEnd !== undefined) {
      const hostDraft = { ...getDraft(person), ...patch };
      for (const c of listPastorCompanions(person)) {
        const cid = String(c.id || '').trim();
        const key = companionDraftKey(id, cid);
        if (!unsyncedCompanionKeys.has(key)) {
          patchCompanionDraft(person, c, {
            pastorStayStart: hostDraft.pastorStayStart,
            pastorStayEnd: hostDraft.pastorStayEnd,
          });
        }
      }
    }
  };

  const patchCompanionDraft = (hostPerson, companion, patch) => {
    const hostId = String(hostPerson?.id || '').trim();
    const cid = String(companion?.id || '').trim();
    if (!hostId || !cid) return;
    const key = companionDraftKey(hostId, cid);
    setCompanionDraftByKey((prev) => ({
      ...prev,
      [key]: { ...buildCompanionDraftFromRow(companion, prev[key]), ...patch },
    }));
  };

  const syncCompanionWithPastor = (hostPerson, companion) => {
    const hostDraft = getDraft(hostPerson);
    patchCompanionDraft(hostPerson, companion, {
      pastorStayStart: hostDraft.pastorStayStart,
      pastorStayEnd: hostDraft.pastorStayEnd,
    });
  };

  const toggleCompanionSync = (hostPerson, companion) => {
    const hostId = String(hostPerson?.id || '').trim();
    const cid = String(companion?.id || '').trim();
    const key = companionDraftKey(hostId, cid);
    if (unsyncedCompanionKeys.has(key)) {
      setUnsyncedCompanionKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      syncCompanionWithPastor(hostPerson, companion);
    } else {
      setUnsyncedCompanionKeys((prev) => new Set(prev).add(key));
    }
  };

  const validateStayRange = (start, end) => {
    const s = normalizePastorStayDate(start);
    const e = normalizePastorStayDate(end);
    if (s && e && compareIsoDates(s, e) > 0) {
      return 'La fecha de llegada no puede ser posterior a la de salida.';
    }
    if (s && eventStart && compareIsoDates(s, eventStart) < 0) {
      return 'La fecha de llegada no puede ser anterior al inicio del evento.';
    }
    if (e && eventEnd && compareIsoDates(e, eventEnd) > 0) {
      return 'La fecha de salida no puede ser posterior al fin del evento.';
    }
    return '';
  };

  const validateDraft = (draft) => {
    const stayErr = validateStayRange(draft.pastorStayStart, draft.pastorStayEnd);
    if (stayErr) return stayErr;
    const costRaw = String(draft.pastorRealCost ?? '').trim().replace(',', '.');
    if (costRaw !== '' && (!Number.isFinite(parseFloat(costRaw)) || parseFloat(costRaw) < 0)) {
      return 'El costo real debe ser un número mayor o igual a cero.';
    }
    return '';
  };

  const handleSave = async (person) => {
    const id = String(person?.id || '').trim();
    if (!id) return;
    const draft = getDraft(person);
    const err = validateDraft(draft);
    if (err) {
      window.alert(err);
      return;
    }
    const companions = listPastorCompanions(person);
    const companionStayDates = [];
    for (const c of companions) {
      const cd = getCompanionDraft(person, c);
      const stayErr = validateStayRange(cd.pastorStayStart, cd.pastorStayEnd);
      if (stayErr) {
        window.alert(`${String(c.name || 'Acompañante')}: ${stayErr}`);
        return;
      }
      companionStayDates.push({
        id: String(c.id || '').trim(),
        pastorStayStart: normalizePastorStayDate(cd.pastorStayStart),
        pastorStayEnd: normalizePastorStayDate(cd.pastorStayEnd),
      });
    }
    const costRaw = String(draft.pastorRealCost ?? '').trim().replace(',', '.');
    const pastorRealCost = costRaw === '' ? 0 : parseFloat(costRaw);
    await onSavePastorFields(id, {
      pastorRealCost,
      pastorStayStart: normalizePastorStayDate(draft.pastorStayStart),
      pastorStayEnd: normalizePastorStayDate(draft.pastorStayEnd),
      companionStayDates,
    });
    setDraftById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setCompanionDraftByKey((prev) => {
      const next = { ...prev };
      for (const c of companions) {
        delete next[companionDraftKey(id, String(c.id || '').trim())];
      }
      return next;
    });
  };

  const totalPastorCost = rows.reduce((s, p) => s + getPastorRealCostAmount(p), 0);

  const renderStayDateFields = (draft, onPatch, idPrefix, { disabled = false } = {}) => {
    if (!showStayDates) return null;
    const inputClass = `${inputDateCompact}${disabled ? ' opacity-60 cursor-not-allowed' : ''}`;
    return (
      <>
        <div className="flex items-center gap-1.5 min-w-0">
          <label htmlFor={`${idPrefix}-stay-start`} className={uiForm.labelXs}>
            Llega
          </label>
          <input
            id={`${idPrefix}-stay-start`}
            type="date"
            className={inputClass}
            min={eventStart || undefined}
            max={eventEnd || undefined}
            value={draft.pastorStayStart}
            disabled={disabled}
            onChange={(e) => onPatch({ pastorStayStart: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <label htmlFor={`${idPrefix}-stay-end`} className={uiForm.labelXs}>
            Se va
          </label>
          <input
            id={`${idPrefix}-stay-end`}
            type="date"
            className={inputClass}
            min={eventStart || undefined}
            max={eventEnd || undefined}
            value={draft.pastorStayEnd}
            disabled={disabled}
            onChange={(e) => onPatch({ pastorStayEnd: e.target.value })}
          />
        </div>
      </>
    );
  };

  const pastorCardShell = (mobileShell) =>
    mobileShell
      ? `${uiListMobile.itemViolet} ${uiListMobile.toneViolet} px-2.5 py-2 space-y-1.5`
      : `${uiListMobile.itemViolet} ${uiListMobile.toneViolet} px-3 py-2.5 space-y-2 shadow-sm`;

  const renderPastorCard = (person, displayIndex, { mobileShell = false } = {}) => {
    const id = String(person.id || '').trim();
    const draft = getDraft(person);
    const companions = isBautizos ? listPastorCompanions(person) : [];
    const carAnchor =
      isBautizos && roster?.length
        ? resolveBautizosCarDataAnchor(person, roster, event)
        : { eligible: false };
    const companionDirty = companions.some((c) => {
      const key = companionDraftKey(id, String(c.id || '').trim());
      if (companionDraftByKey[key] == null && isCompanionSynced(id, String(c.id || '').trim())) {
        return false;
      }
      const cd = getCompanionDraft(person, c);
      return (
        cd.pastorStayStart !== normalizePastorStayDate(c.pastorStayStart) ||
        cd.pastorStayEnd !== normalizePastorStayDate(c.pastorStayEnd)
      );
    });
    const dirty =
      draftById[id] != null ||
      companionDirty ||
      String(draft.pastorRealCost) !== String(getPastorRealCostAmount(person) || '') ||
      draft.pastorStayStart !== normalizePastorStayDate(person.pastorStayStart) ||
      draft.pastorStayEnd !== normalizePastorStayDate(person.pastorStayEnd);
    const saving = savingPastorId === id;
    const locLabel = displayLocation(person);
    const expanded = isPastorExpanded(id);
    const costLabel =
      draft.pastorRealCost !== ''
        ? formatMoney(parseFloat(String(draft.pastorRealCost).replace(',', '.')) || 0)
        : formatMoney(getPastorRealCostAmount(person));

    return (
      <div key={id} className={pastorCardShell(mobileShell)}>
        <div
          className={`flex flex-wrap items-center gap-1.5 justify-between rounded-lg px-1.5 py-1 -mx-0.5 transition-colors ${
            expanded
              ? 'bg-violet-100/50 dark:bg-violet-950/25'
              : 'hover:bg-violet-50/80 dark:hover:bg-violet-950/20'
          }`}
        >
          <button
            type="button"
            onClick={() => togglePastorExpanded(id)}
            className="min-w-0 flex-1 flex flex-wrap items-center gap-1.5 text-left"
            aria-expanded={expanded}
          >
            <ChevronDown
              size={15}
              className={`shrink-0 text-violet-500 dark:text-violet-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              aria-hidden
            />
            <span className={`${uiKbd.base} min-w-[1.5rem] h-5 justify-center shrink-0 text-[10px] bg-violet-100 dark:bg-violet-950/60 border-violet-200 dark:border-violet-600`}>
              {displayIndex}
            </span>
            <span className="font-black text-slate-800 dark:text-slate-100 text-sm break-words min-w-0">
              {person.name || '(sin nombre)'}
            </span>
            <CopyButton text={person.name} label="nombre" />
            <span className={`${uiRosterMobile.sedeBadge} !text-[10px] !py-0.5 !px-1.5`}>
              <MapPin size={11} className="shrink-0" />
              {locLabel}
            </span>
            {!expanded ? (
              <>
                <span className={uiBadgeMini('violet')}>{costLabel}</span>
                {companions.length > 0 ? (
                  <span className={`${uiBadgeMini('violet')} inline-flex items-center gap-0.5`}>
                    <Users size={10} />
                    {companions.length}
                  </span>
                ) : null}
                {dirty ? (
                  <span className={uiBadgeMini('amber', 'solid')}>Sin guardar</span>
                ) : null}
              </>
            ) : null}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave(person)}
            className={`${uiTonalSolid('violet')} inline-flex items-center gap-1 !px-2.5 !py-1.5 !text-[9px]${
              dirty ? ' ring-2 ring-violet-300 dark:ring-violet-400/70' : ''
            }`}
          >
            <Save size={12} />
            {saving ? '…' : 'Guardar'}
          </button>
        </div>

        {expanded ? (
          <div className="space-y-1.5 pt-0.5">
            <CollapsibleSection
              title="Datos del pastor"
              icon={UserRound}
              open={isSectionOpen(id, 'details')}
              onToggle={() => toggleSection(id, 'details')}
            >
              <PersonDetailsPanel person={person} />
            </CollapsibleSection>

            <CollapsibleSection
              title="Costo y fechas"
              icon={CalendarRange}
              open={isSectionOpen(id, 'cost')}
              onToggle={() => toggleSection(id, 'cost')}
            >
              <div className={`${uiSectionPanel('violet')} !p-2.5 !space-y-0 !shadow-none`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <label className={`${uiForm.labelXs} inline-flex items-center gap-1`}>
                      <DollarSign size={11} className="text-violet-600 dark:text-violet-400" />
                      Costo real
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className={inputMoneyCompact}
                      placeholder="0"
                      value={draft.pastorRealCost}
                      onChange={(e) => patchDraft(person, { pastorRealCost: e.target.value })}
                    />
                  </div>
                  {renderStayDateFields(draft, (patch) => patchDraft(person, patch), `pastor-${id}`)}
                </div>
              </div>
            </CollapsibleSection>

            {isBautizos && companions.length > 0 ? (
              <CollapsibleSection
                title={`Acompañantes (${companions.length})`}
                icon={Users}
                tone="violet"
                open={isSectionOpen(id, 'companions')}
                onToggle={() => toggleSection(id, 'companions')}
              >
                <div className="space-y-1.5">
                  {companions.map((companion) => {
                    const cid = String(companion.id || '').trim();
                    const cd = getCompanionDraft(person, companion);
                    const transportRows = transportDetailRows(companion);
                    const synced = isCompanionSynced(id, cid);
                    return (
                      <div
                        key={cid || companion.name}
                        className={`${uiSectionPanel('violet')} !p-2 !space-y-1 !shadow-none`}
                      >
                        <div className="flex flex-wrap items-baseline gap-x-1.5 min-w-0">
                          <span className="text-[11px] font-black text-violet-900 dark:text-violet-100 break-words">
                            {companion.name}
                          </span>
                          <CopyButton text={companion.name} label="nombre del acompañante" />
                        </div>
                        {transportRows.length > 0 ? (
                          <div className="space-y-0.5 pl-0.5">
                            {transportRows.map((row) => (
                              <DetailRow
                                key={row.key}
                                label={row.label}
                                value={row.value}
                                copyLabel={row.copyLabel}
                              />
                            ))}
                          </div>
                        ) : null}
                        <CollapsibleSection
                          title="Datos"
                          icon={UserRound}
                          open={isSectionOpen(id, `companion-${cid}-details`)}
                          onToggle={() => toggleSection(id, `companion-${cid}-details`)}
                          tone="violet"
                        >
                          <PersonDetailsPanel person={companion} isCompanion />
                        </CollapsibleSection>
                        {showStayDates ? (
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pt-0.5">
                            {renderStayDateFields(
                              cd,
                              (patch) => patchCompanionDraft(person, companion, patch),
                              `companion-${id}-${cid}`,
                              { disabled: synced }
                            )}
                            <button
                              type="button"
                              onClick={() => toggleCompanionSync(person, companion)}
                              title={
                                synced
                                  ? 'Fechas sincronizadas con el titular. Clic para editar por separado.'
                                  : 'Fechas independientes. Clic para volver a sincronizar.'
                              }
                              className={`${uiTonalButton(synced ? 'violet' : 'amber')} inline-flex items-center gap-1 !normal-case !tracking-normal !font-bold !text-[9px]`}
                            >
                              {synced ? (
                                <Link2 size={11} aria-hidden />
                              ) : (
                                <Link2Off size={11} className="rotate-45" aria-hidden />
                              )}
                              {synced ? 'Sincronizado' : 'Independiente'}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleSection>
            ) : null}

            {isBautizos && carAnchor.eligible && carAnchor.anchorPerson ? (
              <CollapsibleSection
                title="Datos de carro"
                open={isSectionOpen(id, 'car')}
                onToggle={() => toggleSection(id, 'car')}
              >
                <BautizosCarDataSummaryCard
                  hostPerson={carAnchor.anchorPerson}
                  companions={carAnchor.companionsForCrew}
                  plan={event?.transportPlanning}
                  roster={roster}
                  eventLike={event}
                  className="!p-2"
                />
              </CollapsibleSection>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className={`${uiShell.pagePad} ${uiShell.pageStack} max-w-6xl mx-auto`}>
      <div className={`${uiShell.card} p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4`}>
        <div className="flex items-start gap-3 min-w-0">
          <div className={uiPageHeaderIcon('violet')}>
            <Church size={22} />
          </div>
          <div className="min-w-0">
            <h2 className={uiPageHeader.title}>Pastores</h2>
            <p className={`${uiPageHeader.subtitle} mt-1 max-w-2xl`}>
              Costo real, fechas de estancia
              {isBautizos ? ' y grupo familiar' : ''}. Expande cada tarjeta para editar; las secciones
              recuerdan tu preferencia de apertura.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <div className={`${uiStatTile('violet')} min-w-[6.5rem]`}>
            <p className={uiStat.label}>Pastores</p>
            <p className={`${uiStat.value} text-violet-700 dark:text-violet-300`}>{rows.length}</p>
          </div>
          <div className={`${uiStatTile('emerald')} min-w-[7.5rem]`}>
            <p className={uiStat.label}>Capturado</p>
            <p className={`${uiStat.valueSm} ${uiTypography.moneyPositive}`}>{formatMoney(totalPastorCost)}</p>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className={`${uiShell.card} p-6`}>
          <div className={uiEmptyState.wrap}>
            <Church size={36} className={uiEmptyState.icon} />
            <p className={uiEmptyState.title}>Sin pastores en sedes visibles</p>
            <p className={uiEmptyState.help}>
              No hay pastores registrados en las sedes que tienes asignadas para este evento.
            </p>
          </div>
        </div>
      ) : (
        <div className={`${uiShell.card} p-2 sm:p-3 space-y-1.5`}>
          <div className="flex items-center justify-between gap-2 px-1 pb-1 border-b border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-violet-700 dark:text-violet-300">
              Listado de pastores
            </p>
            <span className={uiBadgeSoft('violet')}>{rows.length} registros</span>
          </div>
          <div className={uiRosterMobile.list}>
            {rows.map((person, i) => renderPastorCard(person, i + 1, { mobileShell: true }))}
          </div>
          <div className="hidden md:block space-y-1.5">
            {rows.map((person, i) => renderPastorCard(person, i + 1, { mobileShell: false }))}
          </div>
        </div>
      )}
    </div>
  );
}
