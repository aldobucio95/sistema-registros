import { describe, expect, it } from 'vitest';
import {
  buildBautizosCompanionTransportLineLike,
  bautizosLineGoesByCar,
  expandBautizosGlobalRegistryRows,
} from '../bautizosParty.js';
import {
  countBautizosFilteredPeopleRows,
  participantMatchesBautizosTransportFilter,
  participantMatchesRegistrationStatusFilter,
  prepareBautizosRowsForRosterFilter,
} from '../rosterParticipantFilters.js';

describe('bautizosCompanionTransportLine', () => {
  const resolveLlegaEnCarro = (p) => bautizosLineGoesByCar(p);
  const testFilterParticipantRows = (rows, _preserveOrder, f, opts = {}) => {
    let data = [...(rows || [])];
    if (f.filterRegistrationStatus && f.filterRegistrationStatus !== 'all') {
      data = data.filter((p) => participantMatchesRegistrationStatusFilter(p, f.filterRegistrationStatus));
    }
    if (opts.expandBautizosCompanions) {
      data = prepareBautizosRowsForRosterFilter(data, f, { roster: rows });
    }
    const transportId =
      f.filterTransport && f.filterTransport !== 'all' ? f.filterTransport : f.filterBautizosTransport;
    if (transportId && transportId !== 'all') {
      data = data.filter((p) => participantMatchesBautizosTransportFilter(p, transportId, resolveLlegaEnCarro));
    }
    return data;
  };

  it('uses companion transport choice, not titular default', () => {
    const host = {
      id: 'h1',
      location: 'Norte',
      wantsBautizosTransport: 'Si',
      llegaEnCarro: 'No',
      travelFrom: 'Norte',
      travelTo: 'Norte',
    };
    const companion = {
      id: 'c1',
      name: 'Acomp Carro',
      wantsBautizosTransport: 'No',
      llegaEnCarro: 'Si',
      travelFrom: 'Norte',
      travelTo: 'Norte',
    };
    const line = buildBautizosCompanionTransportLineLike(host, companion);
    expect(participantMatchesBautizosTransportFilter(host, 'evento', () => false)).toBe(true);
    expect(participantMatchesBautizosTransportFilter(line, 'evento', () => false)).toBe(false);
    expect(bautizosLineGoesByCar(line)).toBe(true);
  });

  it('virtual companion rows carry own transport fields for roster filters', () => {
    const host = {
      id: 'h1',
      eventId: 'ev1',
      location: 'Norte',
      status: 'active',
      name: 'Titular Evento',
      wantsBautizosTransport: 'Si',
      llegaEnCarro: 'No',
      bautizosCompanions: [
        {
          id: 'c1',
          name: 'Acomp Carro',
          wantsBautizosTransport: 'No',
          llegaEnCarro: 'Si',
        },
      ],
    };
    const expanded = expandBautizosGlobalRegistryRows([host], [host]);
    const companionRow = expanded.find((p) => String(p.id).startsWith('virt-acompanante:'));
    expect(companionRow).toBeTruthy();
    expect(participantMatchesBautizosTransportFilter(companionRow, 'evento', () => false)).toBe(false);
    expect(bautizosLineGoesByCar(companionRow)).toBe(true);
  });

  it('evento filter counts titular and companion independently', () => {
    const host = {
      id: 'h1',
      eventId: 'ev1',
      location: 'Norte',
      status: 'active',
      name: 'Titular Evento',
      wantsBautizosTransport: 'Si',
      llegaEnCarro: 'No',
      travelFrom: 'Norte',
      travelTo: 'Norte',
      bautizosCompanions: [
        {
          id: 'c1',
          name: 'Acomp Carro',
          wantsBautizosTransport: 'No',
          llegaEnCarro: 'Si',
          travelFrom: 'Norte',
          travelTo: 'Norte',
        },
      ],
    };
    const filters = {
      filterRegistrationStatus: 'active',
      filterTransport: 'evento',
      filterLiquidation: 'all',
      filterBautizosTransport: 'evento',
      searchTerm: '',
      sortBy: 'none',
    };
    const eventoCount = countBautizosFilteredPeopleRows([host], filters, testFilterParticipantRows);
    expect(eventoCount).toBe(1);
    const carCount = countBautizosFilteredPeopleRows(
      [host],
      { ...filters, filterTransport: 'all', filterBautizosTransport: 'carro' },
      testFilterParticipantRows
    );
    expect(carCount).toBe(1);
  });
});
