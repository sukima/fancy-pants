/**********************************************\
*  FancyPants — customElements micro-lib   O   *
*  MIT — Copyright © 2021 Devin Weaver    /|\  *
*  https://fancy-pants.js.org/   v2.5.0   </>  *
\**********************************************/
/**
 * ```js
 * // Unminified
 * import { tracked, activateTracking } from 'https://fancy-pants.js.org/tracking.js';
 *
 * // Minified
 * import { tracked, activateTracking } from 'https://fancy-pants.js.org/min/tracking.js';
 * ```
 *
 * This is the auto-tracking system and is the main method to
 * [scheduleRender]{@link module:renderer.scheduleRender}.
 * @module tracking
 */
const REVISION = Symbol('REVISION');

let CURRENT_REVISION = 0;
let currentComputation = null;
let onTagDirtied = () => {};

class Tag {
  constructor() {
    this[REVISION] = CURRENT_REVISION;
  }
}

class TrackedProperty {
  constructor(initializer) {
    this.initializer = initializer;
  }
}

/**
 * Register a function to be called when a tracked property is dirtied.
 * There can only be one. This is not used when working with the
 * [renderer]{@link module:renderer} or {@link Component} class as they mange
 * this for you.
 *
 * You would only use this if you were interfacing with this module on your own.
 *
 * @param {function} callback the function to call when tags are dirtied
 */
export function setOnTagDirtied(callback) {
  onTagDirtied = callback;
}

/**
 * If you need to manually handle tracking you can use this to get a unique tag
 * for [dirtyTag]{@link module:tracking.dirtyTag} and
 * [consumeTag]{@link module:tracking.consumeTag}.
 *
 * @return {Tag} a tag object to be used by other tracking methods
 */
export function createTag() {
  return new Tag();
}

/**
 * @param {Tag} tag a tag object created with
 * [createTag]{@link module:tracking.createTag}
 */
export function dirtyTag(tag) {
  if (currentComputation?.has(tag)) {
    throw new Error('Cannot dirty a tag during a computation');
  }
  tag[REVISION] = ++CURRENT_REVISION;
  onTagDirtied();
}

/**
 * @param {Tag} tag a tag object created with
 * [createTag]{@link module:tracking.createTag}
 */
export function consumeTag(tag) {
  if (!(currentComputation && tag instanceof Tag)) { return; }
  currentComputation.add(tag);
}

function getMax(tags) {
  return Math.max(...tags.map(t => t[REVISION]));
}

/**
 * Wrap a function to be memoized based on the auto-tracking system.
 * @param {function} fn the function to memoize
 * @return {function} a memoized version of the fn
 */
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

function isTrackedPropertyDescriptor(descriptor) {
  return descriptor.value instanceof TrackedProperty;
}

function trackedDescriptor(initializer = () => {}) {
  let tags = new WeakMap();
  let values = new WeakMap();
  return {
    get() {
      if (!values.has(this)) {
        values.set(this, initializer.call(this));
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
      dirtyTag(tags.get(this));
    }
  };
}

/**
 * Returns a TrackedProperty object which is a representation of a tracked
 * property. It is of no use until
 * [activateTracking]{@link module:tracking.activateTracking} converts them
 * into getters and setters,
 *
 * @param {any} [initialValue] any initial value the tracked property will
 * have. Pass a function to have it execute on initialization.
 * @return {TrackedProperty} an internal representatino of a tracked property.
 * Object must be activated with {@link tracking.activateTracking} to be of any
 * use.
 */
export function tracked(initialValue) {
  return new TrackedProperty(
    typeof initialValue === 'function' ? initialValue : () => initialValue
  );
}

/**
 * Manually add a tracked getter/setter to an object. This can be used in lieu
 * of [tracked]{@link module:tracked.tracked} and
 * [activateTracking]{@link module:tracked.activateTracking}
 *
 * ```js
 * let obj = {};
 * defineTrackedProp(ctx, 'foobar', () => 'FOO');
 * ```
 *
 * Is the same as
 *
 * ```js
 * let obj = activateTracking({
 *   foobar: tracked('FOO')
 * });
 * ```
 *
 * @param {Object} ctx the object to assign a tracked getter/setter on
 * @param {string} propName the name of the tracked property
 * @param {function} [initializer] a function that returns the property's
 * initial value.
 */
export function defineTrackedProp(ctx, propName, initializer) {
  Reflect.defineProperty(ctx, propName, trackedDescriptor(initializer));
}

/**
 * This is how all [tracked]{@link module:tracking.tracked} properties are
 * converted from the place holder TrackedProperty object into actual tracked
 * getter/setters. Any object that uses [tracked]{@link module:tracking.tracked}
 * must be passed through `activateTracking` otherwise the properties are
 * useless.
 *
 * ```js
 * let obj = activateTracking({
 *   foobar: tracked('FOO')
 * });
 * ```
 *
 * @param {Object} ctx the object to search and replace any TrackedProperty
 * objects.
 * @return {Object} the same ctx object passed in to support chaining
 */
export function activateTracking(ctx) {
  for (let prop of Reflect.ownKeys(ctx)) {
    let descriptor = Reflect.getOwnPropertyDescriptor(ctx, prop);
    if (!isTrackedPropertyDescriptor(descriptor)) { continue; }
    defineTrackedProp(ctx, prop, descriptor.value.initializer);
  }
  return ctx;
}
