import { isSiValue } from './bautizosSiUtils.js';

/** ¿La persona usa transporte en carro? (modelo plano; ya no hay grupo familiar.) */
export function personUsesCarTransport(personLike) {
  if (typeof personLike?.llegaEnCarro === 'boolean') return personLike.llegaEnCarro;
  if (isSiValue(personLike?.llegaEnCarro)) return true;
  if (personLike?.llegaEnCarro === 'No') return false;
  return (personLike?.transportType || 'Camión') === 'Carro';
}

/** @deprecated Compat: segundo arg ignorado (acompañantes anidados eliminados en modelo nuevo). */
export function familyHasAnyCarTransport(personLike, _companions, _eventLike) {
  return personUsesCarTransport(personLike);
}
