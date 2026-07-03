import { describe, expect, it } from 'vitest';
import {
  buildRegistrationEditScalarChanges,
  describeBautizosCompanionsRegistrationChange,
  describePrivacyNoticeChange,
  describeRegisteredCostChange,
  describeRegistrationEditSnapshot,
} from '../registrationChangeLog.js';

describe('describeBautizosCompanionsRegistrationChange', () => {
  it('describe eliminación de acompañantes con nombres', () => {
    const prev = [
      { id: 'bc-1', name: 'José Manuel Delgado Hernandez', relationship: 'Hijo' },
      { id: 'bc-2', name: 'Angel Delgado Hernandez', relationship: 'Hijo' },
    ];
    const text = describeBautizosCompanionsRegistrationChange(prev, []);
    expect(text).toContain('Acompañantes (2→0)');
    expect(text).toContain('eliminó');
    expect(text).toContain('José Manuel Delgado Hernandez (Hijo)');
    expect(text).toContain('Angel Delgado Hernandez (Hijo)');
  });

  it('describe agregado de acompañante', () => {
    const next = [{ id: 'bc-3', name: 'María López', relationship: 'Esposa' }];
    const text = describeBautizosCompanionsRegistrationChange([], next);
    expect(text).toContain('Acompañantes (0→1)');
    expect(text).toContain('agregó María López (Esposa)');
  });

  it('describe modificación de campo en acompañante existente', () => {
    const prev = [{ id: 'bc-1', name: 'Ana', relationship: 'Hija', wantsBautizosTransport: 'No' }];
    const next = [{ id: 'bc-1', name: 'Ana', relationship: 'Hija', wantsBautizosTransport: 'Si' }];
    const text = describeBautizosCompanionsRegistrationChange(prev, next);
    expect(text).toContain('modificó');
    expect(text).toContain('transporte evento No→Si');
  });

  it('retorna null si no hay cambio', () => {
    const list = [{ id: 'bc-1', name: 'Ana', relationship: 'Hija' }];
    expect(describeBautizosCompanionsRegistrationChange(list, list)).toBeNull();
  });
});

describe('escenario Virginia Hernández', () => {
  const originalPerson = {
    name: 'Virginia Hernandez Meza',
    location: 'Norte',
    registeredCost: 1500,
    privacyNoticeVersion: '1.0',
    bautizosCompanions: [
      { id: 'bc-1', name: 'José Manuel Delgado Hernandez', relationship: 'Hijo' },
      { id: 'bc-2', name: 'Angel Delgado Hernandez', relationship: 'Hijo' },
    ],
    wantsBautizosTransport: 'Si',
    transportType: 'Autobús',
  };

  const editedPerson = {
    ...originalPerson,
    registeredCost: 500,
    privacyNoticeVersion: '2.0',
    privacyNoticeAcceptedAt: '2026-07-01T12:00:00.000Z',
    bautizosCompanions: [],
    wantsBautizosTransport: 'No',
  };

  it('buildRegistrationEditScalarChanges incluye acompañantes, privacidad y transporte', () => {
    const changes = buildRegistrationEditScalarChanges({
      originalPerson,
      editedPerson,
      eventType: 'Bautizos',
      hasAdminRights: false,
      loc: 'Norte',
    });
    const joined = changes.join(', ');
    expect(joined).toContain('Acompañantes (2→0)');
    expect(joined).toContain('José Manuel Delgado Hernandez');
    expect(joined).toContain('Angel Delgado Hernandez');
    expect(joined).toContain('Aviso privacidad (versión)');
    expect(joined).toContain('1.0');
    expect(joined).toContain('2.0');
    expect(joined).toContain('Transporte evento (Bautizos)');
  });

  it('describeRegisteredCostChange con motivo', () => {
    const line = describeRegisteredCostChange(1500, 500, 'por cambio de acompañantes');
    expect(line).toBe('Costo lista (1500 → 500) (por cambio de acompañantes)');
  });

  it('describeRegistrationEditSnapshot desde payload de auditoría', () => {
    const text = describeRegistrationEditSnapshot({
      kind: 'registro_editado',
      previousData: originalPerson,
      payload: editedPerson,
    });
    expect(text).toContain('Acompañantes (2→0)');
    expect(text).toContain('Costo lista (1500 → 500)');
  });
});

describe('describePrivacyNoticeChange', () => {
  it('reporta versión y fecha', () => {
    const text = describePrivacyNoticeChange(
      { privacyNoticeVersion: '1.0' },
      { privacyNoticeVersion: '2.0', privacyNoticeAcceptedAt: '2026-07-01' }
    );
    expect(text).toContain('Aviso privacidad (versión)');
    expect(text).toContain('Aviso privacidad (aceptado)');
  });
});

describe('falsos positivos en diff de edición', () => {
  it('no reporta nombre idéntico con distinta normalización Unicode', () => {
    const prev = { name: 'Luis Lo\u0301pez Joaqui\u0301n', emergencyContact: 'Karina Garc\u00eda' };
    const next = { name: 'Luis López Joaquín', emergencyContact: 'Karina García' };
    const changes = buildRegistrationEditScalarChanges({
      originalPerson: prev,
      editedPerson: next,
      eventType: 'Bautizos',
    });
    expect(changes.join(', ')).not.toContain('Nombre');
    expect(changes.join(', ')).not.toContain('Contacto emergencia');
  });

  it('no reporta edad si la fecha de nacimiento no cambió (solo recálculo)', () => {
    const prev = { birthDate: '1989-03-15', age: '36' };
    const next = { birthDate: '1989-03-15', age: '37' };
    const changes = buildRegistrationEditScalarChanges({
      originalPerson: prev,
      editedPerson: next,
      eventType: 'Bautizos',
    });
    expect(changes.join(', ')).not.toContain('Edad');
  });

  it('no reporta acompañantes si solo cambió formato de nombre al guardar', () => {
    const prev = [{ id: 'bc-1', name: 'MARIA LOPEZ', relationship: 'Esposa' }];
    const next = [{ id: 'bc-1', name: 'Maria Lopez', relationship: 'Esposa' }];
    expect(describeBautizosCompanionsRegistrationChange(prev, next)).toBeNull();
  });

  it('describeRegistrationEditSnapshot refleja solo cambios reales del escenario Luis López', () => {
    const prev = {
      name: 'Luis L\u00f3pez Joaqu\u00edn',
      emergencyContact: 'Karina Garc\u00eda',
      birthDate: '1989-03-15',
      age: '36',
      privacyNoticeVersion: '1.0',
      bautizosCompanions: [
        { id: 'bc-1', name: 'Ana L\u00f3pez', relationship: 'Hija' },
        { id: 'bc-2', name: 'Pedro L\u00f3pez', relationship: 'Hijo' },
      ],
    };
    const next = {
      ...prev,
      name: 'Luis López Joaquín',
      emergencyContact: 'Karina García',
      age: '37',
      privacyNoticeVersion: '2.0',
      privacyNoticeAcceptedAt: '2026-07-03T20:05:50.686Z',
      privacyNoticeChannel: 'manual_staff',
      bautizosCompanions: [
        { id: 'bc-1', name: 'Ana López', relationship: 'Hija' },
        { id: 'bc-2', name: 'Pedro López', relationship: 'Hijo' },
      ],
    };
    const text = describeRegistrationEditSnapshot({
      kind: 'registro_editado',
      previousData: prev,
      payload: next,
      eventType: 'Bautizos',
    });
    expect(text).not.toContain('Nombre (');
    expect(text).not.toContain('Contacto emergencia');
    expect(text).not.toContain('Edad');
    expect(text).not.toContain('Acompañantes');
    expect(text).toContain('Aviso privacidad (versión)');
    expect(text).toContain('Aviso privacidad (aceptado)');
    expect(text).toContain('Canal aviso privacidad');
  });
});
