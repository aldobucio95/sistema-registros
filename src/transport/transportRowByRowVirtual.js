/** Alturas estimadas para virtualizar la tabla «Detalle fila a fila» de Transporte. */

export const TRANSPORT_ROW_BY_ROW_BASE_HEIGHT = 44;
export const TRANSPORT_ROW_BY_ROW_HEADER_HEIGHT = 36;
export const TRANSPORT_ROW_BY_ROW_VEHICLE_DETAIL_BASE = 280;
export const TRANSPORT_ROW_BY_ROW_VEHICLE_PER_CAR = 140;

export function estimateTransportVehicleDetailHeight(carCount = 1) {
  const n = Math.max(1, parseInt(carCount, 10) || 1);
  return TRANSPORT_ROW_BY_ROW_VEHICLE_DETAIL_BASE + TRANSPORT_ROW_BY_ROW_VEHICLE_PER_CAR * Math.max(0, n - 1);
}

/**
 * Altura de un bloque virtual (fila principal + detalle de carro opcional en el mismo ítem).
 */
export function getTransportRowByRowBlockHeight(item, expandedCarDetailKeys) {
  if (!item) return TRANSPORT_ROW_BY_ROW_BASE_HEIGHT;
  const expanded = item.detailKey && expandedCarDetailKeys?.has?.(item.detailKey);
  switch (item.kind) {
    case 'empty':
      return 72;
    case 'section-header':
      return TRANSPORT_ROW_BY_ROW_HEADER_HEIGHT;
    case 'vehicle-detail':
      return estimateTransportVehicleDetailHeight(item.carCount);
    case 'data-row':
      if (expanded) {
        return TRANSPORT_ROW_BY_ROW_BASE_HEIGHT + estimateTransportVehicleDetailHeight(item.carCount);
      }
      return TRANSPORT_ROW_BY_ROW_BASE_HEIGHT;
    default:
      return TRANSPORT_ROW_BY_ROW_BASE_HEIGHT;
  }
}

export function buildTransportRowByRowGetItemHeight(expandedCarDetailKeys) {
  return (item) => getTransportRowByRowBlockHeight(item, expandedCarDetailKeys);
}
