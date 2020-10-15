const REVISION = Symbol('REVISION');

let CURRENT_REVISION = 0;
let currentComputation = null;
let onTagDirtied = () => {};

class Tag {
  [REVISION] = CURRENT_REVISION;
}

class Trackable {
  constructor(initialValue) {
    this.initialValue = initialValue;
  }
}

export function setOnTagDirtied(callback) {
  onTagDirtied = callback;
}

export function createTag() {
  return new Tag();
}

export function dirtyTag(tag, ctx) {
  if (currentComputation?.has(tag)) {
    throw new Error('Cannot dirty tag that has been used during a computation');
  }
  tag[REVISION] = ++CURRENT_REVISION;
  onTagDirtied(ctx);
}

export function consumeTag(tag) {
  if (!currentComputation) { return; }
  currentComputation.add(tag);
}

function getMax(tags) {
  return Math.max(...tags.map(t => t[REVISION]));
}

export function memoizeFunction(fn) {
  let lastValue, lastRevision, lastTags;
  return (...args) => {
    if (lastTags && getMax(lastTags) === lastRevision) {
      if (currentComputation && lastTags.length > 0) {
        currentComputation = new Set([...currentComputation, ...lastTags]);
      }
      return lastValue;
    }
    let previousComputation = currentComputation;
    currentComputation = new Set();

    try {
      lastValue = fn(...args);
    } finally {
      lastTags = Array.from(currentComputation);
      lastRevision = getMax(lastTags);

      if (previousComputation && lastTags.length > 0) {
        previousComputation = new Set([...previousComputation, ...lastTags]);
      }

      currentComputation = previousComputation;
    }

    return lastValue;
  };
}

function isTrackableDescriptor(descriptor) {
  return descriptor.value instanceof Trackable;
}

function trackedDescriptor(initialValue) {
  let tags = new WeakMap();
  let values = new WeakMap();
  return {
    get() {
      if (!values.has(this)) {
        values.set(this, initialValue);
        tags.set(this, createTag());
      }
      consumeTag(tags.get(this));
      return values.get(this);
    },
    set(value) {
      values.set(this, value);
      if (!tags.has(this)) {
        tags.set(this, createTag());
      }
      dirtyTag(tags.get(this), this);
    }
  };
}

export function tracked(initialValue) {
  return new Trackable(initialValue);
}

export function defineTrackedProp(ctx, propName, initialValue) {
  Reflect.defineProperty(ctx, propName, trackedDescriptor(initialValue));
}

export function activateTracking(ctx) {
  for (let prop of Reflect.ownKeys(ctx)) {
    let descriptor = Reflect.getOwnPropertyDescriptor(ctx, prop);
    if (!isTrackableDescriptor(descriptor)) { continue; }
    defineTrackedProp(ctx, prop, descriptor.value.initialValue);
  }
}
