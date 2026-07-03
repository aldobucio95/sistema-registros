import { describe, expect, it } from 'vitest';
import {
  describeCampaBreakdownLineAdded,
  describeStringListConfigChange,
} from '../eventConfigActivityLog.js';

describe('eventConfigActivityLog', () => {
  it('describeStringListConfigChange lista añadidos y eliminados', () => {
    const text = describeStringListConfigChange(
      ['Gluten', 'Lácteos'],
      ['Gluten', 'Lácteos', 'Frutos secos', 'Mariscos'],
      'Categorías de alergias'
    );
    expect(text).toContain('Categorías de alergias');
    expect(text).toContain('2→4');
    expect(text).toContain('añadió');
  });

  it('describeCampaBreakdownLineAdded incluye concepto y total', () => {
    const text = describeCampaBreakdownLineAdded('Transporte', 2, 1500, 3);
    expect(text).toContain('Transporte');
    expect(text).toContain('3 conceptos');
  });
});
