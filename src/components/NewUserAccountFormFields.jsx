import React from 'react';
import { CalendarRange, Lock, Plus, Scissors, ShieldAlert } from 'lucide-react';
import AdvancedUserPermissionsPanel from '../rbac/AdvancedUserPermissionsPanel.jsx';
import { AUTH_EMAIL_DOMAIN } from '../firebaseConfig.js';
import { mergePanelSectionLayers } from '../rbac/permissions.js';
import { panelNavSidebarItemAppliesToEvent, resolvePanelNavConfigItemCopy } from '../panelNavUi.js';
import { uiControls, uiUserAccountForm } from '../ui/uiFormatClasses.js';

/**
 * Campos del formulario de alta de usuario (móvil inline y modal escritorio).
 */
export default function NewUserAccountFormFields({
  newUser,
  setNewUser,
  isSuperUser,
  hasAdminRights,
  sortedEvents,
  allKnownLocationNames,
  getEditableScopedEvents,
  applyLandingSedeToNewUserState,
  pruneEventScopedAccessMap,
  EDITOR_LECTOR_PANEL_DEFAULT,
  DEFAULT_PANEL_NAV,
  PANEL_NAV_SIDEBAR_ITEMS,
  variant = 'desktop',
  fieldStack,
  inputClasses,
  labelClasses,
}) {
  const isDesktop = variant === 'desktop';
  const inputCls = isDesktop ? uiUserAccountForm.input : inputClasses;
  const sectionCls = isDesktop ? uiUserAccountForm.section : 'rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-sm space-y-2';
  const labelCls = isDesktop ? uiUserAccountForm.sectionTitle : `${labelClasses} font-bold text-slate-600 dark:text-slate-400`;

  const onRoleChange = (role) => {
    const latestEvent = sortedEvents.length ? sortedEvents[sortedEvents.length - 1] : null;
    const latestLoc = latestEvent?.locations?.length ? latestEvent.locations[latestEvent.locations.length - 1] : '';
    if (role === 'Administrador') {
      setNewUser({
        ...newUser,
        role,
        allowedEventIds: [],
        allowedLocations: [],
        allowedLocationsByEvent: {},
        allowedPanelSections: { ...DEFAULT_PANEL_NAV, expenseList: false },
        allowedPanelSectionsByEvent: {},
        canViewExpenses: false,
        canViewFinances: true,
        canSendWhatsAppQuickAction: true,
        canMarkResponsivaLocalQuickAction: true,
        canSendResponsivaDigitalQuickAction: true,
      });
      return;
    }
    if (role === 'Editor' || role === 'Lector') {
      setNewUser((prev) =>
        applyLandingSedeToNewUserState({
          ...prev,
          role,
          allowedEventIds: latestEvent ? [latestEvent.id] : [],
          allowedLocations: latestLoc ? [latestLoc] : [],
          allowedLocationsByEvent: latestEvent && latestLoc ? { [latestEvent.id]: [latestLoc] } : {},
          allowedPanelSections: { ...EDITOR_LECTOR_PANEL_DEFAULT },
          allowedPanelSectionsByEvent: latestEvent ? { [latestEvent.id]: { ...EDITOR_LECTOR_PANEL_DEFAULT } } : {},
          canViewExpenses: false,
          canViewFinances: false,
          canSendWhatsAppQuickAction: false,
          canMarkResponsivaLocalQuickAction: true,
          canSendResponsivaDigitalQuickAction: false,
        })
      );
      return;
    }
    setNewUser({ ...newUser, role, allowedPanelSections: { ...DEFAULT_PANEL_NAV }, allowedPanelSectionsByEvent: {} });
  };

  const landingOptions = () => {
    let locs = ['Administrador', 'SuperUsuario'].includes(newUser.role)
      ? allKnownLocationNames
      : (newUser.allowedLocations || []).length
        ? newUser.allowedLocations
        : allKnownLocationNames;
    const p = String(newUser.preferredLandingTab || '').trim();
    if (p && p !== 'Summary' && !locs.includes(p)) locs = [...locs, p];
    return locs;
  };

  return (
    <div className="space-y-3">
      <div className={sectionCls}>
        <p className={`${labelCls} flex items-center gap-2`}>
          <Plus size={14} className="text-indigo-500 shrink-0" />
          Identidad y acceso
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={fieldStack}>
            <label className={uiUserAccountForm.sectionTitle}>Usuario</label>
            <input
              type="text"
              required
              placeholder="Nombre de usuario"
              className={inputCls}
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            />
          </div>
          <div className={fieldStack}>
            <label className={uiUserAccountForm.sectionTitle}>Contraseña</label>
            <input
              type="password"
              required
              placeholder="Mínimo 8 caracteres"
              className={inputCls}
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            />
          </div>
          <div className={`${fieldStack} sm:col-span-2`}>
            <label className={uiUserAccountForm.sectionTitle}>Correo de acceso (opcional)</label>
            <input
              type="email"
              autoComplete="off"
              placeholder={`usuario@${AUTH_EMAIL_DOMAIN}`}
              className={inputCls}
              value={newUser.loginEmail || ''}
              onChange={(e) => setNewUser({ ...newUser, loginEmail: e.target.value })}
            />
            <p className={uiUserAccountForm.sectionHelper}>
              Vacío: <span className="font-mono">nombre@{AUTH_EMAIL_DOMAIN}</span>. Con @gmail.com podrán usar «Continuar con Google».
            </p>
          </div>
        </div>
      </div>

      <div className={sectionCls}>
        <p className={`${labelCls} flex items-center gap-2`}>
          <ShieldAlert size={14} className="text-indigo-500 shrink-0" />
          Rol y ventana inicial
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={fieldStack}>
            <label className={uiUserAccountForm.sectionTitle}>Rol</label>
            <select className={inputCls} value={newUser.role} onChange={(e) => onRoleChange(e.target.value)}>
              <option value="Administrador">Administrador</option>
              <option value="Editor">Editor</option>
              <option value="Lector">Lector</option>
            </select>
          </div>
          <div className={fieldStack}>
            <label className={uiUserAccountForm.sectionTitle}>Ventana inicial</label>
            <select
              className={inputCls}
              value={newUser.preferredLandingTab || 'Summary'}
              onChange={(e) => {
                const v = e.target.value;
                setNewUser((prev) => {
                  if (v === 'Summary') return { ...prev, preferredLandingTab: v };
                  return applyLandingSedeToNewUserState({ ...prev, preferredLandingTab: v });
                });
              }}
            >
              <option value="Summary">Dashboard</option>
              {landingOptions().map((loc) => (
                <option key={`pref-new-${loc}`} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className={uiUserAccountForm.sectionHelper}>
          Al elegir una sede como inicio, quedará solo esa sede en cada evento asignado por defecto.
        </p>
      </div>

      {newUser.role === 'Administrador' ? (
        <div className={sectionCls}>
          <label className={uiUserAccountForm.sectionTitle}>Sesiones simultáneas</label>
          <p className={uiUserAccountForm.sectionHelper}>Límite de pestañas o dispositivos concurrentes (1–20).</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={1}
              max={20}
              disabled={!isSuperUser}
              className={`${inputCls} w-24 ${!isSuperUser ? uiUserAccountForm.inputDisabled : ''}`}
              value={newUser.maxConcurrentSessions}
              onChange={(e) => setNewUser({ ...newUser, maxConcurrentSessions: e.target.value })}
            />
            {!isSuperUser ? (
              <span className="text-[9px] text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-955/20 px-2 py-0.5 rounded border border-amber-100 dark:border-amber-900/30">
                Solo SuperUsuario puede ajustar este límite.
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {newUser.role !== 'SuperUsuario' ? (
        <div className={sectionCls}>
          <p className={`${labelCls} flex items-center gap-2`}>
            <CalendarRange size={14} className="text-indigo-500 shrink-0" />
            Alcance de eventos y sedes
          </p>
          {!isSuperUser ? (
            <p className="text-[9px] text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-955/20 px-2 py-0.5 rounded border border-amber-100 dark:border-amber-900/30 inline-block">
              Solo SuperUsuario puede ajustar eventos y sedes.
            </p>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5">
              <label className={uiUserAccountForm.sectionTitle}>Eventos</label>
              <label className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-indigo-600 w-3.5 h-3.5 rounded"
                  disabled={!isSuperUser}
                  checked={(newUser.allowedEventIds || []).length === 0}
                  onChange={(e) => {
                    const nextEventIds = e.target.checked ? [] : sortedEvents[0] ? [sortedEvents[0].id] : [];
                    setNewUser((prev) =>
                      applyLandingSedeToNewUserState({
                        ...prev,
                        allowedEventIds: nextEventIds,
                        allowedLocationsByEvent: pruneEventScopedAccessMap(prev.allowedLocationsByEvent || {}, nextEventIds),
                        allowedPanelSectionsByEvent: pruneEventScopedAccessMap(prev.allowedPanelSectionsByEvent || {}, nextEventIds),
                      })
                    );
                  }}
                />
                <span>Todos los eventos</span>
              </label>
              <div className="border border-slate-100 dark:border-slate-800 rounded-lg p-1.5 space-y-0.5 bg-slate-50/50 dark:bg-slate-955/50 max-h-40 overflow-y-auto">
                {sortedEvents.map((ev) => {
                  const checked = (newUser.allowedEventIds || []).includes(ev.id);
                  return (
                    <label key={ev.id} className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-indigo-600 w-3.5 h-3.5 rounded"
                        disabled={!isSuperUser}
                        checked={checked}
                        onChange={(e) => {
                          setNewUser((prev) => {
                            const prevIds = prev.allowedEventIds || [];
                            const next = e.target.checked ? [...prevIds, ev.id] : prevIds.filter((id) => id !== ev.id);
                            return applyLandingSedeToNewUserState({
                              ...prev,
                              allowedEventIds: next,
                              allowedLocationsByEvent: pruneEventScopedAccessMap(prev.allowedLocationsByEvent || {}, next),
                              allowedPanelSectionsByEvent: pruneEventScopedAccessMap(prev.allowedPanelSectionsByEvent || {}, next),
                            });
                          });
                        }}
                      />
                      <span>{ev.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5">
              <label className={uiUserAccountForm.sectionTitle}>Sedes por evento</label>
              <div className="border border-slate-100 dark:border-slate-800 rounded-lg p-1 space-y-1.5 bg-slate-50/50 dark:bg-slate-955/50 max-h-48 overflow-y-auto">
                {getEditableScopedEvents(newUser.allowedEventIds).length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic p-3 text-center">Todos los eventos o sin selección</p>
                ) : (
                  getEditableScopedEvents(newUser.allowedEventIds).map((ev) => {
                    const selected = Array.isArray(newUser.allowedLocationsByEvent?.[ev.id]) ? newUser.allowedLocationsByEvent[ev.id] : [];
                    const basePanelNew =
                      newUser.role === 'Editor' || newUser.role === 'Lector'
                        ? EDITOR_LECTOR_PANEL_DEFAULT
                        : { ...DEFAULT_PANEL_NAV, expenseList: false };
                    const selectedPanel = mergePanelSectionLayers(
                      basePanelNew,
                      newUser.allowedPanelSections,
                      newUser.allowedPanelSectionsByEvent?.[ev.id]
                    );
                    const locList = ev.locations || [];
                    const allLocsSelected = locList.length > 0 && locList.every((loc) => selected.includes(loc));
                    const someLocsSelected = locList.some((loc) => selected.includes(loc));
                    return (
                      <details key={`new-user-event-sedes-${ev.id}`} className={`group/sede ${uiControls.collapsibleWrap} [&_summary::-webkit-details-marker]:hidden`}>
                        <summary className="cursor-pointer list-none flex items-center justify-between py-2 px-2 bg-slate-50/80 dark:bg-slate-800/40 select-none rounded-lg">
                          <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">{ev.name}</span>
                          <span className="text-[8px] text-indigo-500 dark:text-indigo-400 group-open/sede:rotate-180">▼</span>
                        </summary>
                        <div className={`${uiControls.collapsibleBody} space-y-2`}>
                          {locList.length > 0 ? (
                            <label className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-400 cursor-pointer">
                              <input
                                type="checkbox"
                                className="accent-indigo-600 w-3.5 h-3.5 rounded"
                                disabled={!isSuperUser}
                                checked={allLocsSelected}
                                ref={(input) => {
                                  if (input) input.indeterminate = someLocsSelected && !allLocsSelected;
                                }}
                                onChange={(e) => {
                                  setNewUser({
                                    ...newUser,
                                    allowedLocationsByEvent: {
                                      ...(newUser.allowedLocationsByEvent || {}),
                                      [ev.id]: e.target.checked ? [...locList] : [],
                                    },
                                  });
                                }}
                              />
                              <span>Todas las sedes</span>
                            </label>
                          ) : null}
                          <div className="grid grid-cols-2 gap-1.5">
                            {(ev.locations || []).map((loc) => (
                              <label key={`new-user-${ev.id}-${loc}`} className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="accent-indigo-600 w-3.5 h-3.5 rounded"
                                  disabled={!isSuperUser}
                                  checked={selected.includes(loc)}
                                  onChange={(e) => {
                                    const prev = Array.isArray(newUser.allowedLocationsByEvent?.[ev.id]) ? newUser.allowedLocationsByEvent[ev.id] : [];
                                    const next = e.target.checked ? [...prev, loc] : prev.filter((x) => x !== loc);
                                    setNewUser({
                                      ...newUser,
                                      allowedLocationsByEvent: { ...(newUser.allowedLocationsByEvent || {}), [ev.id]: next },
                                    });
                                  }}
                                />
                                <span>{loc}</span>
                              </label>
                            ))}
                          </div>
                          <div className="mt-2 border-t border-slate-100 dark:border-slate-800 pt-2 space-y-1">
                            <p className={uiUserAccountForm.sectionTitle}>Menú de este evento</p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {PANEL_NAV_SIDEBAR_ITEMS.filter((item) => panelNavSidebarItemAppliesToEvent(item.key, ev.eventType)).map((item) => {
                                const { label, hint } = resolvePanelNavConfigItemCopy(item, ev.eventType);
                                return (
                                  <label
                                    key={`new-user-panel-${ev.id}-${item.key}`}
                                    className="flex items-start gap-1.5 px-2 py-1 text-[10px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                                    title={hint || undefined}
                                  >
                                    <input
                                      type="checkbox"
                                      className="accent-indigo-600 w-3.5 h-3.5 rounded mt-0.5"
                                      disabled={!isSuperUser}
                                      checked={selectedPanel[item.key] !== false}
                                      onChange={(e) =>
                                        setNewUser({
                                          ...newUser,
                                          allowedPanelSectionsByEvent: {
                                            ...(newUser.allowedPanelSectionsByEvent || {}),
                                            [ev.id]: { ...selectedPanel, [item.key]: e.target.checked },
                                          },
                                        })
                                      }
                                    />
                                    <span className="leading-tight">{label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </details>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isSuperUser && newUser.role !== 'SuperUsuario' ? (
        <div className={`${sectionCls} bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border-slate-800 text-white`}>
          <p className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
            <Lock size={15} className="text-indigo-400 shrink-0" />
            Permisos avanzados (SuperUsuario)
          </p>
          <AdvancedUserPermissionsPanel value={newUser} onChange={(patch) => setNewUser((prev) => ({ ...prev, ...patch }))} />
        </div>
      ) : null}

      {hasAdminRights && !isSuperUser && newUser.role === 'Editor' ? (
        <div className={`${sectionCls} bg-gradient-to-br from-slate-900 via-slate-850 to-amber-950 border-slate-800 text-white`}>
          <p className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
            <Scissors size={15} className="text-amber-400 shrink-0" />
            Permisos de registro (Editor)
          </p>
          <AdvancedUserPermissionsPanel
            value={newUser}
            delegateMode="roster-only"
            onChange={(patch) => setNewUser((prev) => ({ ...prev, ...patch }))}
          />
        </div>
      ) : null}
    </div>
  );
}
