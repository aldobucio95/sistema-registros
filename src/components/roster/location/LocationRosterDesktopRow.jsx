import React from 'react';

function financeSig(finance) {
  if (!finance) return '';
  return `${finance.liquidationTarget}|${finance.paid}|${finance.paymentHistoryLen}`;
}

const LocationRosterDesktopRow = React.memo(function LocationRosterDesktopRow({
  person,
  loc,
  displayIndex,
  isExpanded,
  finance,
  renderRowContent,
  renderExpandedContent,
}) {
  return (
    <>
      {renderRowContent(person, loc, { displayIndex, isExpanded, finance })}
      {isExpanded && renderExpandedContent
        ? renderExpandedContent(person, loc, { displayIndex })
        : null}
    </>
  );
}, (prev, next) => (
  prev.person?.id === next.person?.id &&
  prev.loc === next.loc &&
  prev.displayIndex === next.displayIndex &&
  prev.isExpanded === next.isExpanded &&
  financeSig(prev.finance) === financeSig(next.finance)
));

export default LocationRosterDesktopRow;
