import { describe, expect, it } from 'vitest';
import {
  buildBautizosPartyDetailedLines,
  buildBautizosTransportSummaryLines,
  buildBautizosFinanceStatusLines,
  buildBautizosPerLineLiquidationLines,
  buildPaymentDeadlineAndRefundBlock,
  buildCarDataStatusLines,
  resolveCompanionWaStatusLabel,
  resolveParticipantWaRoleLabel,
  resolveVnOfficeContactLabel,
  resolvePromotedCompanionNames,
  formatPaymentDeadlineLabel,
} from '../whatsappBautizosStatusBlocks.js';
import {
  buildFinanceWhatsAppMessage,
  buildPromoteWaitlistWhatsAppMessage,
  buildPromoteCompanionWaitlistWhatsAppMessage,
} from '../whatsappFinanceMessages.js';

const bautizosEvent = {
  eventType: 'Bautizos',
  name: 'Bautizos 2026',
  paymentDeadlineDate: '2026-08-15',
  foodPrice: 300,
  transportPrice: 200,
};

describe('resolveVnOfficeContactLabel', () => {
  it('usa Sur para sede sur', () => {
    expect(resolveVnOfficeContactLabel('Sur')).toContain('Sur');
  });
  it('usa Norte para sede norte', () => {
    expect(resolveVnOfficeContactLabel('Norte')).toContain('Norte');
  });
});

describe('buildBautizosPartyDetailedLines', () => {
  it('incluye estatus mixto titular activo y acompañante en espera', () => {
    const person = {
      name: 'Ana López',
      bautizosAttendanceType: 'bautizado',
      wantsBautizosTransport: 'Si',
      bautizosCompanions: [
        { id: 'c1', name: 'Luis', relationship: 'Esposo', willBeBaptized: 'No', wantsBautizosTransport: 'No', llegaEnCarro: true, carrosLlegada: 2 },
        { id: 'c2', name: 'Pedro', relationship: 'Hijo', willBeBaptized: 'Si', companionWaitlistPending: true },
      ],
    };
    const lines = buildBautizosPartyDetailedLines(person, bautizosEvent);
    expect(lines.some((l) => l.includes('Ana López') && l.includes('Activo'))).toBe(true);
    expect(lines.some((l) => l.includes('Luis') && l.includes('Carro propio (2)'))).toBe(true);
    expect(lines.some((l) => l.includes('Pedro') && l.includes('En espera'))).toBe(true);
    expect(lines.some((l) => l.includes('no confirmado aún'))).toBe(true);
  });

  it('marca promovidos como activos', () => {
    const person = {
      name: 'Ana',
      bautizosCompanions: [{ id: 'c1', name: 'Pedro', companionWaitlistPending: false }],
    };
    const lines = buildBautizosPartyDetailedLines(person, bautizosEvent, null, {
      promotedCompanionIds: ['c1'],
    });
    expect(lines.some((l) => l.includes('Pedro') && l.includes('Activo'))).toBe(true);
  });
});

describe('resolveCompanionWaStatusLabel', () => {
  it('detecta en espera', () => {
    expect(resolveCompanionWaStatusLabel({ companionWaitlistPending: true })).toBe('En espera');
    expect(resolveCompanionWaStatusLabel({})).toBe('Activo');
  });
});

describe('resolveParticipantWaRoleLabel', () => {
  it('distingue bautizado y acompañante', () => {
    expect(resolveParticipantWaRoleLabel({ bautizosAttendanceType: 'bautizado' })).toBe('Bautizado');
    expect(resolveParticipantWaRoleLabel({ willBeBaptized: 'Si' }, { isCompanion: true })).toBe('Bautizado');
    expect(resolveParticipantWaRoleLabel({ willBeBaptized: 'No' }, { isCompanion: true })).toBe('Acompañante');
  });
});

describe('buildPaymentDeadlineAndRefundBlock', () => {
  it('incluye fecha y política de reembolso cuando hay deuda', () => {
    const block = buildPaymentDeadlineAndRefundBlock(bautizosEvent, true, '2026-08-15');
    const text = block.join('\n');
    expect(text).toMatch(/Fecha límite de pago/i);
    expect(text).toMatch(/no se garantiza la devolución/i);
    expect(formatPaymentDeadlineLabel('2026-08-15')).toMatch(/2026/);
  });

  it('no genera bloque si no hay deuda', () => {
    expect(buildPaymentDeadlineAndRefundBlock(bautizosEvent, false)).toEqual([]);
  });
});

describe('buildCarDataStatusLines', () => {
  it('describe inventario parcial y slot vacío', () => {
    const lines = buildCarDataStatusLines({
      inventory: [
        {
          carIndex: 1,
          meta: { brand: 'Toyota', model: 'Corolla', color: 'Blanco', plates: '', driverSourceKey: 'p:1' },
        },
        { carIndex: 2, meta: { brand: '', model: '', color: '', plates: '', driverSourceKey: '' } },
      ],
    });
    const text = lines.join('\n');
    expect(text).toContain('Carro 1');
    expect(text).toContain('Toyota');
    expect(text).toContain('Carro 2');
    expect(text).toMatch(/sin datos/i);
  });
});

describe('buildFinanceWhatsAppMessage registro', () => {
  it('incluye sede Sur, party detallado y deadline con saldo', () => {
    const person = {
      name: 'Ana',
      vnpPersonId: 'VNPM-1',
      paid: 100,
      bautizosAttendanceType: 'bautizado',
      wantsBautizosTransport: 'Si',
      bautizosCompanions: [
        { name: 'Luis', willBeBaptized: 'No', wantsBautizosTransport: 'No', llegaEnCarro: true },
      ],
    };
    const text = buildFinanceWhatsAppMessage({
      person,
      loc: 'Sur',
      amount: 100,
      pendingAmount: 400,
      isLiquidado: false,
      kind: 'registro',
      liquidationTarget: 500,
      eventSnapshot: bautizosEvent,
      paymentDeadlineDate: '2026-08-15',
    });
    expect(text).toMatch(/Oficina VN Sur/i);
    expect(text).toContain('Luis');
    expect(text).toMatch(/Fecha límite de pago/i);
    expect(text).toMatch(/no se garantiza la devolución/i);
  });
});

describe('buildPromoteWaitlistWhatsAppMessage', () => {
  it('incluye promoción y deadline cuando hay deuda', () => {
    const text = buildPromoteWaitlistWhatsAppMessage({
      person: {
        name: 'Ana',
        vnpPersonId: 'VNPM-1',
        bautizosCompanions: [{ name: 'Pedro', companionWaitlistPending: true }],
      },
      loc: 'Norte',
      eventSnapshot: bautizosEvent,
      financeSnapshot: { target: 500, paid: 100, isScholarship: false },
      paymentDeadlineDate: '2026-08-15',
    });
    expect(text).toMatch(/promovido de lista de espera/i);
    expect(text).toMatch(/En espera/);
    expect(text).toMatch(/Fecha límite de pago/i);
  });
});

describe('buildFinanceWhatsAppMessage registro liquidado', () => {
  it('no incluye deadline cuando está liquidado', () => {
    const person = {
      name: 'Ana',
      vnpPersonId: 'VNPM-1',
      bautizosAttendanceType: 'bautizado',
      wantsBautizosTransport: 'Si',
    };
    const text = buildFinanceWhatsAppMessage({
      person,
      loc: 'Norte',
      amount: 500,
      pendingAmount: 0,
      isLiquidado: true,
      kind: 'registro',
      liquidationTarget: 500,
      eventSnapshot: { ...bautizosEvent, startDate: '2026-08-20' },
    });
    expect(text).not.toMatch(/Fecha límite de pago/i);
  });
});

describe('buildPromoteCompanionWaitlistWhatsAppMessage', () => {
  it('informa al titular quién se promovió y el saldo', () => {
    const host = {
      name: 'Ana',
      vnpPersonId: 'VNPM-1',
      paid: 200,
      bautizosCompanions: [
        { id: 'c1', name: 'Luis', companionWaitlistPending: false },
        { id: 'c2', name: 'Pedro', companionWaitlistPending: true },
      ],
    };
    const text = buildPromoteCompanionWaitlistWhatsAppMessage({
      person: host,
      loc: 'Norte',
      eventSnapshot: bautizosEvent,
      financeSnapshot: { target: 800, paid: 200, isScholarship: false },
      promotedCompanionIds: ['c1'],
      paymentDeadlineDate: '2026-08-15',
    });
    expect(text).toContain('Luis');
    expect(text).toMatch(/Se confirmó en la lista de inscritos a: Luis/);
    expect(text).toMatch(/Saldo pendiente/);
    expect(text).toMatch(/Pedro.*En espera/s);
  });
});

describe('resolvePromotedCompanionNames', () => {
  it('resuelve nombres por id', () => {
    const names = resolvePromotedCompanionNames(
      { bautizosCompanions: [{ id: 'c1', name: 'Luis' }] },
      ['c1']
    );
    expect(names).toEqual(['Luis']);
  });
});
