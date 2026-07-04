import { describe, expect, it } from 'vitest';
import {
  buildVehicleDocId,
  legacyVehicleKeyFromVehicleDoc,
  parseVehicleDocId,
  vehicleDocIdFromLegacyKey,
} from '../transport/v2/transportSchema.js';
import {
  legacyPatchToVehicleDoc,
  normalizeTransportVehicleDoc,
  transportVehicleToLegacyMeta,
  vehicleDocNeedsPersist,
} from '../transport/v2/transportVehicleModel.js';
import {
  v1PatchesToV2VehicleDocs,
  v2VehicleDocsToLegacyMetaMap,
} from '../transport/v2/transportLegacyAdapter.js';
import { isTransportV2Plan } from '../transport/v2/transportMigration.js';
import { validateRegistrationTransport } from '../transport/v2/transportValidation.js';

describe('transport v2 schema', () => {
  it('buildVehicleDocId and parseVehicleDocId round-trip', () => {
    const id = buildVehicleDocId('id_VNPM-TEST', 2);
    expect(id).toBe('id_VNPM-TEST__c2');
    expect(parseVehicleDocId(id)).toEqual({ ownerParticipantId: 'id_VNPM-TEST', carIndex: 2 });
  });

  it('legacy vehicle key mapping', () => {
    const legacy = legacyVehicleKeyFromVehicleDoc('id_VNPM-ABC', 1);
    expect(legacy).toBe('p:id_VNPM-ABC|c1');
    expect(vehicleDocIdFromLegacyKey(legacy)).toBe('id_VNPM-ABC__c1');
  });
});

describe('transport v2 vehicle model', () => {
  it('vehicleDocNeedsPersist false for all pending', () => {
    expect(
      vehicleDocNeedsPersist({
        pendingBrand: true,
        pendingColor: true,
        pendingPlates: true,
      })
    ).toBe(false);
  });

  it('vehicleDocNeedsPersist true when brand captured', () => {
    expect(vehicleDocNeedsPersist({ brand: 'Toyota', pendingModel: true })).toBe(true);
  });

  it('legacy round-trip meta', () => {
    const doc = legacyPatchToVehicleDoc({
      eventId: 'evt1',
      ownerParticipantId: 'pid1',
      carIndex: 1,
      patch: { brand: 'Honda', color: 'Rojo', ownerSourceKey: 'p:pid1' },
      vehicleDocId: 'pid1__c1',
    });
    const legacy = transportVehicleToLegacyMeta(doc);
    expect(legacy.brand).toBe('Honda');
    expect(legacy.color).toBe('Rojo');
  });
});

describe('transport v2 legacy adapter', () => {
  it('v1PatchesToV2VehicleDocs', () => {
    const docs = v1PatchesToV2VehicleDocs(
      'evt1',
      [{ vehicleKey: 'p:pid1|c1', patch: { brand: 'Mazda', ownerSourceKey: 'p:pid1' } }],
      'pid1'
    );
    expect(docs).toHaveLength(1);
    expect(docs[0].brand).toBe('Mazda');
    expect(docs[0].id).toBe('pid1__c1');
  });

  it('v2VehicleDocsToLegacyMetaMap', () => {
    const map = v2VehicleDocsToLegacyMetaMap([
      normalizeTransportVehicleDoc({
        id: 'pid1__c1',
        ownerParticipantId: 'pid1',
        carIndex: 1,
        brand: 'Kia',
      }),
    ]);
    expect(map['p:pid1|c1']?.brand).toBe('Kia');
  });
});

describe('transport v2 migration flag', () => {
  it('isTransportV2Plan', () => {
    expect(isTransportV2Plan({ transportVersion: 2 })).toBe(true);
    expect(isTransportV2Plan({ transportVersion: 1 })).toBe(false);
  });
});

describe('transport v2 validation', () => {
  it('validateRegistrationTransport ok without car', () => {
    const r = validateRegistrationTransport({
      hostPerson: { wantsBautizosTransport: 'Si', llegaEnCarro: false },
      companions: [],
      plan: {},
    });
    expect(r.ok).toBe(true);
  });
});
