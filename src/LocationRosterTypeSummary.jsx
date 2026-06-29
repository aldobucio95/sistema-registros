import { LOCATION_ROSTER_TYPE_ROWS } from './locationRosterTypeSummary.js';
import {
  uiBadgeMini,
  uiDropdown,
  uiRosterSearch,
  uiSectionPanel,
  uiTable,
  uiTypography,
} from './ui/uiFormatClasses.js';

/** Colores sólidos alineados con `uiBautizosAttendanceBtn` (formulario de ingreso). */
const TYPE_BADGE_COLOR = {
  bautizado: 'sky',
  asistente: 'amber',
  servidor: 'indigo',
  empleado: 'teal',
  cortesia: 'fuchsia',
  acompanante: 'emerald',
};

function typeBadgeVariant(typeId) {
  return typeId === 'acompanante' ? 'soft' : 'solid';
}

function TypeBadgeRow({ totals }) {
  return LOCATION_ROSTER_TYPE_ROWS.map((row) => {
    const n = totals[row.id] || 0;
    if (n <= 0) return null;
    const color = TYPE_BADGE_COLOR[row.id] || 'slate';
    return (
      <span
        key={row.id}
        className={`${uiBadgeMini(color, typeBadgeVariant(row.id))} tabular-nums`}
        title={row.label}
      >
        <span>{row.short}</span>
        <span className="tabular-nums">{n.toLocaleString('es-MX')}</span>
      </span>
    );
  });
}

function TodayBreakdownTable({ section, breakdownLabel }) {
  if (!section.hasTodayBreakdown) return null;
  return (
    <div className={`${uiTable.wrap} !rounded-lg`}>
      <table className={`${uiTable.table} !text-[10px]`}>
        <thead className={uiTable.thead}>
          <tr>
            <th className={`${uiTable.th} !py-1 !text-[9px]`}>{breakdownLabel}</th>
            {LOCATION_ROSTER_TYPE_ROWS.map((row) => (
              <th
                key={row.id}
                className={`${uiTable.th} !py-1 !text-[9px] text-center`}
                title={row.label}
              >
                {row.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={uiTable.tbody}>
          {section.buckets.map((bucket) => {
            const rowTotal = LOCATION_ROSTER_TYPE_ROWS.reduce((s, r) => s + (bucket.counts[r.id] || 0), 0);
            if (rowTotal <= 0) return null;
            return (
              <tr key={bucket.sortKey} className={uiTable.tr}>
                <td className={`${uiTable.td} !py-1 !text-[10px] font-black whitespace-nowrap`}>
                  <span
                    className={
                      bucket.groupKind === 'service'
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : undefined
                    }
                  >
                    {bucket.label}
                  </span>
                </td>
                {LOCATION_ROSTER_TYPE_ROWS.map((row) => {
                  const n = bucket.counts[row.id] || 0;
                  return (
                    <td
                      key={row.id}
                      className={`${uiTable.td} !py-1 text-center ${uiTypography.moneyMuted} !text-[10px]`}
                    >
                      {n > 0 ? (
                        n.toLocaleString('es-MX')
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusSection({ section, breakdownLabel }) {
  if (!section.hasAny) return null;
  return (
    <div className="space-y-1.5 pt-2 first:pt-0 border-t border-slate-200/80 dark:border-slate-700/80 first:border-t-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className={`text-[10px] font-black uppercase tracking-wider shrink-0 ${section.titleClass}`}>
          {section.label}
        </span>
        <TypeBadgeRow totals={section.totals} />
        <span
          className={`${uiRosterSearch.statsHelp} ml-auto shrink-0 !px-0 tabular-nums`}
          title={`Total ${section.label.toLowerCase()} (mismo criterio que el dashboard)`}
        >
          {section.totalInscritos.toLocaleString('es-MX')}
        </span>
      </div>
      <TodayBreakdownTable section={section} breakdownLabel={breakdownLabel} />
    </div>
  );
}

/**
 * Resumen de inscritos por tipo y estado (activos, lista de espera, cancelados).
 */
export default function LocationRosterTypeSummary({ summary }) {
  if (!summary?.hasAny) return null;

  const breakdownLabel = summary.isSundayToday ? 'Por servicio (hoy)' : 'Hoy';
  const sections = summary.sections || [];

  return (
    <section
      className={`${uiSectionPanel('slate')} !p-2.5 !space-y-0`}
      aria-label="Resumen de inscritos por tipo y estado"
    >
      <p className={`${uiDropdown.sectionTitle} !mb-1`}>Inscritos por estado</p>
      {sections.map((section) => (
        <StatusSection key={section.id} section={section} breakdownLabel={breakdownLabel} />
      ))}
    </section>
  );
}
