import React from 'react';
import { Bus, Car } from 'lucide-react';
import { uiSegment, uiSegmentItem } from '../../ui/uiFormatClasses.js';

/** Segmento Camiones | Carros. */
export default function TransportModeSegment({ mode = 'buses', onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className={uiSegment.wrap} role="tablist" aria-label="Modo de planificación">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'buses'}
          className={`${uiSegmentItem(mode === 'buses')} inline-flex items-center gap-1.5`}
          onClick={() => onChange?.('buses')}
        >
          <Bus size={14} aria-hidden />
          Camiones
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'cars'}
          className={`${uiSegmentItem(mode === 'cars')} inline-flex items-center gap-1.5`}
          onClick={() => onChange?.('cars')}
        >
          <Car size={14} aria-hidden />
          Carros
        </button>
      </div>
    </div>
  );
}
