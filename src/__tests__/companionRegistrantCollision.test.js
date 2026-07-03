import { describe, expect, it } from 'vitest';
import {
  buildCompanionRegistrantCollisionIndex,
  buildNewEntryCompanionCollisionHint,
  evaluateCompanionRegistrantMatch,
  buildCompanionCollisionAckKey,
} from '../companionRegistrantCollision.js';

const canonicalizeVnp = (raw) => {
  const t = String(raw || '').trim();
  if (!t) return '';
  const m = t.match(/^VNPM-(.*)$/i);
  if (!m) return t;
  return `VNPM-${m[1].normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/gi, '').toUpperCase()}`;
};

describe('evaluateCompanionRegistrantMatch', () => {
  it('escenario José Manuel Delgado vs Delgado Hernandez — probable por tokens', () => {
    const companion = { name: 'José Manuel Delgado', relationship: 'Hijo' };
    const registrant = { id: 'reg-1', name: 'Jose Manuel Delgado Hernandez' };
    const m = evaluateCompanionRegistrantMatch(companion, registrant);
    expect(m.confidence).toBe('probable');
    expect(m.reasons).toContain('name_tokens');
  });

  it('certain por mismo VNPM', () => {
    const companion = { name: 'Ana López', vnpPersonId: 'VNPM-ABC123' };
    const registrant = { id: 'r1', name: 'Ana Lopez Garcia', vnpPersonId: 'VNPM-ABC123' };
    const m = evaluateCompanionRegistrantMatch(companion, registrant, { canonicalizeVnpPersonId: canonicalizeVnp });
    expect(m.confidence).toBe('certain');
    expect(m.reasons).toContain('vnp');
  });

  it('no match si ya vinculado', () => {
    const participants = [
      {
        id: 'host-1',
        eventId: 'ev-1',
        status: 'active',
        name: 'Virginia Hernandez',
        location: 'Norte',
        bautizosCompanions: [
          {
            id: 'bc-1',
            name: 'José Manuel Delgado Hernandez',
            linkedCompanionSourceKey: 'p:reg-1',
          },
        ],
      },
      { id: 'reg-1', eventId: 'ev-1', status: 'active', name: 'José Manuel Delgado Hernandez' },
    ];
    const idx = buildCompanionRegistrantCollisionIndex(participants, 'ev-1');
    expect(idx.clusters.length).toBe(0);
  });
});

describe('buildCompanionRegistrantCollisionIndex', () => {
  const participants = [
    {
      id: 'host-virginia',
      eventId: 'ev-1',
      status: 'active',
      name: 'Virginia Hernandez Meza',
      location: 'Norte',
      bautizosCompanions: [
        { id: 'bc-1', name: 'José Manuel Delgado', relationship: 'Hijo' },
        { id: 'bc-2', name: 'Angel Delgado Hernandez', relationship: 'Hijo' },
      ],
    },
    {
      id: 'reg-jose',
      eventId: 'ev-1',
      status: 'active',
      name: 'Jose Manuel Delgado Hernandez',
      location: 'Norte',
      bautizosAttendanceType: 'bautizado',
    },
  ];

  it('detecta colisión Virginia / José Manuel parcial', () => {
    const idx = buildCompanionRegistrantCollisionIndex(participants, 'ev-1');
    expect(idx.clusters.length).toBeGreaterThan(0);
    const joseCluster = idx.clusters.find((c) => c.registrantSide.participantId === 'reg-jose');
    expect(joseCluster).toBeTruthy();
    expect(joseCluster.confidence).toBe('probable');
    expect(joseCluster.companionSide.hostName).toContain('Virginia');
  });

  it('buildNewEntryCompanionCollisionHint al registrar a José Manuel', () => {
    const hint = buildNewEntryCompanionCollisionHint(
      'Jose Manuel Delgado Hernandez',
      '',
      participants,
      'ev-1'
    );
    expect(hint).toBeTruthy();
    expect(hint.summary).toContain('acompañante');
    expect(hint.suggestLink).toBe(true);
  });

  it('ackKey estable', () => {
    expect(buildCompanionCollisionAckKey('h1', 'bc-1', 'r1')).toBe('dup:companion:h1:bc-1:r1');
  });
});
