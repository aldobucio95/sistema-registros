import React from 'react';
import { Filter } from 'lucide-react';
import RosterFilterCheckboxOption from '../RosterFilterCheckboxOption.jsx';
import { CAR_DATA_FILTER_OPTIONS } from '../../carDataWhatsApp.js';
import {
  BAUTIZOS_ATTENDANCE_FILTER_OPTIONS,
  BAUTIZOS_AGE_FILTER_OPTIONS,
  BAUTIZOS_TRANSPORT_FILTER_OPTIONS,
  PERSON_OF_INTEREST_FILTER_OPTIONS,
  REGISTRATION_STATUS_FILTER_OPTIONS,
} from '../../rosterParticipantFilters.js';
import { countActiveExpenseRegistryQuantityCriteria, createEmptyExpenseRegistryQuantityFilters } from '../../expenseRegistryQuantity.js';
import { uiDropdown } from '../../ui/uiFormatClasses.js';

/** Filtros de cantidad dinámica para gastos (mismos criterios que Registro Global). */
export default function ExpenseRegistryQuantityFiltersDropdown({
  eventId,
  eventType,
  isCampa = false,
  isBautizos = false,
  isResponsivaEnabled = false,
  genders = ['Hombre', 'Mujer'],
  visibleLocations = [],
  filters,
  onFiltersChange,
  locationFilters = [],
  onLocationFiltersChange,
  matchCount = 0,
  countForOption,
  showOptionCounts = true,
  open = false,
  onOpenChange,
  dropdownRootId = 'expense-registry-qty-filters',
}) {
  const activeCount = countActiveExpenseRegistryQuantityCriteria(filters, locationFilters, eventType);
  const cn = (num) =>
    showOptionCounts ? (
      <span className="text-slate-400 font-bold tabular-nums text-[11px]">
        ({num == null ? '…' : num})
      </span>
    ) : null;
  const cfo = (key, value) => {
    if (!showOptionCounts || !open || typeof countForOption !== 'function') return null;
    return countForOption(key, value);
  };

  const setFilter = (key, value) => {
    onFiltersChange((prev) => ({
      ...prev,
      [key]: prev[key] === value ? 'all' : value,
    }));
  };

  const grOption = (filterKey, optionValue, checked, onChange, children, className = uiDropdown.optionRow) => (
    <RosterFilterCheckboxOption
      key={`${filterKey}-${optionValue}`}
      eventId={eventId}
      filterKey={filterKey}
      optionValue={optionValue}
      checked={checked}
      onChange={onChange}
      className={className}
    >
      {children}
    </RosterFilterCheckboxOption>
  );

  const attendanceOpts = BAUTIZOS_ATTENDANCE_FILTER_OPTIONS;
  const transportBautOpts = BAUTIZOS_TRANSPORT_FILTER_OPTIONS;
  const ageOpts = BAUTIZOS_AGE_FILTER_OPTIONS;
  const regStatusOpts = REGISTRATION_STATUS_FILTER_OPTIONS;
  const poiOpts = PERSON_OF_INTEREST_FILTER_OPTIONS;
  const carOpts = CAR_DATA_FILTER_OPTIONS;

  return (
    <div className="relative" data-dropdown-root={dropdownRootId}>
      <button
        type="button"
        onClick={() => onOpenChange?.(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200 transition-colors w-full justify-center"
      >
        <Filter size={14} />
        Filtros de cantidad
        {activeCount > 0 ? (
          <span className="min-h-[1.125rem] min-w-[1.125rem] px-1 flex items-center justify-center rounded-full bg-indigo-600 text-white text-[9px] font-black leading-none tabular-nums">
            {activeCount > 99 ? '99+' : activeCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          className={`absolute left-0 right-0 sm:left-auto sm:right-0 mt-2 z-40 w-[min(320px,calc(100vw-2rem))] max-h-[min(28rem,calc(100vh-10rem))] overflow-y-auto overscroll-y-contain bg-white border border-slate-200 rounded-xl shadow-xl p-3 space-y-3`}
        >
          <button
            type="button"
            onClick={() => {
              onFiltersChange(createEmptyExpenseRegistryQuantityFilters());
              onLocationFiltersChange?.([]);
            }}
            className="w-full py-2 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-lg"
          >
            Limpiar filtros
          </button>
          <p className="text-[10px] text-slate-500 leading-snug border-b border-slate-100 pb-2">
            Coincidencias actuales: <span className="font-black text-indigo-700 tabular-nums">{matchCount}</span>
            . Los criterios quedan fijos al guardar el gasto; la cantidad se recalcula al registrarse más personas.
          </p>
          <div>
            <p className={uiDropdown.sectionTitle}>Estado de registro</p>
            {regStatusOpts.map((op) =>
              grOption(
                'filterRegistrationStatus',
                op.id,
                filters.filterRegistrationStatus === op.id,
                () => setFilter('filterRegistrationStatus', op.id),
                <>
                  {op.label} {cn(cfo('filterRegistrationStatus', op.id))}
                </>
              )
            )}
          </div>
          {visibleLocations.length > 0 ? (
            <div>
              <p className={uiDropdown.sectionTitle}>Sede</p>
              {visibleLocations.map((loc) => {
                const checked = locationFilters.includes(loc);
                return (
                  <label key={loc} className={uiDropdown.optionRow}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded accent-indigo-600"
                      checked={checked}
                      onChange={() => {
                        onLocationFiltersChange?.((prev) =>
                          checked ? prev.filter((x) => x !== loc) : [...prev, loc]
                        );
                      }}
                    />
                    {loc} {cn(cfo('__location__', loc))}
                  </label>
                );
              })}
              <p className="text-[9px] text-slate-400 mt-1">Sin sedes marcadas = todas las visibles.</p>
            </div>
          ) : null}
          {isCampa ? (
            <>
              <div>
                <p className={uiDropdown.sectionTitle}>Asignación</p>
                {['all', 'Teens', 'Jóvenes', 'Ambos'].map((op) =>
                  grOption(
                    'filterAssignment',
                    op,
                    filters.filterAssignment === op,
                    () => setFilter('filterAssignment', op),
                    <>
                      {op === 'all' ? 'Todas' : op} {cn(cfo('filterAssignment', op))}
                    </>
                  )
                )}
              </div>
              <div>
                <p className={uiDropdown.sectionTitle}>Servidor</p>
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'camperos', label: 'Camperos' },
                  { id: 'servidor-teens', label: 'Servidores en Teens' },
                  { id: 'servidor-jovenes', label: 'Servidores en Jóvenes' },
                  { id: 'servidor-ambos', label: 'Servidores (Ambos)' },
                ].map((op) =>
                  grOption(
                    'filterRosterRole',
                    op.id,
                    filters.filterRosterRole === op.id,
                    () => setFilter('filterRosterRole', op.id),
                    <>
                      {op.label} {cn(cfo('filterRosterRole', op.id))}
                    </>
                  )
                )}
              </div>
              <div>
                <p className={uiDropdown.sectionTitle}>Beca</p>
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'becado', label: 'Cualquier becado' },
                  { id: 'No', label: 'No' },
                  { id: 'partial', label: 'Parcial' },
                  { id: 'total', label: 'Total' },
                ].map((op) =>
                  grOption(
                    'filterScholarship',
                    op.id,
                    filters.filterScholarship === op.id,
                    () => setFilter('filterScholarship', op.id),
                    <>
                      {op.label} {cn(cfo('filterScholarship', op.id))}
                    </>
                  )
                )}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Bautizo</p>
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'teens', label: 'Si se bautiza en Teens' },
                  { id: 'jovenes', label: 'Si se bautiza en Jóvenes' },
                  { id: 'no', label: 'No se bautiza' },
                ].map((op) =>
                  grOption(
                    'filterBaptism',
                    op.id,
                    filters.filterBaptism === op.id,
                    () => setFilter('filterBaptism', op.id),
                    <>
                      {op.label} {cn(cfo('filterBaptism', op.id))}
                    </>
                  )
                )}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Estado civil</p>
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'single', label: 'Soltero' },
                  { id: 'married', label: 'Casado' },
                  { id: 'pending-spouse', label: 'Pendiente de asignar pareja' },
                ].map((op) =>
                  grOption(
                    'filterMaritalStatus',
                    op.id,
                    filters.filterMaritalStatus === op.id,
                    () => setFilter('filterMaritalStatus', op.id),
                    <>
                      {op.label} {cn(cfo('filterMaritalStatus', op.id))}
                    </>
                  )
                )}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Tipo de pago</p>
                {['all', 'Efectivo', 'Tarjeta'].map((op) =>
                  grOption(
                    'filterPaymentType',
                    op,
                    filters.filterPaymentType === op,
                    () => setFilter('filterPaymentType', op),
                    <>
                      {op === 'all' ? 'Todos' : op} {cn(cfo('filterPaymentType', op))}
                    </>
                  )
                )}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Transporte</p>
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'go-bus', label: 'Llega en camión' },
                  { id: 'return-bus', label: 'Regresa en camión' },
                  { id: 'go-car', label: 'Llega en carro' },
                  { id: 'return-car', label: 'Regresa en carro' },
                ].map((op) =>
                  grOption(
                    'filterTransport',
                    op.id,
                    filters.filterTransport === op.id,
                    () => setFilter('filterTransport', op.id),
                    <>
                      {op.label} {cn(cfo('filterTransport', op.id))}
                    </>
                  )
                )}
              </div>
            </>
          ) : null}
          {isBautizos ? (
            <>
              <div>
                <p className={uiDropdown.sectionTitle}>Tipo de asistencia</p>
                {attendanceOpts.map((op) =>
                  grOption(
                    'filterBautizosAttendance',
                    op.id,
                    filters.filterBautizosAttendance === op.id,
                    () => setFilter('filterBautizosAttendance', op.id),
                    <>
                      {op.label} {cn(cfo('filterBautizosAttendance', op.id))}
                    </>
                  )
                )}
              </div>
              <div>
                <p className={uiDropdown.sectionTitle}>Transporte</p>
                {transportBautOpts.map((op) =>
                  grOption(
                    'filterTransport',
                    op.id,
                    filters.filterTransport === op.id,
                    () => setFilter('filterTransport', op.id),
                    <>
                      {op.label} {cn(cfo('filterTransport', op.id))}
                    </>
                  )
                )}
              </div>
              <div>
                <p className={uiDropdown.sectionTitle}>Edad</p>
                {ageOpts.map((op) =>
                  grOption(
                    'filterAge',
                    op.id,
                    filters.filterAge === op.id,
                    () => setFilter('filterAge', op.id),
                    <>
                      {op.label} {cn(cfo('filterAge', op.id))}
                    </>
                  )
                )}
              </div>
              <div>
                <p className={uiDropdown.sectionTitle}>Datos de carro</p>
                {carOpts.map((op) =>
                  grOption(
                    'filterCarDataPending',
                    op.id,
                    filters.filterCarDataPending === op.id,
                    () => setFilter('filterCarDataPending', op.id),
                    <>
                      {op.label} {cn(cfo('filterCarDataPending', op.id))}
                    </>
                  )
                )}
              </div>
            </>
          ) : null}
          {!isCampa && !isBautizos ? (
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Servidor y asistencia</p>
              {[
                { id: 'all', label: 'Todos' },
                { id: 'camperos', label: 'Camperos' },
                { id: 'empleado', label: 'Empleados' },
                { id: 'cortesia', label: 'Cortesías' },
              ].map((op) =>
                grOption(
                  'filterRosterRole',
                  op.id,
                  filters.filterRosterRole === op.id,
                  () => setFilter('filterRosterRole', op.id),
                  <>
                    {op.label} {cn(cfo('filterRosterRole', op.id))}
                  </>
                )
              )}
            </div>
          ) : null}
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Liquidación</p>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'liquidado', label: 'Liquidado' },
              { id: 'pendiente', label: 'Falta por liquidar' },
              { id: 'saldo-favor', label: 'Saldo a favor' },
            ].map((op) =>
              grOption(
                'filterLiquidation',
                op.id,
                filters.filterLiquidation === op.id,
                () => setFilter('filterLiquidation', op.id),
                <>
                  {op.label} {cn(cfo('filterLiquidation', op.id))}
                </>
              )
            )}
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">WhatsApp</p>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'pending', label: 'Pendiente de enviar' },
            ].map((op) =>
              grOption(
                'filterWhatsAppPending',
                op.id,
                filters.filterWhatsAppPending === op.id,
                () => setFilter('filterWhatsAppPending', op.id),
                <>
                  {op.label} {cn(cfo('filterWhatsAppPending', op.id))}
                </>
              )
            )}
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">ID VNPM</p>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'first', label: 'Primera vez' },
              { id: 'not-first', label: 'No primera vez' },
            ].map((op) =>
              grOption(
                'filterFirstTimeId',
                op.id,
                filters.filterFirstTimeId === op.id,
                () => setFilter('filterFirstTimeId', op.id),
                <>
                  {op.label} {cn(cfo('filterFirstTimeId', op.id))}
                </>
              )
            )}
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Devolución pendiente</p>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'pending', label: 'Con devolución pendiente' },
              { id: 'none', label: 'Sin devolución pendiente' },
            ].map((op) =>
              grOption(
                'filterPendingRefund',
                op.id,
                filters.filterPendingRefund === op.id,
                () => setFilter('filterPendingRefund', op.id),
                <>
                  {op.label} {cn(cfo('filterPendingRefund', op.id))}
                </>
              )
            )}
          </div>
          {isResponsivaEnabled ? (
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Responsiva</p>
              {[
                { id: 'all', label: 'Todos' },
                { id: 'pending', label: 'Pendiente' },
                { id: 'delivered', label: 'Entregada' },
                { id: 'na', label: 'No aplica' },
              ].map((op) =>
                grOption(
                  'filterResponsiva',
                  op.id,
                  filters.filterResponsiva === op.id,
                  () => setFilter('filterResponsiva', op.id),
                  <>
                    {op.label} {cn(cfo('filterResponsiva', op.id))}
                  </>
                )
              )}
            </div>
          ) : null}
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Personas de interés</p>
            {poiOpts.map((op) =>
              grOption(
                'filterPersonOfInterest',
                op.id,
                filters.filterPersonOfInterest === op.id,
                () => setFilter('filterPersonOfInterest', op.id),
                <>
                  {op.label} {cn(cfo('filterPersonOfInterest', op.id))}
                </>
              )
            )}
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Género</p>
            {['all', ...genders].map((op) =>
              grOption(
                'filterGender',
                op,
                filters.filterGender === op,
                () => setFilter('filterGender', op),
                <>
                  {op === 'all' ? 'Todos' : op} {cn(cfo('filterGender', op))}
                </>
              )
            )}
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Salud</p>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'allergy', label: 'Con alergias' },
              { id: 'disease', label: 'Con enfermedades' },
              { id: 'disability', label: 'Con discapacidades' },
            ].map((op) =>
              grOption(
                'filterMedical',
                op.id,
                filters.filterMedical === op.id,
                () => setFilter('filterMedical', op.id),
                <>
                  {op.label} {cn(cfo('filterMedical', op.id))}
                </>
              )
            )}
          </div>
          {isCampa ? (
            <>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Nado</p>
                {['all', 'Sí', 'No'].map((op) =>
                  grOption(
                    'filterSwim',
                    op,
                    filters.filterSwim === op,
                    () => setFilter('filterSwim', op),
                    <>
                      {op === 'all' ? 'Todos' : op} {cn(cfo('filterSwim', op))}
                    </>
                  )
                )}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Sede de salida</p>
                {['all', ...visibleLocations].map((op) =>
                  grOption(
                    'filterTravelFrom',
                    op,
                    filters.filterTravelFrom === op,
                    () => setFilter('filterTravelFrom', op),
                    <>
                      {op === 'all' ? 'Todas' : op} {cn(cfo('filterTravelFrom', op))}
                    </>
                  )
                )}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Sede de regreso</p>
                {['all', ...visibleLocations].map((op) =>
                  grOption(
                    'filterTravelTo',
                    op,
                    filters.filterTravelTo === op,
                    () => setFilter('filterTravelTo', op),
                    <>
                      {op === 'all' ? 'Todas' : op} {cn(cfo('filterTravelTo', op))}
                    </>
                  )
                )}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
