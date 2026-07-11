import { describe, expect, it } from 'vitest';
import { coalesceVehiclePatchForPersist } from '../transport/v2/transportVehicleModel.js';

describe('transportVehicleModel', () => {
  it('coalesceVehiclePatchForPersist keeps existing vehicle fields when patch is crew-only', () => {
    const merged = coalesceVehiclePatchForPersist(
      {
        brand: '',
        model: '',
        color: '',
        plates: '',
        driverSourceKey: 'p:host',
        passengerSourceKeys: ['p:guest'],
      },
      {
        brand: 'Toyota',
        model: 'RAV4 Hybrid',
        color: 'Blanco',
        plates: '40J766',
        ownerParticipantId: 'host',
        carIndex: 1,
      }
    );
    expect(merged.brand).toBe('Toyota');
    expect(merged.model).toBe('RAV4 Hybrid');
    expect(merged.color).toBe('Blanco');
    expect(merged.plates).toBe('40J766');
    expect(merged.driverSourceKey).toBe('p:host');
    expect(merged.passengerSourceKeys).toEqual(['p:guest']);
  });
});
