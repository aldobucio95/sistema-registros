import React from 'react';
import { Archive, CheckCircle2, ShieldAlert } from 'lucide-react';
import { SI_LABEL } from '../../appConstants.js';
import { getBautizosPartyCancelTargetMeta, planBautizosPartyCancelArchive } from '../../bautizosCompanionBajaArchive.js';
import { describeCollisionCluster } from '../../companionRegistrantCollision.js';
import { uiButtons, uiFilter, uiModal, uiTonalSolid } from '../../ui/uiFormatClasses.js';

export default function RegistryConfirmModal({
  registryConfirmModal,
  registryConfirmBusy,
  allParticipants,
  currentEvent,
  onClose,
  onSubmit,
  onUpdateModal,
}) {
  if (!registryConfirmModal.isOpen || !registryConfirmModal.type) return null;

  const isBautizosPartyModal =
    (registryConfirmModal.type === 'cancel_entry' || registryConfirmModal.type === 'archive_roster') &&
    Array.isArray(registryConfirmModal.bautizosPartyTargets) &&
    registryConfirmModal.bautizosPartyTargets.length > 0;

  const updateBautizosCompanionSelection = (nextKeys) => {
    const person =
      allParticipants.find(
        (p) => String(p.id) === String(registryConfirmModal.personId) && p.eventId === currentEvent?.id
      ) || null;
    const roster = allParticipants.filter((p) => p.eventId === currentEvent?.id);
    const plan = person
      ? planBautizosPartyCancelArchive({
          host: person,
          roster,
          event: currentEvent,
          selectedTargetKeys: nextKeys,
          action: registryConfirmModal.type,
        })
      : null;
    onUpdateModal((prev) => ({
      ...prev,
      bautizosSelectedTargetKeys: nextKeys,
      bautizosPaymentPreview: plan?.paymentPreview || [],
    }));
  };

  if (isBautizosPartyModal) {
    const isCancel = registryConfirmModal.type === 'cancel_entry';
    const allTargetKeys = registryConfirmModal.bautizosPartyTargets.map((t) => t.key);
    const selectedKeys = registryConfirmModal.bautizosSelectedTargetKeys || [];
    const selectedSet = new Set(selectedKeys);
    const paymentPreview = registryConfirmModal.bautizosPaymentPreview || [];
    const showPaymentPreview = paymentPreview.length > 0;

    return (
      <div className={uiModal.overlay} role="dialog" aria-modal="true">
        <button
          type="button"
          className={uiModal.backdrop}
          onClick={() => {
            if (!registryConfirmBusy) onClose();
          }}
          aria-label="Cerrar confirmación"
        />
        <form
          className={`${uiModal.panelMd} animate-in zoom-in-95 duration-200`}
          onClick={(e) => e.stopPropagation()}
          onSubmit={(e) => {
            e.preventDefault();
            if (!registryConfirmBusy) void onSubmit();
          }}
        >
          <div className={uiModal.header}>
            <h3 className={uiModal.title}>
              {isCancel ? 'Dar de baja — grupo Bautizos' : 'Archivar — grupo Bautizos'}
            </h3>
          </div>
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 flex-1 min-h-0 space-y-3 text-left">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Siempre se {isCancel ? 'dará de baja' : 'archivará'} a{' '}
              <strong>{registryConfirmModal.personName}</strong>. Marca los integrantes adicionales que también deben{' '}
              {isCancel ? 'darse de baja' : 'archivarse'}; los no marcados permanecerán activos (acompañantes simples
              pasan a registro tipo Asistente).
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={uiButtons.secondary}
                disabled={registryConfirmBusy}
                onClick={() => updateBautizosCompanionSelection([...allTargetKeys])}
              >
                Todos
              </button>
              <button
                type="button"
                className={uiButtons.secondary}
                disabled={registryConfirmBusy}
                onClick={() => updateBautizosCompanionSelection([])}
              >
                Ninguno
              </button>
            </div>
            <div className={`flex flex-wrap gap-2 ${uiFilter.dropdownScope}`}>
              {registryConfirmModal.bautizosPartyTargets.map((target) => {
                const meta = getBautizosPartyCancelTargetMeta(target);
                const checked = selectedSet.has(meta.key);
                return (
                  <label
                    key={meta.key}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className={uiFilter.circleControl}
                      checked={checked}
                      disabled={registryConfirmBusy}
                      onChange={() => {
                        const next = checked
                          ? selectedKeys.filter((k) => k !== meta.key)
                          : [...selectedKeys, meta.key];
                        updateBautizosCompanionSelection(next);
                      }}
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {meta.name}
                      <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        {meta.kindLabel}
                        {meta.relationship ? ` · ${meta.relationship}` : ''}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {showPaymentPreview && (
              <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/40 bg-indigo-50/50 dark:bg-indigo-950/30 p-3 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-800 dark:text-indigo-200">
                  Reparto de abonos entre supervivientes
                </p>
                <ul className="space-y-1">
                  {paymentPreview.map((row) => (
                    <li
                      key={row.key}
                      className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs text-slate-700 dark:text-slate-200"
                    >
                      <span>
                        {row.name}
                        {row.willPromote ? (
                          <span className="ml-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                            (nuevo registro)
                          </span>
                        ) : null}
                      </span>
                      <span className="font-bold tabular-nums">
                        ${Number(row.paidShare || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {registryConfirmModal.fromDuplicateDiagnostic && registryConfirmModal.duplicateReasonsLine && (
              <p className="text-xs text-amber-900 dark:text-amber-100 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-500/30 rounded-lg px-3 py-2">
                <span className="font-bold">Diagnóstico de duplicado:</span> {registryConfirmModal.duplicateReasonsLine}
              </p>
            )}
          </div>
          <div className={uiModal.footer}>
            <button type="button" onClick={onClose} disabled={registryConfirmBusy} className={uiButtons.secondary}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={registryConfirmBusy}
              className={`${uiTonalSolid(isCancel ? 'amber' : 'rose')} disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {registryConfirmBusy
                ? '…'
                : isCancel
                  ? `${SI_LABEL}, dar de baja`
                  : `${SI_LABEL}, archivar`}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !registryConfirmBusy) onClose();
      }}
    >
      <form
        className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 text-center"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!registryConfirmBusy) void onSubmit();
        }}
      >
        {registryConfirmModal.type === 'dup_accept_cluster' ? (
          <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
        ) : registryConfirmModal.type === 'delete_donation' ||
          registryConfirmModal.type === 'cancel_entry' ||
          registryConfirmModal.type === 'remove_pending_refund' ||
          registryConfirmModal.type === 'delete_payment_history_row' ||
          registryConfirmModal.type === 'delete_archived_record' ? (
          <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={32} className="text-red-500" />
          </div>
        ) : (
          <div className="bg-amber-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Archive size={32} className="text-amber-600" />
          </div>
        )}
        <h3 className="text-xl font-black text-slate-800 mb-2">
          {registryConfirmModal.type === 'delete_donation' && 'Eliminar donación'}
          {registryConfirmModal.type === 'cancel_entry' && 'Dar de baja'}
          {registryConfirmModal.type === 'move_to_waitlist' && 'Mover a lista de espera'}
          {registryConfirmModal.type === 'archive_waitlist' && 'Archivar lista de espera'}
          {registryConfirmModal.type === 'archive_roster' && 'Archivar registro'}
          {registryConfirmModal.type === 'archive_duplicate_hint' && 'Archivar registro duplicado'}
          {registryConfirmModal.type === 'dup_accept_cluster' && 'Autorizar duplicado'}
          {registryConfirmModal.type === 'companion_link_collision' && 'Vincular acompañante a registro activo'}
          {registryConfirmModal.type === 'companion_ack_collision' && 'Reconocer colisión acompañante'}
          {registryConfirmModal.type === 'remove_pending_refund' && 'Eliminar saldo pendiente'}
          {registryConfirmModal.type === 'delete_payment_history_row' && 'Eliminar abono del historial'}
          {registryConfirmModal.type === 'delete_archived_record' && 'Eliminar del archivo'}
        </h3>
        <div className="text-sm text-slate-500 mb-6 space-y-3">
          {registryConfirmModal.type === 'delete_donation' && (
            <p>
              ¿Eliminar la donación de{' '}
              <strong>${registryConfirmModal.donationAmount.toLocaleString('es-MX')}</strong>? Esta acción no se puede
              deshacer.
            </p>
          )}
          {registryConfirmModal.type === 'cancel_entry' && (
            <p>
              ¿Confirmas dar de baja a <strong>{registryConfirmModal.personName}</strong>? Dejará de contar en
              inscritos; si hubo pagos, puede quedar saldo pendiente de devolución.
            </p>
          )}
          {registryConfirmModal.type === 'move_to_waitlist' && (
            <p>
              ¿Mover a <strong>{registryConfirmModal.personName}</strong> a lista de espera? Dejará de contar como
              inscrito activo, pero conservará su historial y datos en este evento.
            </p>
          )}
          {registryConfirmModal.type === 'archive_roster' && (
            <p>
              ¿Archivar a <strong>{registryConfirmModal.personName}</strong>? El ID VNPM y los datos personales se
              conservan para precargar en otros eventos.
            </p>
          )}
          {registryConfirmModal.type === 'archive_duplicate_hint' && (
            <p>
              ¿Archivar a <strong>{registryConfirmModal.personName}</strong>? El registro dejará de contar en este
              evento; el ID VNPM y los datos personales se conservan para precargar en otros eventos. Esta acción se
              confirma desde el aviso de duplicado al nuevo registro (SuperUsuario).
            </p>
          )}
          {registryConfirmModal.type === 'archive_waitlist' && (
            <p>
              ¿Archivar a <strong>{registryConfirmModal.personName}</strong> de la lista de espera? Los datos siguen
              disponibles para precargar en otros eventos.
            </p>
          )}
          {registryConfirmModal.type === 'remove_pending_refund' && (
            <p>
              ¿Eliminar el saldo pendiente de devolución de <strong>{registryConfirmModal.personName}</strong> (
              <strong>
                ${registryConfirmModal.refundAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
              )? Dejará de restarse en el balance neto de esta lista como si esa obligación ya no existiera. No se crea
              un registro visible en actividad; solo auditoría oculta.
            </p>
          )}
          {registryConfirmModal.type === 'delete_payment_history_row' && (
            <p>
              ¿Eliminar el abono de{' '}
              <strong>
                ${registryConfirmModal.donationAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>{' '}
              del historial de <strong>{registryConfirmModal.personName}</strong>? Se recalcularán los totales pagados y
              el saldo pendiente de devolución. Esta acción no se puede deshacer.
            </p>
          )}
          {registryConfirmModal.type === 'delete_archived_record' && (
            <p>
              ¿Eliminar definitivamente a <strong>{registryConfirmModal.personName}</strong> del archivo? Se borrará el
              documento en <code className="text-[11px]">app_participants</code> y, si el índice en{' '}
              <code className="text-[11px]">app_archived_profiles</code> corresponde exactamente a este registro (o la
              clave es solo por id de participante), también se elimina esa entrada. Si el mismo VNPM o teléfono tiene
              otra fusión más reciente en el índice, este último no se borra. Irreversible.
            </p>
          )}
          {registryConfirmModal.type === 'companion_link_collision' && registryConfirmModal.companionCollisionCluster && (
            <div className="text-left space-y-2">
              <p>
                Se vinculará la fila de acompañante al registro activo existente. El acompañante dejará de contarse
                como persona separada en finanzas y transporte del titular.
              </p>
              <p className="text-xs text-violet-900 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
                {describeCollisionCluster(registryConfirmModal.companionCollisionCluster)}
              </p>
            </div>
          )}
          {registryConfirmModal.type === 'companion_ack_collision' && registryConfirmModal.companionCollisionCluster && (
            <div className="text-left space-y-2">
              <p>
                Marcará este aviso como reconocido en titular y registro activo. No modifica datos; solo oculta la
                alerta del diagnóstico.
              </p>
              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                {describeCollisionCluster(registryConfirmModal.companionCollisionCluster)}
              </p>
            </div>
          )}
          {registryConfirmModal.type === 'dup_accept_cluster' && registryConfirmModal.dupAcceptCluster && (
            <div className="text-left space-y-2">
              <p>
                Se añadirá un <strong>comentario general</strong> en <strong>cada registro activo del grupo</strong>,
                indicando los otros documentos involucrados y en qué criterios coincidieron. Además se marcará el aviso
                como reconocido para que deje de mostrarse este grupo de duplicados.
              </p>
              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                <span className="font-bold text-slate-700">Parámetros en conflicto:</span>{' '}
                {(registryConfirmModal.dupAcceptCluster.reasons || []).length
                  ? (registryConfirmModal.dupAcceptCluster.reasons || []).join(' · ')
                  : '—'}
              </p>
              <p className="text-xs text-slate-500">
                <span className="font-bold">Documentos en el grupo:</span>{' '}
                {(registryConfirmModal.dupAcceptCluster.memberIds || []).join(', ')}
              </p>
            </div>
          )}
          {(registryConfirmModal.type === 'cancel_entry' ||
            registryConfirmModal.type === 'archive_roster' ||
            registryConfirmModal.type === 'archive_waitlist') &&
            registryConfirmModal.fromDuplicateDiagnostic &&
            registryConfirmModal.duplicateReasonsLine && (
              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-left">
                <span className="font-bold">Diagnóstico de duplicado:</span> {registryConfirmModal.duplicateReasonsLine}
              </p>
            )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={registryConfirmBusy}
            className={`flex-1 py-3 px-4 font-bold rounded-xl transition-colors text-sm ${registryConfirmBusy ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={registryConfirmBusy}
            className={`flex-1 py-3 px-4 text-white font-bold rounded-xl transition-colors text-sm shadow-lg disabled:opacity-60 disabled:cursor-not-allowed ${
              registryConfirmModal.type === 'delete_donation' ||
              registryConfirmModal.type === 'cancel_entry' ||
              registryConfirmModal.type === 'remove_pending_refund' ||
              registryConfirmModal.type === 'delete_payment_history_row' ||
              registryConfirmModal.type === 'delete_archived_record'
                ? 'bg-red-500 hover:bg-red-600 shadow-red-200'
                : registryConfirmModal.type === 'dup_accept_cluster'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                  : registryConfirmModal.type === 'companion_link_collision'
                    ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-200'
                    : 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
            }`}
          >
            {registryConfirmBusy
              ? '?'
              : registryConfirmModal.type === 'delete_donation' ||
                  registryConfirmModal.type === 'remove_pending_refund' ||
                  registryConfirmModal.type === 'delete_payment_history_row' ||
                  registryConfirmModal.type === 'delete_archived_record'
                ? `${SI_LABEL}, eliminar`
                : registryConfirmModal.type === 'cancel_entry'
                  ? `${SI_LABEL}, dar de baja`
                  : registryConfirmModal.type === 'move_to_waitlist'
                    ? `${SI_LABEL}, mover`
                    : registryConfirmModal.type === 'dup_accept_cluster'
                      ? `${SI_LABEL}, autorizar`
                      : registryConfirmModal.type === 'companion_link_collision'
                        ? `${SI_LABEL}, vincular`
                        : registryConfirmModal.type === 'companion_ack_collision'
                          ? `${SI_LABEL}, reconocer`
                          : `${SI_LABEL}, archivar`}
          </button>
        </div>
      </form>
    </div>
  );
}
