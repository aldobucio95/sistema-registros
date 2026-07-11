import { describe, expect, it } from 'vitest';
import {
  buildHeightLayout,
  mergeEstimatedAndMeasuredHeights,
  resolveVirtualListItemMeasureKey,
} from '../components/VirtualizedList.jsx';

describe('VirtualizedList heights', () => {
  it('resolves stable measure keys from row items', () => {
    expect(resolveVirtualListItemMeasureKey({ key: 'p-1' }, 0)).toBe('p-1');
    expect(resolveVirtualListItemMeasureKey({ id: 'abc' }, 3)).toBe('abc');
    expect(resolveVirtualListItemMeasureKey({}, 4)).toBe('idx:4');
  });

  it('mergeEstimatedAndMeasuredHeights grows layout when content is taller than estimate', () => {
    const items = [{ key: 'a' }, { key: 'b' }];
    const estimated = [118, 118];
    const measured = { a: 420 };
    expect(mergeEstimatedAndMeasuredHeights(estimated, measured, items)).toEqual([420, 118]);
  });

  it('buildHeightLayout computes cumulative offsets', () => {
    const { heights, offsets, totalHeight } = buildHeightLayout([100, 250, 80], 72);
    expect(heights).toEqual([100, 250, 80]);
    expect(offsets).toEqual([0, 100, 350]);
    expect(totalHeight).toBe(430);
  });
});
