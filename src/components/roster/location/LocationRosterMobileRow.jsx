import React from 'react';

function financeSig(finance) {
  if (!finance) return '';
  return `${finance.liquidationTarget}|${finance.paid}|${finance.paymentHistoryLen}`;
}

function rowPropsEqual(prev, next) {
  return (
    prev.person?.id === next.person?.id &&
    prev.loc === next.loc &&
    prev.displayIndex === next.displayIndex &&
    prev.isExpanded === next.isExpanded &&
    financeSig(prev.finance) === financeSig(next.finance)
  );
}

const LocationRosterMobileRow = React.memo(function LocationRosterMobileRow({
  person,
  loc,
  displayIndex,
  isExpanded,
  finance,
  renderCard,
}) {
  return renderCard(person, loc, {
    key: person.id,
    displayIndex,
    isExpanded,
    finance,
  });
}, rowPropsEqual);

export default LocationRosterMobileRow;
