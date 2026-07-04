import { computeWorkspaceSidebarBadges } from '../workspaceSidebarBadgesCompute.js';
import { computeTransportPlanningData } from './computeTasks/transportPlanningData.js';

self.onmessage = (event) => {
  const { id, type, payload } = event.data || {};
  try {
    let result;
    switch (type) {
      case 'sidebarBadges':
        result = computeWorkspaceSidebarBadges(payload);
        break;
      case 'transportPlanning':
        result = computeTransportPlanningData(payload);
        break;
      default:
        throw new Error(`Unknown compute job: ${type}`);
    }
    self.postMessage({ id, ok: true, result });
  } catch (err) {
    self.postMessage({
      id,
      ok: false,
      error: String(err?.message || err),
    });
  }
};
