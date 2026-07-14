import MobileCompactToolbar, { MobileCompactToolbarPanel } from '../../components/mobile/MobileCompactToolbar.jsx';
import MobileMenuSection from '../../components/mobile/MobileMenuSection.jsx';
import MobileSearchField from '../../components/mobile/MobileSearchField.jsx';
import NewUserAccountFormFields from '../../components/NewUserAccountFormFields.jsx';
import UserAccountModalShell from '../../components/UserAccountModalShell.jsx';
import { DEFAULT_PRIVACY_NOTICE_BODY } from '../../privacyNotice.js';
import { viewerCanSeeTargetPermissionMeta } from '../../rbac/roles.js';
import UserAccessScopePanel from '../../rbac/UserAccessScopePanel.jsx';
import UserPermissionBadges from '../../rbac/UserPermissionBadges.jsx';
import { USERS_PANEL_SEARCH_FIELD_ID } from '../../ui/rosterFilterField.js';
import { uiMobileMenu, uiUserAccountForm, uiUserRowActions } from '../../ui/uiFormatClasses.js';
import UserSessionSummaryCell from '../../UserSessionSummaryCell.jsx';
import { ChevronRight, Edit3, LogOut, PanelLeft, Plus, QrCode, RotateCcw, Shield, ShieldAlert, Trash2 } from 'lucide-react';
import React from 'react';
import { useEventHub } from '../../app/providers/EventHubProvider.jsx';

export default function UsersPageContent() {
  const {
    DEFAULT_PANEL_NAV,
    EDITOR_LECTOR_PANEL_DEFAULT,
    PANEL_NAV_SIDEBAR_ITEMS,
    allKnownLocationNames,
    anonymousAuthPanel,
    applyLandingSedeToNewUserState,
    btnPrimary,
    btnSecondary,
    currentUser,
    deleteOneAnonymousAuthUser,
    deleteUserConfirmModal,
    events,
    fieldStack,
    formatAnonymousAuthAgeMinutes,
    getEditableScopedEvents,
    globalConfig,
    handleAddUser,
    handleDeleteUser,
    hasAdminRights,
    inputClasses,
    isEditorOrLector,
    isSuperUser,
    labelClasses,
    mergedPrivacyNotice,
    newUser,
    newUserModalOpen,
    openUserEditorFromListUser,
    panelNavMerged,
    pruneEventScopedAccessMap,
    purgeAllAnonymousAuthUsers,
    refreshAnonymousAuthUsers,
    revokeAllSessionsForOtherUser,
    revokeSessionsConfirmModal,
    setDeleteUserConfirmModal,
    setNewUser,
    setNewUserModalOpen,
    setPanelNavForm,
    setPanelNavModalOpen,
    setPrivacyNoticeForm,
    setPrivacyNoticeModalOpen,
    setRevokeSessionsConfirmModal,
    setUserAccessScopeOpenId,
    setUsersMobileMenuOpen,
    setUsersPanelSearch,
    sortedEvents,
    userAccessScopeOpenId,
    users,
    usersFilteredInPanel,
    usersMobileMenuOpen,
    usersPanelSearch,
    usersVisibleInPanel
  } = useEventHub();

return (
<>
    <div className="max-w-6xl mx-auto px-3 py-2 sm:px-6 sm:py-3 space-y-3">
      {hasAdminRights ? (
        <>
          <div className="hidden md:block">
            <button
              type="button"
              onClick={() => setNewUserModalOpen(true)}
              className={uiUserAccountForm.createTriggerBtn}
            >
              <Plus size={14} />
              Crear Nuevo Usuario
            </button>
          </div>

          <div className="md:hidden bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800/80 overflow-hidden">
            <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <span className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-955/50 text-indigo-500 dark:text-indigo-400">
                  <Plus size={14} />
                </span>
                Crear Nuevo Usuario
              </h3>
            </div>
            <form id="new-user-form-mobile" onSubmit={handleAddUser} className="p-2 space-y-2.5">
              <NewUserAccountFormFields
                variant="mobile"
                newUser={newUser}
                setNewUser={setNewUser}
                isSuperUser={isSuperUser}
                hasAdminRights={hasAdminRights}
                sortedEvents={sortedEvents}
                allKnownLocationNames={allKnownLocationNames}
                getEditableScopedEvents={getEditableScopedEvents}
                applyLandingSedeToNewUserState={applyLandingSedeToNewUserState}
                pruneEventScopedAccessMap={pruneEventScopedAccessMap}
                EDITOR_LECTOR_PANEL_DEFAULT={EDITOR_LECTOR_PANEL_DEFAULT}
                DEFAULT_PANEL_NAV={DEFAULT_PANEL_NAV}
                PANEL_NAV_SIDEBAR_ITEMS={PANEL_NAV_SIDEBAR_ITEMS}
                fieldStack={fieldStack}
                inputClasses={inputClasses}
                labelClasses={labelClasses}
              />
              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button type="submit" className={`${btnPrimary} py-1 px-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold shadow-md active:scale-95 transition-all flex items-center gap-1.5 text-xs`}>
                  <Plus size={14} /> Crear Usuario
                </button>
              </div>
            </form>
          </div>

          <UserAccountModalShell
            open={newUserModalOpen}
            onClose={() => setNewUserModalOpen(false)}
            onSubmit={handleAddUser}
            formId="new-user-form-desktop"
            title="Crear nuevo usuario"
            subtitle="Alta de cuenta con rol, accesos por evento/sede y permisos."
            headerIcon={
              <span className={uiUserAccountForm.headerIconWrap}>
                <Plus size={20} />
              </span>
            }
            submitLabel="Crear usuario"
          >
            <NewUserAccountFormFields
              variant="desktop"
              newUser={newUser}
              setNewUser={setNewUser}
              isSuperUser={isSuperUser}
              hasAdminRights={hasAdminRights}
              sortedEvents={sortedEvents}
              allKnownLocationNames={allKnownLocationNames}
              getEditableScopedEvents={getEditableScopedEvents}
              applyLandingSedeToNewUserState={applyLandingSedeToNewUserState}
              pruneEventScopedAccessMap={pruneEventScopedAccessMap}
              EDITOR_LECTOR_PANEL_DEFAULT={EDITOR_LECTOR_PANEL_DEFAULT}
              DEFAULT_PANEL_NAV={DEFAULT_PANEL_NAV}
              PANEL_NAV_SIDEBAR_ITEMS={PANEL_NAV_SIDEBAR_ITEMS}
              fieldStack={fieldStack}
              inputClasses={inputClasses}
              labelClasses={labelClasses}
            />
          </UserAccountModalShell>
        </>
      ) : isEditorOrLector ? null : (
        <div className="p-3 bg-amber-50 dark:bg-amber-955/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2 shadow-sm">
          <ShieldAlert size={18} className="shrink-0 text-amber-500 mt-0.5" />
          <div className="space-y-0.5">
            <strong className="block font-extrabold text-xs uppercase tracking-wide">Acceso Restringido</strong>
            <p>Solo usuarios con rol de Administrador o SuperUsuario pueden crear o gestionar cuentas.</p>
          </div>
        </div>
      )}

      {/* Listado de Cuentas Registradas */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-200/60 dark:border-slate-800/80 overflow-hidden transition-all duration-300">
        <div className="px-3 py-2 sm:px-4 sm:py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              {hasAdminRights ? 'Cuentas Registradas' : 'Tu Perfil'}
            </h3>
            {isSuperUser && (
              <button
                type="button"
                onClick={() => {
                  setPanelNavForm({ ...panelNavMerged });
                  setPanelNavModalOpen(true);
                }}
                className="py-1 px-2.5 rounded-lg bg-violet-650 hover:bg-violet-750 dark:bg-violet-600 dark:hover:bg-violet-700 text-white font-bold text-[10px] uppercase tracking-wide shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                title="Configurar secciones visibles en el menú lateral para Editor y Lector"
              >
                <PanelLeft size={12} />
                Menú lateral (Editor/Lector)
              </button>
            )}
            {isSuperUser && (
              <button
                type="button"
                onClick={() => {
                  setPrivacyNoticeForm({ ...mergedPrivacyNotice, bodyMarkdown: mergedPrivacyNotice.bodyMarkdown || DEFAULT_PRIVACY_NOTICE_BODY });
                  setPrivacyNoticeModalOpen(true);
                }}
                className="py-1 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-wide shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                title="Editar aviso de privacidad integral (LFPDPPP)"
              >
                <Shield size={12} />
                Aviso de privacidad
              </button>
            )}
          </div>
          <span className="text-[10px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-955/60 border border-indigo-100/50 dark:border-indigo-900/30 px-2 py-0.5 rounded-full tabular-nums">
            {usersVisibleInPanel.length} usuario(s)
          </span>
        </div>

        <MobileCompactToolbar
          searchSlot={(
            <MobileSearchField
              id={USERS_PANEL_SEARCH_FIELD_ID}
              placeholder="Buscar usuario, rol o correo…"
              value={usersPanelSearch}
              onChange={(e) => setUsersPanelSearch(e.target.value)}
            />
          )}
          metaSlot={(
            <span className={uiMobileMenu.metaRight} title="Coincidencias con la búsqueda">
              {usersFilteredInPanel.length}
            </span>
          )}
          optionsOpen={usersMobileMenuOpen}
          onToggleOptions={() => setUsersMobileMenuOpen((v) => !v)}
          hasActiveFilters={!!usersPanelSearch.trim()}
          optionsTitle={isSuperUser ? 'Acciones de SuperUsuario' : 'Opciones'}
        />

        <MobileCompactToolbarPanel open={usersMobileMenuOpen}>
          {isSuperUser ? (
            <MobileMenuSection label="SuperUsuario" tone="violet" grid2>
              <button
                type="button"
                onClick={() => {
                  setPanelNavForm({ ...panelNavMerged });
                  setPanelNavModalOpen(true);
                  setUsersMobileMenuOpen(false);
                }}
                className={`py-1.5 px-2.5 rounded-lg bg-violet-650 hover:bg-violet-750 dark:bg-violet-600 dark:hover:bg-violet-700 text-white font-bold text-[10px] uppercase tracking-wide shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 ${uiMobileMenu.btnCompact}`}
                title="Configurar secciones visibles en el menú lateral para Editor y Lector"
              >
                <PanelLeft size={12} />
                Menú lateral
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrivacyNoticeForm({ ...mergedPrivacyNotice, bodyMarkdown: mergedPrivacyNotice.bodyMarkdown || DEFAULT_PRIVACY_NOTICE_BODY });
                  setPrivacyNoticeModalOpen(true);
                  setUsersMobileMenuOpen(false);
                }}
                className={`py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-wide shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 ${uiMobileMenu.btnCompact}`}
                title="Editar aviso de privacidad integral (LFPDPPP)"
              >
                <Shield size={12} />
                Aviso de privacidad
              </button>
            </MobileMenuSection>
          ) : null}
          {usersPanelSearch.trim() ? (
            <MobileMenuSection label="Búsqueda" tone="sky">
              <button
                type="button"
                onClick={() => setUsersPanelSearch('')}
                className={`w-full px-3 py-2 rounded-lg text-[10px] font-black bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 ${uiMobileMenu.btnCompact}`}
              >
                Limpiar búsqueda
              </button>
            </MobileMenuSection>
          ) : null}
        </MobileCompactToolbarPanel>

        {/* Vista Móvil Enriquecida */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {usersFilteredInPanel.map((u) => {
            const canShowScope = viewerCanSeeTargetPermissionMeta(currentUser, u);
            const scopeOpen = userAccessScopeOpenId === u.id;
            const toggleUserScopeRow = () =>
              setUserAccessScopeOpenId((prev) => (prev === u.id ? null : u.id));
            return (
              <React.Fragment key={u.id}>
                <div className={`px-3 py-2 transition-all duration-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 ${scopeOpen ? 'bg-indigo-50/30 dark:bg-indigo-955/10' : ''}`}>
                  <div className="flex gap-3 items-start justify-between">
                    <div
                      className={`min-w-0 flex-1 space-y-2 ${canShowScope ? 'cursor-pointer' : ''}`}
                      onClick={canShowScope ? toggleUserScopeRow : undefined}
                      onKeyDown={
                        canShowScope
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleUserScopeRow();
                              }
                            }
                          : undefined
                      }
                      role={canShowScope ? 'button' : undefined}
                      tabIndex={canShowScope ? 0 : undefined}
                      aria-expanded={canShowScope ? scopeOpen : undefined}
                      title={canShowScope ? 'Ver sedes y menú por evento (tocar la fila)' : undefined}
                    >
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Usuario</p>
                        <div className="flex items-center gap-2 min-w-0">
                          {canShowScope ? (
                            <ChevronRight
                              size={14}
                              className={`text-slate-400 transition-transform mt-0.5 shrink-0 ${scopeOpen ? 'rotate-90 text-indigo-500' : ''}`}
                              aria-hidden
                            />
                          ) : null}
                          <div
                            className="relative shrink-0 w-2.5 h-2.5 mt-0.5"
                            title={u.isOnline ? 'En línea' : 'Desconectado'}
                          >
                            <span className={`absolute inset-0 rounded-full ${u.isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                          </div>
                          <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm truncate">{u.username}</span>
                          {currentUser.id === u.id ? (
                            <span className="text-[8px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-955 border border-indigo-100/50 dark:border-indigo-900/50 px-1.5 py-0.5 rounded-md font-black shrink-0 uppercase tracking-wider">
                              Tú
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Rol</p>
                        <div className="flex flex-wrap items-center gap-1">
                          <span
                            className={`inline-block text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider ${
                              u.role === 'SuperUsuario'
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-sm'
                                : u.role === 'Administrador'
                                  ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {u.role}
                          </span>
                        </div>
                      </div>
                      {isSuperUser ? (
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                            Sesión / cliente
                          </p>
                          <div className="min-w-0 max-w-full">
                            <UserSessionSummaryCell user={u} />
                          </div>
                        </div>
                      ) : null}
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Permisos / etiquetas</p>
                        <UserPermissionBadges viewer={currentUser} targetUser={u} globalPanelNav={panelNavMerged} events={events} globalConfig={globalConfig} />
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
                      <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 text-right leading-none">Acciones</p>
                      <div className={uiUserRowActions.group}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openUserEditorFromListUser(u);
                        }}
                        disabled={!hasAdminRights && String(currentUser.id) !== String(u.id)}
                        className={
                          !hasAdminRights && String(currentUser.id) !== String(u.id)
                            ? uiUserRowActions.disabled
                            : uiUserRowActions.edit
                        }
                        title="Editar"
                      >
                        <Edit3 size={14} />
                      </button>
                      {isSuperUser && String(currentUser.id) !== String(u.id) ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRevokeSessionsConfirmModal({
                              isOpen: true,
                              id: u.id,
                              username: u.username,
                            });
                          }}
                          className={uiUserRowActions.revokeSessions}
                          title="Cerrar todas las sesiones activas"
                        >
                          <LogOut size={14} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteUserConfirmModal({ isOpen: true, id: u.id, username: u.username });
                        }}
                        disabled={currentUser.id === u.id || !hasAdminRights}
                        className={
                          currentUser.id === u.id || !hasAdminRights
                            ? uiUserRowActions.disabled
                            : uiUserRowActions.delete
                        }
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                      </div>
                    </div>
                  </div>
                </div>
                {scopeOpen && canShowScope ? (
                  <div className="bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 p-2">
                    <UserAccessScopePanel
                      open
                      userId={u.id}
                      listUser={u}
                      events={sortedEvents}
                      globalPanelNav={panelNavMerged}
                      globalConfig={globalConfig}
                      showFullFieldAudit={isSuperUser}
                      viewer={currentUser}
                    />
                  </div>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>

        {/* Tabla Desktop de Alta Gama */}
        <div className="hidden md:block overflow-x-auto">
          <table className={`w-full text-left border-collapse ${isSuperUser ? 'min-w-[960px]' : 'min-w-[640px]'}`}>
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-widest font-black border-b border-slate-100 dark:border-slate-800">
                <th className="px-3 py-1.5 sm:px-4 sm:py-2">Usuario</th>
                <th className="px-3 py-1.5 sm:px-4 sm:py-2">Rol</th>
                {isSuperUser ? (
                  <th className="px-3 py-1.5 sm:px-4 sm:py-2">Sesión / cliente</th>
                ) : null}
                <th className="px-3 py-1.5 sm:px-4 sm:py-2">Permisos / etiquetas</th>
                <th className="px-3 py-1.5 sm:px-4 sm:py-2 text-center w-32">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {usersVisibleInPanel.map((u) => {
                const canShowScope = viewerCanSeeTargetPermissionMeta(currentUser, u);
                const scopeOpen = userAccessScopeOpenId === u.id;
                const toggleUserScopeRow = () =>
                  setUserAccessScopeOpenId((prev) => (prev === u.id ? null : u.id));
                return (
                  <React.Fragment key={u.id}>
                    <tr
                      className={`transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30 ${canShowScope ? 'cursor-pointer' : ''} ${scopeOpen ? 'bg-indigo-50/20 dark:bg-indigo-955/10' : ''}`}
                      onClick={canShowScope ? toggleUserScopeRow : undefined}
                      onKeyDown={
                        canShowScope
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleUserScopeRow();
                              }
                            }
                          : undefined
                      }
                      tabIndex={canShowScope ? 0 : undefined}
                      aria-expanded={canShowScope ? scopeOpen : undefined}
                      title={canShowScope ? 'Ver sedes y menú por evento (clic en la fila)' : undefined}
                    >
                      <td className="px-3 py-1 sm:px-4 sm:py-1.5 align-middle">
                        {canShowScope ? (
                          <div className="flex items-center gap-2 min-w-0 max-w-md text-left">
                            <ChevronRight
                              size={14}
                              className={`text-slate-400 shrink-0 transition-transform ${scopeOpen ? 'rotate-90 text-indigo-500' : ''}`}
                              aria-hidden
                            />
                            <div className="relative shrink-0 w-2.5 h-2.5">
                              <span className={`absolute inset-0 rounded-full ${u.isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                            </div>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate">{u.username}</span>
                            {currentUser.id === u.id && (
                              <span className="text-[8px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-955 border border-indigo-100/50 dark:border-indigo-900/50 px-2 py-0.5 rounded-md font-black uppercase tracking-wider">Tú</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="relative shrink-0 w-2.5 h-2.5">
                              <span className={`absolute inset-0 rounded-full ${u.isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                            </div>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200">{u.username}</span>
                            {currentUser.id === u.id && (
                              <span className="text-[8px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-955 border border-indigo-100/50 dark:border-indigo-900/50 px-2 py-0.5 rounded-md font-black uppercase tracking-wider">Tú</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-1 sm:px-4 sm:py-1.5 align-middle">
                        <span
                          className={`inline-block text-[9px] px-2.5 py-0.5 rounded-md font-black uppercase tracking-wider ${
                            u.role === 'SuperUsuario'
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-sm'
                              : u.role === 'Administrador'
                                ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      {isSuperUser ? (
                        <td className="px-3 py-1 sm:px-4 sm:py-1.5 align-middle">
                          <UserSessionSummaryCell user={u} />
                        </td>
                      ) : null}
                      <td className="px-3 py-1 sm:px-4 sm:py-1.5 align-middle">
                        <UserPermissionBadges viewer={currentUser} targetUser={u} globalPanelNav={panelNavMerged} events={events} globalConfig={globalConfig} />
                      </td>
                      <td
                        className="px-3 py-1 sm:px-4 sm:py-1.5 text-center align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className={uiUserRowActions.groupTable}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openUserEditorFromListUser(u);
                            }}
                            disabled={!hasAdminRights && String(currentUser.id) !== String(u.id)}
                            className={
                              !hasAdminRights && String(currentUser.id) !== String(u.id)
                                ? uiUserRowActions.disabled
                                : uiUserRowActions.edit
                            }
                            title="Editar"
                          >
                            <Edit3 size={15} />
                          </button>
                          {isSuperUser && String(currentUser.id) !== String(u.id) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRevokeSessionsConfirmModal({
                                  isOpen: true,
                                  id: u.id,
                                  username: u.username,
                                });
                              }}
                              className={uiUserRowActions.revokeSessions}
                              title="Cerrar todas las sesiones activas"
                            >
                              <LogOut size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteUserConfirmModal({ isOpen: true, id: u.id, username: u.username });
                            }}
                            disabled={currentUser.id === u.id || !hasAdminRights}
                            className={
                              currentUser.id === u.id || !hasAdminRights
                                ? uiUserRowActions.disabled
                                : uiUserRowActions.delete
                            }
                            title="Eliminar"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {scopeOpen && canShowScope && (
                      <tr className="bg-slate-50/50 dark:bg-slate-900/40">
                        <td colSpan={isSuperUser ? 5 : 4} className="px-0 py-0 border-t border-slate-100 dark:border-slate-800">
                          <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20">
                            <UserAccessScopePanel
                              open
                              userId={u.id}
                              listUser={u}
                              events={sortedEvents}
                              globalPanelNav={panelNavMerged}
                              globalConfig={globalConfig}
                              showFullFieldAudit={isSuperUser}
                              viewer={currentUser}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isSuperUser ? (
        /* Cuentas Anónimas / Centro de Limpieza */
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-200/60 dark:border-slate-800/80 overflow-hidden transition-all duration-300">
          <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 dark:text-indigo-400">
                  <QrCode size={16} />
                </span>
                Cuentas Anónimas (Registro Público / QR)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-3xl leading-relaxed">
                Sesiones temporales de Firebase al abrir enlaces públicos. Si no se cerraron bien, quedan atorradas en
                Authentication. La limpieza automática corre cada día a las 12:00 AM (hora CDMX). Aquí puedes revisarlas y
                borrarlas manualmente.
              </p>
              {anonymousAuthPanel.lastPurgeResult &&
              typeof anonymousAuthPanel.lastPurgeResult.deleted === 'number' ? (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-2 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-100/50 dark:border-emerald-900/30 w-fit">
                  Última limpieza manual: {anonymousAuthPanel.lastPurgeResult.deleted} eliminada(s).
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-center">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50 tabular-nums">
                {anonymousAuthPanel.loading
                  ? 'Cargando...'
                  : `${anonymousAuthPanel.users.length} pendiente(s)`}
              </span>
              <button
                type="button"
                onClick={() => void refreshAnonymousAuthUsers()}
                disabled={anonymousAuthPanel.loading || anonymousAuthPanel.busy || anonymousAuthPanel.purgeAllBusy}
                className={`${btnSecondary} !py-2 !px-3.5 inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold`}
                title="Volver a cargar la lista desde Firebase"
              >
                <RotateCcw size={14} className={anonymousAuthPanel.loading ? 'animate-spin' : ''} />
                Actualizar
              </button>
              <button
                type="button"
                onClick={() => void purgeAllAnonymousAuthUsers()}
                disabled={
                  anonymousAuthPanel.loading ||
                  anonymousAuthPanel.busy ||
                  anonymousAuthPanel.purgeAllBusy ||
                  anonymousAuthPanel.users.length === 0
                }
                className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center gap-1.5 active:scale-95"
                title="Eliminar todas las cuentas anónimas huérfanas"
              >
                <Trash2 size={14} />
                {anonymousAuthPanel.purgeAllBusy ? 'Borrando…' : 'Borrar todas'}
              </button>
            </div>
          </div>
          <div className="p-4 sm:p-6 bg-slate-50/20 dark:bg-slate-900/20">
            {anonymousAuthPanel.loading ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic py-4 text-center">Cargando cuentas anónimas…</p>
            ) : anonymousAuthPanel.users.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center italic">
                No hay cuentas anónimas huérfanas en Firebase Authentication.
              </p>
            ) : (
              <>
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {anonymousAuthPanel.users.map((row) => {
                    const created = row.createdAt ? new Date(row.createdAt) : null;
                    const createdLabel =
                      created && !Number.isNaN(created.getTime())
                        ? created.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
                        : '—';
                    const isDeleting = anonymousAuthPanel.deletingUid === row.uid;
                    return (
                      <div key={row.uid} className="py-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">UID</p>
                            <p className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all leading-snug bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800">{row.uid}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void deleteOneAnonymousAuthUser(row.uid)}
                            disabled={
                              anonymousAuthPanel.busy || anonymousAuthPanel.purgeAllBusy || isDeleting
                            }
                            className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 hover:shadow-sm transition-all"
                            title="Eliminar esta cuenta anónima"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Creada</p>
                            <p className="font-extrabold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-800">{createdLabel}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Antigüedad</p>
                            <p className="font-extrabold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                              {formatAnonymousAuthAgeMinutes(row.ageMinutes)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[560px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-widest font-black border-b border-slate-100 dark:border-slate-800">
                        <th className="px-6 py-3.5">UID</th>
                        <th className="px-6 py-3.5">Creada</th>
                        <th className="px-6 py-3.5">Antigüedad</th>
                        <th className="px-6 py-3.5 text-center w-32">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {anonymousAuthPanel.users.map((row) => {
                        const created = row.createdAt ? new Date(row.createdAt) : null;
                        const createdLabel =
                          created && !Number.isNaN(created.getTime())
                            ? created.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
                            : '—';
                        const isDeleting = anonymousAuthPanel.deletingUid === row.uid;
                        return (
                          <tr key={row.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-xs text-slate-700 dark:text-slate-300 transition-colors">
                            <td className="px-6 py-4.5 font-mono text-[11px] max-w-[14rem] truncate" title={row.uid}>
                              {row.uid}
                            </td>
                            <td className="px-6 py-4.5 whitespace-nowrap font-semibold">{createdLabel}</td>
                            <td className="px-6 py-4.5 whitespace-nowrap font-extrabold text-slate-900 dark:text-slate-100">
                              {formatAnonymousAuthAgeMinutes(row.ageMinutes)}
                            </td>
                            <td className="px-6 py-4.5 text-center">
                              <button
                                type="button"
                                onClick={() => void deleteOneAnonymousAuthUser(row.uid)}
                                disabled={
                                  anonymousAuthPanel.busy || anonymousAuthPanel.purgeAllBusy || isDeleting
                                }
                                className={`p-1.5 rounded-lg transition-all ${
                                  anonymousAuthPanel.busy || anonymousAuthPanel.purgeAllBusy || isDeleting
                                    ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                }`}
                                title="Eliminar esta cuenta anónima"
                              >
                                <Trash2 size={16} />
                              </button>
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
        </div>
      ) : null}
    </div>

    {revokeSessionsConfirmModal.isOpen && (
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[250] p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setRevokeSessionsConfirmModal({ isOpen: false, id: null, username: '' });
          }
        }}
      >
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 border border-slate-200/50 dark:border-slate-800 animate-in zoom-in-95 duration-200 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <LogOut size={20} />
            </span>
            <h3 className="text-lg font-black text-slate-950 dark:text-white uppercase tracking-wider">
              Cerrar sesiones
            </h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            ¿Cerrar todas las sesiones activas de{' '}
            <strong className="text-slate-900 dark:text-white font-extrabold">
              {revokeSessionsConfirmModal.username}
            </strong>
            ? Deberá volver a iniciar sesión en cada dispositivo o pestaña.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-all text-sm active:scale-95"
              onClick={() => setRevokeSessionsConfirmModal({ isOpen: false, id: null, username: '' })}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-sm shadow-amber-500/15"
              onClick={() => {
                const target = users.find((x) => String(x.id) === String(revokeSessionsConfirmModal.id));
                setRevokeSessionsConfirmModal({ isOpen: false, id: null, username: '' });
                if (target) void revokeAllSessionsForOtherUser(target);
              }}
            >
              Cerrar sesiones
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modal de Confirmación de Borrado */}
    {deleteUserConfirmModal.isOpen && (
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[250] p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) setDeleteUserConfirmModal({ isOpen: false, id: null, username: '' });
        }}
      >
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 border border-slate-200/50 dark:border-slate-800 animate-in zoom-in-95 duration-200 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <Trash2 size={20} />
            </span>
            <h3 className="text-lg font-black text-slate-950 dark:text-white uppercase tracking-wider">Eliminar Usuario</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            ¿Seguro que deseas eliminar al usuario{' '}
            <strong className="text-slate-900 dark:text-white font-extrabold">{deleteUserConfirmModal.username}</strong>?
            Esta acción no se puede deshacer. El perfil desaparecerá del panel; la cuenta en Firebase Authentication puede
            seguir existiendo hasta que un administrador la elimine en la consola.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-all text-sm active:scale-95 flex items-center justify-center gap-2"
              onClick={() => setDeleteUserConfirmModal({ isOpen: false, id: null, username: '' })}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="flex-1 py-3 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-sm flex items-center justify-center gap-2 shadow-red-500/10"
              onClick={() => handleDeleteUser(deleteUserConfirmModal.id, deleteUserConfirmModal.username)}
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
);
}
