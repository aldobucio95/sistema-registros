import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const appPath = path.join(root, 'src', 'App.jsx');
const outDir = path.join(root, 'src', 'features', 'registryEdit');
const outPath = path.join(outDir, 'EditRegistryModalFormFields.jsx');

const lines = fs.readFileSync(appPath, 'utf8').split(/\r?\n/);
const fnStart = lines.findIndex((l) => l.includes('const renderEditRegistryModalFormFields = (opts = {}) => {'));
if (fnStart < 0) throw new Error('function start not found');
let depth = 0;
let fnEnd = -1;
for (let i = fnStart; i < lines.length; i++) {
  const line = lines[i];
  for (const ch of line) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
  }
  if (i > fnStart && depth === 0) {
    fnEnd = i;
    break;
  }
}
if (fnEnd < 0) throw new Error('function end not found');

const fnLines = lines.slice(fnStart + 1, fnEnd);
const bodyStart = fnLines.findIndex((l) => l.includes('if (!editRegistryModal.data) return null;'));
if (bodyStart < 0) throw new Error('body start not found');
const body = fnLines.slice(bodyStart).join('\n');

const header = `import React from 'react';
import {
  CheckCircle2, ChevronDown, ChevronUp, Church, GraduationCap, Lock, UserPlus, Users,
} from 'lucide-react';
import { getPersonCost, generateVnpPersonId } from '../../publicRegistrationLogic.js';
import {
  participantAgeBracketForResponsiva,
  registrationRequiresResponsivaStatus,
  responsivaStatusValidationLabel,
} from '../../responsivaSignLogic.js';
import {
  canShowPastorAttendance,
  canShowBautizosPastorAttendance,
} from '../../registrationFormEditorConfig.js';
import {
  normalizeBautizosAttendanceType,
  syncBautizosAttendanceServerFields,
  bautizosWillBeBaptizedFromAttendance,
  bautizosShowsServerProfileFields,
  bautizosShowsServerParticipation,
  buildBautizosExistingCompanionOptions,
} from '../../bautizosParty.js';
import { familyHasAnyCarTransport } from '../../bautizosCarMeta.js';
import {
  BautizosAttendanceTypeField,
  BautizosCompanionsField,
  BautizosServerParticipationFields,
} from '../../BautizosEventFormBlocks.jsx';
import { BautizosCarDataSection } from '../../BautizosCarDataSection.jsx';
import ServeAreaMultiSelect from '../../components/ServeAreaMultiSelect.jsx';
import PrivacyConsentBlock from '../../components/PrivacyConsentBlock.jsx';
import GenderSelectButtons from '../../components/GenderSelectButtons.jsx';
import SedeAutocompleteInput from '../../components/SedeAutocompleteInput.jsx';
import AllergyFormFields from '../../components/AllergyFormFields.jsx';
import DiseaseFormFields from '../../components/DiseaseFormFields.jsx';
import DisabilityFormFields from '../../components/DisabilityFormFields.jsx';
import SiNoFieldToggle from '../../components/SiNoFieldToggle.jsx';
import RegistryBirthDateField from '../../RegistryBirthDateField.jsx';
import { collectLocationSuggestionsFromRosterSources } from '../../locationFieldSuggestions.js';
import { locationPrefsKey } from '../../userListFiltersPrefs.js';
import { isPastorParticipant } from '../../pastorAttendance.js';
import {
  BLOOD_TYPE_UNSPECIFIED,
  BLOOD_TYPES_SELECT_OPTIONS,
} from '../../registrationFormShared.js';
import { uiFormChoiceBtn } from '../../ui/uiFormatClasses.js';
import { useWorkspaceShell } from '../../screens/eventWorkspace/WorkspaceShellContext.jsx';
import {
  fieldStack,
  getRequiredFieldClass,
  hasValidFullName,
  isValidPhone,
  calculateAgeFromBirthDate,
  resolveLlegaEnCarro,
  resolveRegresaEnCarro,
  CopyButton,
  getResponsivaCardUiState,
  RosterResponsivaWaButton,
  RosterResponsivaLocalButton,
  GENDERS,
  RESPONSIVA_STATUSES,
  DEFAULT_ALLERGY_OPTIONS,
  DEFAULT_SERVE_AREA_OPTIONS,
  isFreeAttendanceType,
  normalizeAttendanceSpecial,
  buildAttendanceSpecialFormOptions,
  parsePreferredServeArea,
  formatPreferredServeArea,
  findDiscountCampaignById,
  isValidDiscountCampaignRow,
  participantIsCancelled,
  participantIsArchived,
  SI,
  isSiValue,
  formatSiNo,
} from './editRegistryModalFormUtils.js';

export default function EditRegistryModalFormFields({ onCancel, compact: compactProp }) {
  const compact = compactProp === true;
__SHELL_DESTRUCTURE__
__FORM_BODY__
}
`;

const shellDestructure = `  const shell = useWorkspaceShell();
  const {
    editRegistryModal,
    setEditRegistryModal,
    currentUser,
    editorRegistrationFieldVis,
    hasAdminRights,
    currentEvent,
    data,
    waitlistData,
    cancelledData,
    globalConfig,
    allParticipants,
    isCampa,
    isBautizos,
    isGeneral,
    isDesayunoEvent,
    inputClasses,
    labelClasses,
    formatPhoneNumber,
    currentPricing,
    editPrivacyAck,
    setEditPrivacyAck,
    mergedPrivacyNotice,
    editRegDraftCarMeta,
    setEditRegDraftCarMeta,
    bautizosCarColorSuggestions,
    spouseLinkSearchEdit,
    setSpouseLinkSearchEdit,
    spouseLinkPickResultsEdit,
    editServedAreasDropdownOpen,
    setEditServedAreasDropdownOpen,
    editPreferredServeDropdownOpen,
    setEditPreferredServeDropdownOpen,
    ambosServeOptionLabelsEdit,
    handleNameInput,
    canQuickActionResponsivaDigital,
    canQuickActionResponsivaLocal,
    sendResponsivaSignLinkWhatsAppForPerson,
    markResponsivaLocalDelivery,
    responsivaLinkBusyId,
    responsivaLocalBusyId,
    isResponsivaEnabled,
    resolveRegisteredCost,
    getManualApplyCampaignOptions,
  } = shell;
`;

fs.mkdirSync(outDir, { recursive: true });
const out = header
  .replace('__SHELL_DESTRUCTURE__', shellDestructure)
  .replace('__FORM_BODY__', body);
fs.writeFileSync(outPath, out);
console.log('fn lines', fnStart + 1, '-', fnEnd + 1, 'body lines', body.split('\n').length, 'bytes', out.length);
