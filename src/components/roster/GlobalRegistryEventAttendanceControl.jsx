import React from 'react';
import GlobalRegistryAttendanceToggle from './GlobalRegistryAttendanceToggle.jsx';

/** Checkbox de asistencia: props primitivas estables para React.memo. */
function GlobalRegistryEventAttendanceControl({
  sourceKey = '',
  initialConfirmed = false,
  onToggleBySourceKey,
  compact = false,
}) {
  const sk = String(sourceKey || '').trim();
  if (!sk) return null;
  return (
    <GlobalRegistryAttendanceToggle
      checked={initialConfirmed}
      compact={compact}
      onChange={(checked) => onToggleBySourceKey(sk, checked)}
    />
  );
}

export default React.memo(GlobalRegistryEventAttendanceControl);
