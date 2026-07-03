import { describe, expect, it } from 'vitest';
import {
  nameFuzzyRatio,
  nameTokensSubsetMatch,
  nameTokenOverlapScore,
  normalizePersonNameForMatch,
  sharedNameTokens,
  tokenizePersonName,
} from '../personNameMatch.js';

describe('normalizePersonNameForMatch', () => {
  it('quita acentos y normaliza ñ', () => {
    expect(normalizePersonNameForMatch('José Niño')).toBe('jose nino');
    expect(normalizePersonNameForMatch('MARÍA')).toBe('maria');
  });
});

describe('tokenizePersonName', () => {
  it('filtra partículas', () => {
    expect(tokenizePersonName('José Manuel Delgado de la Rosa')).toEqual([
      'jose',
      'manuel',
      'delgado',
      'rosa',
    ]);
  });
});

describe('nameTokensSubsetMatch', () => {
  it('detecta nombre parcial dentro del completo', () => {
    expect(nameTokensSubsetMatch('José Manuel Delgado', 'Jose Manuel Delgado Hernandez')).toBe(true);
  });

  it('no match con un solo token compartido', () => {
    expect(nameTokensSubsetMatch('José', 'Jose Manuel Delgado Hernandez')).toBe(false);
  });
});

describe('nameFuzzyRatio', () => {
  it('alta similitud con variante acentuada', () => {
    expect(nameFuzzyRatio('José Manuel Delgado', 'Jose Manuel Delgado Hernandez')).toBeGreaterThan(0.6);
  });
});

describe('sharedNameTokens', () => {
  it('lista tokens comunes', () => {
    expect(sharedNameTokens('José Manuel Delgado', 'Jose Manuel Delgado Hernandez')).toEqual([
      'jose',
      'manuel',
      'delgado',
    ]);
  });
});

describe('nameTokenOverlapScore', () => {
  it('score alto para subset', () => {
    expect(nameTokenOverlapScore('José Manuel Delgado', 'Jose Manuel Delgado Hernandez')).toBeGreaterThan(0.5);
  });
});
