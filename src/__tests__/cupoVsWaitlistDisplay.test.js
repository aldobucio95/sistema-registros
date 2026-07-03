import { describe, expect, it } from 'vitest';
import {
  buildSedeCapChipViewModel,
  computeCapRemaining,
  formatCapRemainingDisplay,
  resolveConfiguredCapLimit,
  resolveCupoLimitMode,
  resolveSedeCapStatus,
} from '../cupoVsWaitlistDisplay.js';

describe('cupoVsWaitlistDisplay', () => {
  it('detects global vs per-sede cap mode', () => {
    expect(resolveCupoLimitMode(500)).toBe('global');
    expect(resolveCupoLimitMode(0)).toBe('perSede');
  });

  it('shows configured global limit instead of remaining', () => {
    const limit = resolveConfiguredCapLimit({ eventTotalCap: 500, locationCap: 120 });
    expect(limit.scope).toBe('global');
    expect(limit.label).toBe('500');
    expect(limit.detail).toBe('Compartido entre sedes');
  });

  it('shows per-sede limit when global is unlimited', () => {
    const limit = resolveConfiguredCapLimit({ eventTotalCap: 0, locationCap: 80 });
    expect(limit.scope).toBe('sede');
    expect(limit.label).toBe('80');
  });

  it('shows Ilimitado only when no caps are configured', () => {
    const limit = resolveConfiguredCapLimit({ eventTotalCap: 0, locationCap: 0 });
    expect(limit.scope).toBe('unlimited');
    expect(limit.label).toBe('Ilimitado');
  });

  it('computes global remaining shared across sedes', () => {
    expect(
      computeCapRemaining({
        eventTotalCap: 500,
        globalUsed: 480,
        locationCap: 0,
        activeAtSede: 40,
      })
    ).toBe(20);
  });

  it('computes zero remaining when global cap is full (not unlimited)', () => {
    expect(
      computeCapRemaining({
        eventTotalCap: 500,
        globalUsed: 500,
        locationCap: 0,
        activeAtSede: 30,
      })
    ).toBe(0);
    expect(formatCapRemainingDisplay(0)).toBe('0');
  });

  it('reports global full status clearly', () => {
    const status = resolveSedeCapStatus({
      eventTotalCap: 500,
      globalUsed: 500,
      locationCap: 0,
      activeAtSede: 12,
      waitCount: 3,
    });
    expect(status.key).toBe('globalFull');
    expect(status.label).toBe('Lleno (global) · espera');
    expect(status.tone).toBe('full');
  });

  it('reports sede full when only per-sede cap applies', () => {
    const status = resolveSedeCapStatus({
      eventTotalCap: 0,
      globalUsed: 0,
      locationCap: 50,
      activeAtSede: 50,
      waitCount: 0,
    });
    expect(status.key).toBe('sedeFull');
    expect(status.label).toBe('Lleno (sede)');
  });

  it('reports available when global cap has room', () => {
    const status = resolveSedeCapStatus({
      eventTotalCap: 500,
      globalUsed: 100,
      locationCap: 0,
      activeAtSede: 40,
      waitCount: 0,
    });
    expect(status.key).toBe('available');
    expect(status.label).toBe('Disponible');
  });

  it('formats sede chip with limit and remaining', () => {
    const chip = buildSedeCapChipViewModel({
      eventTotalCap: 500,
      globalUsed: 480,
      locationCap: 0,
      activeAtSede: 42,
      waitCount: 0,
    });
    expect(chip.text).toBe('Activos 42 · Límite 500 · Rem. 20');
    expect(chip.status.key).toBe('available');
  });

  it('formats sede chip when global cap is full', () => {
    const chip = buildSedeCapChipViewModel({
      eventTotalCap: 500,
      globalUsed: 500,
      locationCap: 0,
      activeAtSede: 30,
      waitCount: 2,
    });
    expect(chip.text).toBe('Activos 30 · Límite 500 · Rem. 0');
    expect(chip.status.key).toBe('globalFull');
  });

  it('formats sede chip when unlimited', () => {
    const chip = buildSedeCapChipViewModel({
      eventTotalCap: 0,
      globalUsed: 0,
      locationCap: 0,
      activeAtSede: 15,
      waitCount: 0,
    });
    expect(chip.text).toBe('Activos 15 · Ilimitado');
  });
});
