/** Alturas estimadas para virtualizar tarjetas de grupos manuales en Transporte. */

export const TRANSPORT_MANUAL_GROUP_CARD_BASE_HEIGHT = 240;
export const TRANSPORT_MANUAL_GROUP_CARD_TOOLBAR_HEIGHT = 56;
export const TRANSPORT_MANUAL_GROUP_CARD_MEMBER_ROW_HEIGHT = 34;
export const TRANSPORT_MANUAL_GROUP_CARD_EXPANDED_BASE = 80;
export const TRANSPORT_MANUAL_GROUP_CARD_PER_CAR = 160;

export function estimateManualCarGroupCardHeight(view, expanded = false) {
  const members = Math.max(1, view?.memberLines?.length || 1);
  const cars = Math.max(1, view?.effectiveCars || 1);
  let h = TRANSPORT_MANUAL_GROUP_CARD_BASE_HEIGHT + TRANSPORT_MANUAL_GROUP_CARD_TOOLBAR_HEIGHT;
  h += Math.ceil(members / 3) * TRANSPORT_MANUAL_GROUP_CARD_MEMBER_ROW_HEIGHT;
  if (expanded) {
    h += TRANSPORT_MANUAL_GROUP_CARD_EXPANDED_BASE + cars * TRANSPORT_MANUAL_GROUP_CARD_PER_CAR;
  }
  return h;
}

/** Altura de una fila de grid (máximo entre las tarjetas de la fila). */
export function estimateManualCarGroupRowHeight(rowViews, expandedCardKeys = null) {
  if (!rowViews?.length) return TRANSPORT_MANUAL_GROUP_CARD_BASE_HEIGHT;
  const expanded = expandedCardKeys instanceof Set ? expandedCardKeys : new Set();
  return Math.max(...rowViews.map((view) => estimateManualCarGroupCardHeight(view, expanded.has(view.id))));
}

export function buildManualCarGroupRowItems(views, columns = 2) {
  const rows = [];
  for (let i = 0; i < views.length; i += columns) {
    const rowViews = views.slice(i, i + columns);
    rows.push({
      key: rowViews.map((view) => view.id).join('-') || `row-${i}`,
      views: rowViews,
    });
  }
  return rows;
}

export function buildManualCarGroupGetItemHeight(expandedCardKeys) {
  return (row) => estimateManualCarGroupRowHeight(row?.views || [], expandedCardKeys);
}
