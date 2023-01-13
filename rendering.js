/**********************************************\
*  FancyPants — customElements micro-lib   O   *
*  MIT — Copyright © 2021 Devin Weaver    /|\  *
*  https://fancy-pants.js.org/   v3.0.0   </>  *
\**********************************************/
/**
 * ```js
 * // Unminified
 * import { registerRenderer, unregisterRenderer, scheduleRender }
 *   from 'https://fancy-pants.js.org/rendering.js';
 *
 * // Minified
 * import { registerRenderer, unregisterRenderer, scheduleRender }
 *   from 'https://fancy-pants.js.org/min/rendering.js';
 * ```
 *
 * This is the global rendering cycle. It is built into the {@link Component}
 * implementation but can also be used outside of a Component.
 * @module rendering
 */
let renderScheduled = false;
const renderOperations = new Set();

/**
 * @param {function} renderFn the function to add to the operations queue
 */
export function registerRenderer(renderFn) {
  renderOperations.add(renderFn);
}

/**
 * @param {function} renderFn the function to remove from the operations queue
 */
export function unregisterRenderer(renderFn) {
  renderOperations.delete(renderFn);
}

/**
 * Will schedule a render for the next microtask loop
 */
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
