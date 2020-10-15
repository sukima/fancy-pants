import { executeMutationChain, simpleDom } from './simple-dom.js';
import { setOnTagDirtied, memoizeFunction } from './tracking.js';

const RENDER_OPERATIONS = Symbol('render operations');

const scheduledRenders = new WeakSet();
const currentlyRendering = new WeakSet();

export function makeRenderable(ctx, buildFactory) {
  const { builder, compile, attachEvents } = simpleDom();
  buildFactory.call(ctx, builder);
  ctx[RENDER_OPERATIONS] = compile().map(m => {
    return memoizeFunction((c, q) => executeMutationChain(m, c, q))
  });
  return { attachEvents };
}

export function render(ctx, queryable) {
  let operations = ctx[RENDER_OPERATIONS];
  if (!operations) {
    throw new Error('Object is not renderable');
  }
  renderOperations(operations, ctx, queryable);
}

export function renderOperations(operations, ctx, queryable) {
  if (currentlyRendering.has(ctx)) {
    throw new Error('scheduling a render while currently rendering is not supported');
  }
  if (scheduledRenders.has(ctx)) { return; }
  scheduledRenders.add(ctx);
  Promise.resolve().then(() => updateDom(operations, ctx, queryable));
}

function updateDom(operations, ctx, queryable = ctx) {
  currentlyRendering.add(ctx);
  try {
    for (let op of operations) {
      op(ctx, queryable);
    }
  } finally {
    scheduledRenders.delete(ctx);
    currentlyRendering.delete(ctx);
  }
}

setOnTagDirtied(render);
