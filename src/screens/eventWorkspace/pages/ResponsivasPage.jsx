import React, { useMemo, useState, useCallback } from 'react';
import { FileSignature, Eye, Download, X, CheckCircle2, Trash2 } from 'lucide-react';
import {
  uiButtons, uiModal, uiShell,
  uiPageHeader, uiPageHeaderIcon,
  uiTable, uiBadgeSoft, uiBadgeSolid,
  uiEmptyState, uiRosterMobile,
} from '../../../ui/uiFormatClasses.js';
import ListMobileCard from '../../../components/ListMobileCard.jsx';
import { isResponsivaEventSectionVisible } from '../../../responsivaSignLogic.js';

function slugFileName(s) {
  return String(s || 'participante')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 80) || 'participante';
}

function getResponsivaImageUrl(p) {
  const rd = p?.responsivaDigital && typeof p.responsivaDigital === 'object' ? p.responsivaDigital : {};
  return rd.signatureStorageUrl || rd.signatureDataUrl || null;
}

function getResponsivaSignedTimestampMs(p) {
  const rd = p?.responsivaDigital && typeof p.responsivaDigital === 'object' ? p.responsivaDigital : {};
  const t = rd.submittedAt ?? rd.signedAt ?? rd.recordedAt ?? rd.signedLocallyAt;
  return typeof t === 'number' && Number.isFinite(t) ? t : null;
}

function getParticipantRegisteredTimestampMs(p) {
  const t = p?.registeredAt;
  if (typeof t === 'number' && Number.isFinite(t)) return t;
  if (typeof t === 'string') {
    const n = Date.parse(t);
    return Number.isFinite(n) ? n : null;
  }
  if (t && typeof t.toMillis === 'function') {
    const n = t.toMillis();
    return typeof n === 'number' && Number.isFinite(n) ? n : null;
  }
  if (t && typeof t.seconds === 'number') {
    return t.seconds * 1000 + Math.floor((t.nanoseconds || 0) / 1e6);
  }
  return null;
}

function kindLabel(card) {
  if (!card?.deliveredKind) return '—';
  if (card.deliveredKind === 'digital') return 'Firma digital';
  if (card.deliveredKind === 'local') return 'Firma en sitio';
  return 'Manual';
}

/** Líneas de texto para mostrar contacto/tel. de registro vs responsiva (si aplica). */
function emergencyContactSummaryLines(p) {
  const regN = String(p.emergencyContact || '').trim();
  const respN = String(p.emergencyContactResponsiva || '').trim();
  const regT = String(p.emergencyPhone || '').trim();
  const respT = String(p.emergencyPhoneResponsiva || '').trim();
  const lines = [];
  if (regN) lines.push(`Nombre (registro): ${regN}`);
  if (respN) lines.push(`Nombre (responsiva): ${respN}`);
  if (regT) lines.push(`Tel. (registro): ${regT}`);
  if (respT) lines.push(`Tel. (responsiva): ${respT}`);
  return lines;
}

async function downloadImageUrl(imageUrl, filenameBase) {
  const safe = slugFileName(filenameBase);
  if (imageUrl.startsWith('data:')) {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `responsiva_${safe}.jpg`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }
  const res = await fetch(imageUrl, { mode: 'cors' });
  const blob = await res.blob();
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = u;
  a.download = `responsiva_${safe}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(u);
}

/**
 * Vista Responsivas: responsivas entregadas con consulta/descarga por registro.
 */
export default function ResponsivasPage({
  currentEvent,
  allParticipants,
  getResponsivaCardUiState,
  applyGlobalRegistryLikeFilters,
  globalLocationFilters,
  renderGlobalRegistryListToolbar,
  isSuperUser = false,
  onDeleteResponsiva,
  renderParticipantAssistanceBadges,
}) {
  const [detail, setDetail] = useState(null);
  const [downloadBusyId, setDownloadBusyId] = useState(null);
  const [deleteBusyId, setDeleteBusyId] = useState(null);

  const { deliveredRaw, rows, coincidenceTotal } = useMemo(() => {
    if (!currentEvent?.id) {
      return { deliveredRaw: [], rows: [], coincidenceTotal: 0 };
    }
    const raw = [];
    for (const p of allParticipants) {
      if (p.eventId !== currentEvent.id) continue;
      const card = getResponsivaCardUiState(p, currentEvent);
      if (card.applies && card.delivered) raw.push(p);
    }
    let filtered = applyGlobalRegistryLikeFilters(raw);
    if (globalLocationFilters.length > 0) {
      filtered = filtered.filter((p) => globalLocationFilters.includes(p.location));
    }
    return { deliveredRaw: raw, rows: filtered, coincidenceTotal: filtered.length };
  }, [allParticipants, currentEvent, getResponsivaCardUiState, applyGlobalRegistryLikeFilters, globalLocationFilters]);

  const openDetail = useCallback(
    (person) => {
      const card = getResponsivaCardUiState(person, currentEvent);
      const rd = person?.responsivaDigital && typeof person.responsivaDigital === 'object' ? person.responsivaDigital : {};
      setDetail({
        person,
        card,
        imageUrl: getResponsivaImageUrl(person),
        signerName: rd.signerName || '',
        signerRelationship: rd.signerRelationship || '',
        whenMs: getResponsivaSignedTimestampMs(person),
      });
    },
    [currentEvent, getResponsivaCardUiState]
  );

  const handleDownload = useCallback(
    async (person) => {
      const url = getResponsivaImageUrl(person);
      if (!url) return;
      setDownloadBusyId(String(person.id));
      try {
        await downloadImageUrl(url, person.name || person.id);
      } catch (e) {
        console.error(e);
        window.open(url, '_blank', 'noopener,noreferrer');
      } finally {
        setDownloadBusyId(null);
      }
    },
    []
  );

  const handleDeleteResponsiva = useCallback(
    async (person) => {
      if (!isSuperUser || typeof onDeleteResponsiva !== 'function') return;
      const ok = window.confirm(
        '¿Eliminar la responsiva de este registro?\n\nSe quitarán el estado, los datos de firma y el registro de auditoría asociado. Esta acción no se puede deshacer.'
      );
      if (!ok) return;
      setDeleteBusyId(String(person.id));
      try {
        await onDeleteResponsiva(person);
        setDetail((d) => (d && String(d.person?.id) === String(person.id) ? null : d));
      } catch (e) {
        console.error(e);
      } finally {
        setDeleteBusyId(null);
      }
    },
    [isSuperUser, onDeleteResponsiva]
  );

  if (!currentEvent) return null;

  if (!isResponsivaEventSectionVisible(currentEvent)) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className={`${uiShell.card} p-8 text-center text-slate-500 dark:text-slate-300`}>
          No hay responsiva activa para este evento (revisa en Dashboard el interruptor general y el alcance por edad para
          responsiva general y firma digital).
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div className={`${uiShell.card} p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4`}>
        <div className="flex items-start gap-3 min-w-0">
          <div className={uiPageHeaderIcon('emerald')}>
            <FileSignature size={22} />
          </div>
          <div className="min-w-0">
            <h2 className={uiPageHeader.title}>Responsivas</h2>
            <p className={`${uiPageHeader.subtitle} mt-1 max-w-2xl`}>
              Registro de responsivas entregadas (digital, en sitio o marcadas manualmente). Mismos filtros y búsqueda que
              Registro global. Las firmas digitales se archivan también en Storage cuando el envío lo permite.
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider">Coincidencias</p>
          <p className="text-2xl font-black text-emerald-700">{coincidenceTotal}</p>
        </div>
      </div>

      {renderGlobalRegistryListToolbar(deliveredRaw, 'Solo afectan a esta vista de Responsivas (misma barra que Registro global).')}

      <div className={`${uiShell.card} p-6 space-y-4`}>
        <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600" /> Responsivas entregadas
          <span className="text-slate-400 font-bold normal-case text-xs">({rows.length})</span>
        </h3>
        {rows.length === 0 ? (
          <div className={uiEmptyState.wrap}>
            <FileSignature size={28} className={uiEmptyState.icon} />
            <p className={uiEmptyState.title}>No hay responsivas entregadas</p>
            <p className={uiEmptyState.help}>Ajusta los filtros actuales para ver otros registros.</p>
          </div>
        ) : (
          <>
          <div className={uiRosterMobile.list}>
            {rows.map((p, i) => {
              const card = getResponsivaCardUiState(p, currentEvent);
              const whenMs = getResponsivaSignedTimestampMs(p);
              const regMs = getParticipantRegisteredTimestampMs(p);
              const whenLabel =
                card?.deliveredKind === 'manual'
                  ? (regMs != null ? new Date(regMs).toLocaleString('es-MX') : '—')
                  : (whenMs != null ? new Date(whenMs).toLocaleString('es-MX') : '—');
              const img = getResponsivaImageUrl(p);
              const emLines = emergencyContactSummaryLines(p);
              return (
                <ListMobileCard
                  key={p.id}
                  title={`${i + 1}. ${p.name || '?'}`}
                  metaRows={[
                    { key: 'sede', label: 'Sede', value: p.location || '—' },
                    {
                      key: 'em',
                      label: 'Contacto emergencia',
                      value: emLines.length ? emLines.join(' · ') : '—',
                    },
                    { key: 'tipo', label: 'Tipo', value: kindLabel(card) },
                    { key: 'reg', label: 'Registro', value: whenLabel },
                  ]}
                  actions={
                    <>
                      <button type="button" onClick={() => openDetail(p)} className={`inline-flex items-center gap-1 ${uiButtons.secondary} text-[11px] min-h-[44px]`}>
                        <Eye size={14} /> Ver
                      </button>
                      {img ? (
                        <button
                          type="button"
                          disabled={downloadBusyId === String(p.id)}
                          onClick={() => void handleDownload(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 min-h-[44px]"
                        >
                          <Download size={14} />
                          {downloadBusyId === String(p.id) ? '…' : 'Descargar'}
                        </button>
                      ) : null}
                      {isSuperUser && onDeleteResponsiva ? (
                        <button
                          type="button"
                          disabled={deleteBusyId === String(p.id)}
                          onClick={() => void handleDeleteResponsiva(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-rose-200 bg-rose-50 text-rose-900 min-h-[44px]"
                        >
                          <Trash2 size={14} />
                          {deleteBusyId === String(p.id) ? '…' : 'Borrar'}
                        </button>
                      ) : null}
                    </>
                  }
                />
              );
            })}
          </div>
          <div className={`${uiTable.wrap} hidden md:block`}>
            <table className={uiTable.table}>
              <thead className={uiTable.thead}>
                <tr>
                  <th className={uiTable.th}>#</th>
                  <th className={uiTable.th}>Nombre</th>
                  <th className={uiTable.th}>Sede</th>
                  <th className={uiTable.th}>Contacto emergencia</th>
                  <th className={`${uiTable.th} min-w-[10rem]`}>Tipo</th>
                  <th className={uiTable.th}>Registro</th>
                  <th className={uiTable.thRight}>Acciones</th>
                </tr>
              </thead>
              <tbody className={uiTable.tbody}>
                {rows.map((p, i) => {
                  const card = getResponsivaCardUiState(p, currentEvent);
                  const whenMs = getResponsivaSignedTimestampMs(p);
                  const regMs = getParticipantRegisteredTimestampMs(p);
                  const whenLabel =
                    card?.deliveredKind === 'manual'
                      ? (regMs != null ? new Date(regMs).toLocaleString('es-MX') : '—')
                      : (whenMs != null ? new Date(whenMs).toLocaleString('es-MX') : '—');
                  const img = getResponsivaImageUrl(p);
                  const emLines = emergencyContactSummaryLines(p);
                  return (
                    <tr key={p.id} className={uiTable.tr}>
                      <td className={`${uiTable.td} tabular-nums text-slate-500 dark:text-slate-300 font-bold`}>{i + 1}</td>
                      <td className={`${uiTable.td} align-top font-bold text-slate-800 dark:text-slate-100`}>
                        <span className="block">{p.name || '?'}</span>
                        {typeof renderParticipantAssistanceBadges === 'function' ? (
                          <div className="flex flex-wrap gap-1 mt-1.5 font-normal">{renderParticipantAssistanceBadges(p)}</div>
                        ) : null}
                      </td>
                      <td className={`${uiTable.td} text-slate-600 dark:text-slate-300`}>{p.location || '—'}</td>
                      <td className={`${uiTable.td} text-[10px] text-slate-600 dark:text-slate-300 max-w-[13rem] leading-snug`}>
                        {emLines.length ? (
                          <div className="space-y-0.5">
                            {emLines.map((line, li) => (
                              <div key={li}>{line}</div>
                            ))}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={`${uiTable.td} min-w-[10rem] whitespace-nowrap`}>
                        <span className="chip-responsiva-page-tipo inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-lg border bg-emerald-50 text-emerald-800 border-emerald-200 dark:border-emerald-500/45 dark:bg-emerald-600 dark:text-white">
                          {kindLabel(card)}
                        </span>
                      </td>
                      <td className={`${uiTable.td} text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap`}>{whenLabel}</td>
                      <td className={`${uiTable.td} text-right`}>
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openDetail(p)}
                            className={`inline-flex items-center gap-1 ${uiButtons.secondary} text-[11px]`}
                          >
                            <Eye size={14} />
                            Ver
                          </button>
                          {img ? (
                            <button
                              type="button"
                              disabled={downloadBusyId === String(p.id)}
                              onClick={() => void handleDownload(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-700 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-700 shadow-sm dark:shadow-sm dark:transition-all dark:active:scale-[0.98]"
                            >
                              <Download size={14} />
                              {downloadBusyId === String(p.id) ? '…' : 'Descargar'}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold">Sin archivo</span>
                          )}
                          {isSuperUser && onDeleteResponsiva ? (
                            <button
                              type="button"
                              disabled={deleteBusyId === String(p.id)}
                              onClick={() => void handleDeleteResponsiva(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-700 dark:bg-rose-600 dark:text-white dark:hover:bg-rose-700 shadow-sm dark:shadow-sm dark:transition-all dark:active:scale-[0.98]"
                              title="Eliminar responsiva (solo SuperUsuario)"
                            >
                              <Trash2 size={14} />
                              {deleteBusyId === String(p.id) ? '…' : 'Borrar'}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {detail ? (
        <div
          className={uiModal.overlay}
          role="dialog"
          aria-modal
          aria-labelledby="responsiva-detail-title"
        >
          <button type="button" className={uiModal.backdrop} onClick={() => setDetail(null)} aria-label="Cerrar detalle responsiva" />
          <div className={`${uiModal.panel} max-w-lg`}>
            <div className={`${uiModal.header} p-4`}>
              <div>
                <h4 id="responsiva-detail-title" className="text-lg font-black text-slate-800 dark:text-slate-100">
                  Responsiva — {detail.person?.name || '?'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                  {kindLabel(detail.card)} · {detail.person?.location || '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className={uiButtons.closeIcon}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3 text-slate-700 dark:text-slate-200">
              {detail.whenMs != null ? (
                <p className="text-sm text-slate-600">
                  <span className="font-bold text-slate-700">Fecha / hora: </span>
                  {new Date(detail.whenMs).toLocaleString('es-MX')}
                </p>
              ) : null}
              {(() => {
                const emLines = emergencyContactSummaryLines(detail.person);
                if (!emLines.length) return null;
                return (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm space-y-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Contacto de emergencia</p>
                    {emLines.map((line, idx) => (
                    <p key={idx} className="text-slate-800 dark:text-slate-100 leading-snug">
                        {line}
                      </p>
                    ))}
                  </div>
                );
              })()}
              {detail.card?.deliveredKind === 'digital' ? (
                <>
                  {detail.signerName ? (
                    <p className="text-sm text-slate-600">
                      <span className="font-bold text-slate-700">Firmó: </span>
                      {detail.signerName}
                      {detail.signerRelationship ? (
                        <>
                          <br />
                          <span className="font-bold text-slate-700">Parentesco: </span>
                          {detail.signerRelationship}
                        </>
                      ) : null}
                    </p>
                  ) : null}
                  {detail.imageUrl ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                      <p className="text-[10px] font-black text-emerald-900 uppercase tracking-wide mb-2">Firma</p>
                      <img
                        src={detail.imageUrl}
                        alt="Firma responsiva"
                        className="max-h-64 w-auto mx-auto rounded-lg border border-white bg-white shadow-sm"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3">
                      No hay imagen en archivo (puede ser registro previo o solo estado manual).
                    </p>
                  )}
                </>
              ) : detail.card?.deliveredKind === 'local' ? (
                <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  Responsiva registrada como firmada en sitio (papel). No se almacena imagen digital en el sistema.
                </p>
              ) : (
                <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  Entregada registrada por estado (sin firma digital en sistema).
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                {detail.imageUrl ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleDownload(detail.person)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-700 shadow-sm dark:shadow-sm dark:transition-all dark:active:scale-[0.98]"
                    >
                      <Download size={16} />
                      Descargar imagen
                    </button>
                    <a
                      href={detail.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      Abrir en pestaña nueva
                    </a>
                  </>
                ) : null}
                {isSuperUser && onDeleteResponsiva && detail.person ? (
                  <button
                    type="button"
                    disabled={deleteBusyId === String(detail.person.id)}
                    onClick={() => void handleDeleteResponsiva(detail.person)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-700 dark:bg-rose-600 dark:text-white dark:hover:bg-rose-700 shadow-sm dark:shadow-sm dark:transition-all dark:active:scale-[0.98]"
                  >
                    <Trash2 size={16} />
                    {deleteBusyId === String(detail.person.id) ? 'Borrando…' : 'Borrar responsiva'}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
