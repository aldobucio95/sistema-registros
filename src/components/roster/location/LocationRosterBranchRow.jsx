import React from 'react';

const LocationRosterBranchRow = React.memo(function LocationRosterBranchRow({
  branchPerson,
  parentName,
  relationship,
  displayIndex,
  isMobile,
  renderMobileCard,
  renderDesktopCells,
}) {
  if (isMobile) {
    return renderMobileCard(branchPerson, {
      displayIndex,
      parentName,
      relationship,
    });
  }
  return renderDesktopCells(branchPerson, { displayIndex, parentName, relationship });
}, (prev, next) => (
  prev.branchPerson?.id === next.branchPerson?.id &&
  prev.displayIndex === next.displayIndex &&
  prev.isMobile === next.isMobile &&
  prev.parentName === next.parentName &&
  prev.relationship === next.relationship
));

export default LocationRosterBranchRow;
