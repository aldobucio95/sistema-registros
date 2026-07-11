import { describe, expect, it } from 'vitest';
import {
  buildManualCarGroupRowItems,
  estimateManualCarGroupCardHeight,
  estimateManualCarGroupRowHeight,
} from '../transport/transportManualCarGroupsVirtual.js';

describe('transportManualCarGroupsVirtual', () => {
  const sampleView = (overrides = {}) => ({
    id: 'cg-1',
    memberLines: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
    effectiveCars: 2,
    ...overrides,
  });

  it('estimateManualCarGroupCardHeight grows with members and expanded car forms', () => {
    const collapsed = estimateManualCarGroupCardHeight(sampleView(), false);
    const expanded = estimateManualCarGroupCardHeight(sampleView(), true);
    expect(expanded).toBeGreaterThan(collapsed);
    expect(estimateManualCarGroupCardHeight(sampleView({ memberLines: [] }), false)).toBeGreaterThan(200);
  });

  it('estimateManualCarGroupRowHeight uses tallest card in the row', () => {
    const short = sampleView({ id: 'a', memberLines: [{ name: 'A' }] });
    const tall = sampleView({ id: 'b', memberLines: Array.from({ length: 8 }, (_, i) => ({ name: `P${i}` })) });
    const rowHeight = estimateManualCarGroupRowHeight([short, tall]);
    expect(rowHeight).toBe(estimateManualCarGroupCardHeight(tall, false));
  });

  it('buildManualCarGroupRowItems chunks views with stable keys', () => {
    const views = [sampleView({ id: 'a' }), sampleView({ id: 'b' }), sampleView({ id: 'c' })];
    const rows = buildManualCarGroupRowItems(views, 2);
    expect(rows).toHaveLength(2);
    expect(rows[0].key).toBe('a-b');
    expect(rows[1].key).toBe('c');
    expect(rows[0].views).toHaveLength(2);
    expect(rows[1].views).toHaveLength(1);
  });
});
