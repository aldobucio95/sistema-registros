import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { assertCallerCanMutateTargetStaff } = require('../../functions/staffAuthGuards.cjs');

describe('assertCallerCanMutateTargetStaff', () => {
  it('blocks Administrador from mutating a SuperUsuario (email takeover path)', () => {
    const result = assertCallerCanMutateTargetStaff(
      'Administrador',
      'SuperUsuario',
      'cambiar el correo de acceso de'
    );
    expect(result.ok).toBe(false);
    expect(result.code).toBe('permission-denied');
    expect(result.message).toMatch(/Solo un SuperUsuario/i);
  });

  it('allows SuperUsuario to mutate another SuperUsuario', () => {
    expect(assertCallerCanMutateTargetStaff('SuperUsuario', 'SuperUsuario', 'eliminar').ok).toBe(true);
  });

  it('allows Administrador to mutate non-SuperUsuario staff', () => {
    expect(assertCallerCanMutateTargetStaff('Administrador', 'Editor', 'eliminar').ok).toBe(true);
    expect(assertCallerCanMutateTargetStaff('Administrador', 'Administrador', 'cambiar el correo de acceso de').ok).toBe(
      true
    );
  });
});
