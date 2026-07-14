import React from 'react';
import { Briefcase, Gift, Church, Users } from 'lucide-react';
import { resolveBautizosAttendanceChipKind, getBautizosAttendanceTypeLabel } from '../../bautizosParty.js';
import { uiBautizosAttendanceChip } from '../../ui/uiFormatClasses.js';

const BAUTIZOS_ATTENDANCE_CHIP_LABELS = {
  bautizado: 'Bautizado',
  asistente: 'Asistente',
  servidor: 'Servidor',
  empleado: 'Empleado',
  cortesia: 'Cortesía',
  pastor: 'Pastor',
  acompanante: 'Acompañante',
};

export default function BautizosAttendanceTypeChip({ person, isBautizos, isSubRegistration = false }) {
  if (!isBautizos || isSubRegistration) return null;
  const kind = resolveBautizosAttendanceChipKind(person);
  const chipClass = uiBautizosAttendanceChip[kind];
  if (!chipClass) return null;
  const label = BAUTIZOS_ATTENDANCE_CHIP_LABELS[kind] || kind;
  const Icon =
    kind === 'empleado'
      ? Briefcase
      : kind === 'cortesia'
        ? Gift
        : kind === 'bautizado' || kind === 'pastor'
          ? Church
          : Users;
  return (
    <span
      key={`bz-att-${kind}`}
      className={`${uiBautizosAttendanceChip.base} ${chipClass}`}
      title={getBautizosAttendanceTypeLabel(person)}
    >
      <Icon size={10} className="shrink-0 opacity-90" aria-hidden />
      {label}
    </span>
  );
}
