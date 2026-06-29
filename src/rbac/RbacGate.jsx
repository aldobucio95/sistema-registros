import React from 'react';

/**
 * Renderiza `children` solo si `allow` es verdadero; si no, `fallback` o null.
 */
export default function RbacGate({ allow, children, fallback = null }) {
  if (!allow) return fallback;
  return children;
}
