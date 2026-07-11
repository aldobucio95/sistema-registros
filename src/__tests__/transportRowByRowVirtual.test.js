import { describe, expect, it } from 'vitest';
import {
  buildTransportRowByRowGetItemHeight,
  estimateTransportVehicleDetailHeight,
  getTransportRowByRowBlockHeight,
  TRANSPORT_ROW_BY_ROW_BASE_HEIGHT,
} from '../transport/transportRowByRowVirtual.js';

describe('transportRowByRowVirtual', () => {
  it('estima altura mayor con detalle de carro expandido', () => {
    const expanded = new Set(['car:sk1']);
    const collapsed = getTransportRowByRowBlockHeight(
      { kind: 'data-row', detailKey: 'car:sk1', carCount: 2 },
      expanded
    );
    const plain = getTransportRowByRowBlockHeight(
      { kind: 'data-row', detailKey: 'car:sk2', carCount: 2 },
      expanded
    );
    expect(collapsed).toBeGreaterThan(plain);
    expect(plain).toBe(TRANSPORT_ROW_BY_ROW_BASE_HEIGHT);
  });

  it('buildTransportRowByRowGetItemHeight respeta múltiples carros', () => {
    const getHeight = buildTransportRowByRowGetItemHeight(new Set(['car:a']));
    const oneCar = getHeight({ kind: 'data-row', detailKey: 'car:a', carCount: 1 });
    const threeCars = getHeight({ kind: 'data-row', detailKey: 'car:a', carCount: 3 });
    expect(threeCars).toBeGreaterThan(oneCar);
    expect(estimateTransportVehicleDetailHeight(3)).toBeGreaterThan(estimateTransportVehicleDetailHeight(1));
  });
});
