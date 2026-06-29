/**

 * Conteos de lista de espera compartidos entre dashboard (tabla Visualización de Datos Generales)

 * y barra lateral Estado Global del workspace.

 *

 * Bautizos: titulares en espera + todos sus acompañantes canónicos + acompañantes pendientes

 * en titulares activos (`expandBautizosWaitlistRegistryRows`).

 */

import {

  analyzeBautizosWaitlistExpandedAtLocation,

  countBautizosWaitlistExpandedPeople,

} from './rosterCanonicalCounts.js';



const PARTICIPANT_STATUS_ARCHIVED = 'archived';



function isSiValue(v) {

  const s = String(v ?? '').trim();

  if (s === 'Si' || s === 'Sí') return true;

  if (s.toLowerCase() === 'sí') return true;

  if (s.length === 2 && s[0] === 'S' && (s[1] === '?' || s[1] === '\uFFFD')) return true;

  return false;

}



function participantIsArchived(p) {

  return (p?.status || 'active') === PARTICIPANT_STATUS_ARCHIVED;

}



function participantIsWaitlistRow(p) {

  return (p?.status || 'active') === 'waitlist';

}



function participantIsActiveInEvent(p) {

  return !participantIsArchived(p);

}



/**

 * Registros titulares en columna «Espera» / cupo: `status === waitlist` y, en Campa,

 * activos con beca pendiente de aprobación.

 */

export function participantCountsForCupoWaitlistColumn(p, eventType) {

  if (participantIsArchived(p) || (p?.status || 'active') === 'cancelled') return false;

  const st = p?.status || 'active';

  if (st === 'waitlist') return true;

  if (

    eventType === 'Campa' &&

    st === 'active' &&

    isSiValue(p?.isScholarship) &&

    p.scholarshipPendingApproval === true

  ) {

    return true;

  }

  return false;

}



function emptySedeStats() {

  return {

    total: 0,

    titulars: 0,

    companionsAll: 0,

    companionsNonBaptized: 0,

    bautizados: 0,

    acompanantes: 0,

    asistentes: 0,

    servidores: 0,

    empleados: 0,

    cortesias: 0,

  };

}



function buildBautizosWaitlistGlobalLines(totals) {

  return [

    { label: 'Bautizados (espera)', count: totals.bautizados },

    { label: 'Acompañantes (espera)', count: totals.acompanantes },

    { label: 'Asistentes (espera)', count: totals.asistentes },

    { label: 'Servidores (espera)', count: totals.servidores },

    { label: 'Empleados (espera)', count: totals.empleados },

    { label: 'Cortesías (espera)', count: totals.cortesias },

  ];

}



export { countBautizosWaitlistExpandedPeople };



/**

 * @param {object[]} allParticipants

 * @param {{ id?: string, eventType?: string, locations?: string[] }} event

 * @param {string[]} locations — sedes a incluir (p. ej. `dashboardLocs` o `visibleLocations`)

 * @param {{ dashboardScope?: string, sectionWeight?: (p: object) => number }} [options]

 * @returns {{ bySede: Record<string, ReturnType<typeof emptySedeStats>>, global: { total: number, lines: Array<{ label: string, count: number }> } }}

 */

export function computeWaitlistCountsForEvent(allParticipants, event, locations, options = {}) {

  const { dashboardScope = 'all', sectionWeight = () => 1 } = options;

  const evId = String(event?.id || '');

  const et = String(event?.eventType || '').trim();

  const locationList = (locations || []).map((x) => String(x).trim()).filter(Boolean);

  const bySede = Object.fromEntries(locationList.map((loc) => [loc, emptySedeStats()]));



  if (!evId || !et || locationList.length === 0) {

    return { bySede, global: { total: 0, lines: [] } };

  }



  const participants = Array.isArray(allParticipants) ? allParticipants : [];



  if (et === 'Bautizos') {

    let globalBautizados = 0;

    let globalAcompanantes = 0;

    let globalAsistentes = 0;

    let globalServidores = 0;

    let globalEmpleados = 0;

    let globalCortesias = 0;



    for (const loc of locationList) {

      const analysis = analyzeBautizosWaitlistExpandedAtLocation(participants, event, loc, { dashboardScope });

      const waitlistTitulars = participants.filter(

        (p) =>

          String(p?.eventId || '') === evId &&

          participantIsActiveInEvent(p) &&

          participantIsWaitlistRow(p) &&

          String(p.location || '').trim() === String(loc).trim()

      );

      bySede[loc] = {

        total: analysis.total,

        titulars: waitlistTitulars.length,

        companionsAll: Math.max(0, analysis.total - waitlistTitulars.length),

        companionsNonBaptized: analysis.acompanantes,

        bautizados: analysis.bautizados,

        acompanantes: analysis.acompanantes,

        asistentes: analysis.asistentes,

        servidores: analysis.servidores,

        empleados: analysis.empleados,

        cortesias: analysis.cortesias,

      };

      globalBautizados += analysis.bautizados;

      globalAcompanantes += analysis.acompanantes;

      globalAsistentes += analysis.asistentes;

      globalServidores += analysis.servidores;

      globalEmpleados += analysis.empleados;

      globalCortesias += analysis.cortesias;

    }



    const globalTotal = locationList.reduce((sum, loc) => sum + (bySede[loc]?.total || 0), 0);

    return {

      bySede,

      global: {

        total: globalTotal,

        lines: buildBautizosWaitlistGlobalLines({

          bautizados: globalBautizados,

          acompanantes: globalAcompanantes,

          asistentes: globalAsistentes,

          servidores: globalServidores,

          empleados: globalEmpleados,

          cortesias: globalCortesias,

        }),

      },

    };

  }



  if (et === 'Campa') {

    let globalBecados = 0;

    for (const loc of locationList) {

      const locNorm = String(loc).trim();

      const rows = participants.filter(

        (p) =>

          String(p?.eventId || '') === evId &&

          participantIsActiveInEvent(p) &&

          String(p.location || '').trim() === locNorm &&

          participantCountsForCupoWaitlistColumn(p, et)

      );

      const total = rows.reduce((n, p) => n + sectionWeight(p), 0);

      let becados = 0;

      for (const p of rows) {

        if (isSiValue(p.isScholarship)) becados += sectionWeight(p);

      }

      bySede[loc] = { ...emptySedeStats(), total, titulars: total };

      globalBecados += becados;

    }

    const globalTotal = locationList.reduce((sum, loc) => sum + (bySede[loc]?.total || 0), 0);

    return {

      bySede,

      global: {

        total: globalTotal,

        lines: globalBecados > 0 ? [{ label: 'Becados (espera)', count: globalBecados }] : [],

      },

    };

  }



  for (const loc of locationList) {

    const locNorm = String(loc).trim();

    const total = participants.filter(

      (p) =>

        String(p?.eventId || '') === evId &&

        participantIsActiveInEvent(p) &&

        participantIsWaitlistRow(p) &&

        String(p.location || '').trim() === locNorm

    ).length;

    bySede[loc] = { ...emptySedeStats(), total, titulars: total };

  }

  const globalTotal = locationList.reduce((sum, loc) => sum + (bySede[loc]?.total || 0), 0);

  return { bySede, global: { total: globalTotal, lines: [] } };

}


