import { describe, expect, it } from 'vitest';
import {
  describeManualGroupCreated,
  describeManualGroupMembersAdded,
  describeManualGroupSeparated,
  describeManualGroupTitularChange,
} from '../transportActivityLog.js';

describe('transportActivityLog', () => {
  it('describeManualGroupCreated incluye titular e integrantes', () => {
    const memberLines = [
      { sourceKey: 'p:1', name: 'Virginia Hernandez', kind: 'participant' },
      { sourceKey: 'c:bc-1', name: 'José Manuel', kind: 'companion' },
    ];
    const text = describeManualGroupCreated({
      memberLines,
      anchorTitularSk: 'p:1',
      inheritedCars: 2,
    });
    expect(text).toContain('Creó grupo manual');
    expect(text).toContain('Virginia Hernandez');
    expect(text).toContain('2 integrantes');
    expect(text).toContain('Carros compartidos: 2');
  });

  it('describeManualGroupMembersAdded nombra agregados', () => {
    const text = describeManualGroupMembersAdded({
      addedLines: [{ name: 'Ana López' }, { name: 'Pedro López' }],
      groupLabel: 'Familia López',
      titularName: 'María López',
      totalMembers: 4,
      effectiveCars: 1,
    });
    expect(text).toContain('Agregó 2 personas');
    expect(text).toContain('Ana López');
    expect(text).toContain('Titular: María López');
  });

  it('describeManualGroupSeparated lista miembros liberados', () => {
    const text = describeManualGroupSeparated({
      groupId: 'cg-123',
      memberLines: [{ name: 'A' }, { name: 'B' }],
    });
    expect(text).toContain('Separó grupo manual');
    expect(text).toContain('A; B');
  });

  it('describeManualGroupTitularChange before→after', () => {
    const text = describeManualGroupTitularChange({
      groupLabel: 'Grupo Norte',
      prevTitularName: 'Ana',
      nextTitularName: 'Luis',
    });
    expect(text).toContain('Ana → Luis');
  });
});
