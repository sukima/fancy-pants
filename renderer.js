import { setOnTagDirtied } from './tracking.js';

let renderScheduled = false;
const renderOperations = new Set();

export function registerRenderer(renderFn) {
  renderOperations.add(renderFn);
}

export function unregisterRenderer(renderFn) {
  renderOperations.delete(renderFn);
}

export function scheduleRender() {
  if (renderScheduled) { return; }
  renderScheduled = true;
  Promise.resolve().then(executeRenderOperations);
}

function executeRenderOperations() {
  try {
    renderOperations.forEach(i => i());
  } finally {
    renderScheduled = false;
  }
}

setOnTagDirtied(scheduleRender);
