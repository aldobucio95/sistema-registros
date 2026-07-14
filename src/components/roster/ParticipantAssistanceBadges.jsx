import React from 'react';
import { GraduationCap, Briefcase, Gift, Church, Car } from 'lucide-react';
import { BAUTIZOS_ATTENDANCE, normalizeBautizosAttendanceType } from '../../bautizosParty.js';
import { eventTypeIsDesayuno } from '../../transportPlanningEligibility.js';
import {
  isSiValue,
  normalizeAttendanceSpecial,
  resolveLlegaEnCarro,
  ATTENDANCE_SPECIAL,
} from '../../features/registryEdit/editRegistryModalFormUtils.jsx';

/** Beca total/parcial, empleado y cortesía: visible en cualquier tipo de evento. */
export default function ParticipantAssistanceBadges({ person, isBautizos, currentEvent }) {
  const nodes = [];
  if (isSiValue(person?.isScholarship)) {
    const partial = person?.scholarshipType === 'partial';
    nodes.push(
      <span
        key="assistance-beca"
        className="bg-purple-100 text-purple-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase inline-flex items-center gap-1 border border-purple-200/80 dark:bg-purple-700 dark:text-white dark:border-purple-800"
      >
        <GraduationCap size={10} />
        {partial ? 'Beca parcial' : 'Beca total'}
      </span>
    );
  }
  const att = normalizeAttendanceSpecial(person);
  const bzAtt = isBautizos ? normalizeBautizosAttendanceType(person?.bautizosAttendanceType) : '';
  if (att === ATTENDANCE_SPECIAL.empleado && bzAtt !== BAUTIZOS_ATTENDANCE.empleado) {
    nodes.push(
      <span
        key="assistance-empleado"
        className="bg-teal-100 text-teal-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase inline-flex items-center gap-1 border border-teal-200"
      >
        <Briefcase size={10} /> Empleado
      </span>
    );
  }
  if (att === ATTENDANCE_SPECIAL.cortesia && bzAtt !== BAUTIZOS_ATTENDANCE.cortesia) {
    nodes.push(
      <span
        key="assistance-cortesia"
        className="bg-fuchsia-100 text-fuchsia-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase inline-flex items-center gap-1 border border-fuchsia-200"
      >
        <Gift size={10} /> Cortesía
      </span>
    );
  }
  if (att === ATTENDANCE_SPECIAL.pastor && bzAtt !== BAUTIZOS_ATTENDANCE.pastor) {
    nodes.push(
      <span
        key="assistance-pastor"
        className="bg-amber-100 text-amber-900 text-[8px] font-black px-1.5 py-0.5 rounded uppercase inline-flex items-center gap-1 border border-amber-200"
      >
        <Church size={10} /> Pastor
      </span>
    );
  }
  if (!eventTypeIsDesayuno(currentEvent?.eventType) && resolveLlegaEnCarro(person)) {
    nodes.push(
      <span
        key="transport-carro"
        className="chip-roster-carro bg-stone-100 text-stone-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase inline-flex items-center gap-0.5 border border-stone-200 h-5 leading-none dark:bg-stone-600 dark:text-white dark:border-stone-700"
        title="Llega en carro (vehículo propio)"
      >
        <Car size={10} className="shrink-0 opacity-90" aria-hidden />
        Carro
      </span>
    );
  }
  return nodes;
}
