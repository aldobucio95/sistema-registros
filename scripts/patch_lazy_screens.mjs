import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, '..', 'src', 'App.jsx');

const lines = fs.readFileSync(appPath, 'utf8').split(/\r?\n/);

const loginReplacement = [
  '    return (',
  '      <Suspense fallback={<ScreenLoadingFallback title="Cargando inicio de sesión…" />}>',
  '        <LoginScreenLazy',
  '          debugToast={debugToast}',
  '          loginForm={loginForm}',
  '          setLoginForm={setLoginForm}',
  '          handleLogin={handleLogin}',
  '          loginBusy={loginBusy}',
  '          loginError={loginError}',
  '          showLoginPassword={showLoginPassword}',
  '          setShowLoginPassword={setShowLoginPassword}',
  '        />',
  '      </Suspense>',
  '    );',
];

// Remove login JSX: `return (` … `    );` antes del `  }` del if (!currentUser)
// (líneas 10134–10211 en App.jsx tras imports lazy)
const afterLogin = [...lines.slice(0, 10133), ...loginReplacement, ...lines.slice(10211)];

const hubReplacement = [
  '  if (currentUser && !selectedEventId) {',
  '    setAppShellBindings({',
  '      debugToast,',
  '      navHistory,',
  '      goBack,',
  '      systemView,',
  '      currentUser,',
  '      superSessionCount,',
  '      isSuperUser,',
  '      globalConfig,',
  '      toggleDebugMode,',
  '      goTo,',
  '      hasAdminRights,',
  '      handleLogout,',
  '      renderUsers,',
  '      renderLogs,',
  '      archivedParticipantsForView,',
  '      archivedParticipantsArchiveViewList,',
  '      archiveViewSearch,',
  '      setArchiveViewSearch,',
  '      archiveViewSort,',
  '      setArchiveViewSort,',
  '      events,',
  '      openPermanentDeleteArchivedParticipantConfirm,',
  '      visibleEvents,',
  '      getPricingFromSnapshot,',
  '      draggedEventId,',
  '      setDraggedEventId,',
  '      handleDragOver,',
  '      handleDrop,',
  '      resolvePreferredLandingTab,',
  '      formatDisplayDate,',
  '      addLog,',
  '      updateDoc,',
  '      getDocRef,',
  '      setRenameModal,',
  '      setDeleteEventModal,',
  '      deleteEventModal,',
  '      confirmDeleteEvent,',
  '      renameModal,',
  '      handleRenameEvent,',
  '      newEventData,',
  '      setNewEventData,',
  '      isAddEventModalOpen,',
  '      setIsAddEventModalOpen,',
  '      handleCreateEvent,',
  '      btnPrimary,',
  '      btnSecondary,',
  '      inputClasses,',
  '      labelClasses,',
  '      restoreModal,',
  '      confirmRestore,',
  '      renderRegistryConfirmModal,',
  '      editorRegFieldsModalEl,',
  '      panelNavModalEl,',
  '      editingUser,',
  '      setEditingUser,',
  '      handleUpdateUser,',
  '      users,',
  '      sortedEvents,',
  '      allKnownLocationNames,',
  '      editingUserPlainPwdVisible,',
  '      setEditingUserPlainPwdVisible,',
  '      showToast,',
  '    });',
  '    return (',
  '      <Suspense fallback={<ScreenLoadingFallback title="Cargando panel…" />}>',
  '        <EventHubScreenLazy />',
  '      </Suspense>',
  '    );',
  '  }',
];

const l2 = afterLogin;
const hubIfIdx = l2.findIndex((line) => line === '  if (currentUser && !selectedEventId) {');
if (hubIfIdx === -1) throw new Error('hub if not found');
const screen3Idx = l2.findIndex((line) => line.includes('// --- SCREEN 3: MAIN APP ---'));
if (screen3Idx === -1) throw new Error('SCREEN 3 marker not found');
let hubCloseIdx = screen3Idx - 1;
while (hubCloseIdx > hubIfIdx && l2[hubCloseIdx].trim() === '') hubCloseIdx--;
if (l2[hubCloseIdx] !== '  }') {
  throw new Error(`expected hub closing brace, got: ${JSON.stringify(l2[hubCloseIdx])}`);
}

const out = [...l2.slice(0, hubIfIdx), ...hubReplacement, ...l2.slice(hubCloseIdx + 1)];
fs.writeFileSync(appPath, out.join('\n'), 'utf8');
console.log('patched login + hub', { hubIfIdx: hubIfIdx + 1, hubCloseIdx: hubCloseIdx + 1 });
