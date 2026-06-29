import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const appPath = path.join(root, 'src', 'App.jsx');
const outPath = path.join(root, 'src', 'screens', 'EventHubScreen.jsx');

const app = fs.readFileSync(appPath, 'utf8');
const lines = app.split(/\r?\n/);
const start = 10213;
const end = 10874;
const body = lines.slice(start - 1, end).join('\n');

const header = `import React from 'react';
import {
  Bug, ArrowLeft, LayoutDashboard, UserCog, Archive, History, LogOut, UserCircle,
  Search, Trash2, CalendarRange, Edit3, Plus, GripVertical, ShieldAlert, Lock, Eye, EyeOff,
  Undo, Database,
} from 'lucide-react';
import { useAppShellBindings } from '../shellRuntime.js';
import { EVENT_TYPES, SI_LABEL } from '../appConstants.js';

export default function EventHubScreen() {
  const {
    debugToast, navHistory, goBack, systemView, currentUser, superSessionCount, isSuperUser,
    globalConfig, toggleDebugMode, goTo, hasAdminRights, handleLogout, renderUsers, renderLogs,
    archivedParticipantsForView, archivedParticipantsArchiveViewList, archiveViewSearch,
    setArchiveViewSearch, archiveViewSort, setArchiveViewSort, events,
    openPermanentDeleteArchivedParticipantConfirm, visibleEvents, getPricingFromSnapshot,
    draggedEventId, setDraggedEventId, handleDragOver, handleDrop, resolvePreferredLandingTab,
    formatDisplayDate, addLog, updateDoc, getDocRef, setRenameModal, setDeleteEventModal,
    deleteEventModal, confirmDeleteEvent, renameModal, handleRenameEvent, newEventData,
    setNewEventData, isAddEventModalOpen, setIsAddEventModalOpen, handleCreateEvent,
    btnPrimary, btnSecondary, inputClasses, labelClasses, restoreModal, confirmRestore,
    renderRegistryConfirmModal, editorRegFieldsModalEl, panelNavModalEl, editingUser,
    setEditingUser, handleUpdateUser, users, sortedEvents, allKnownLocationNames,
    editingUserPlainPwdVisible, setEditingUserPlainPwdVisible, showToast,
  } = useAppShellBindings();
  return (
`;

const footer = `
  );
}
`;

fs.writeFileSync(outPath, header + body + footer, 'utf8');
console.log('wrote', outPath, 'bytes', (header + body + footer).length);
