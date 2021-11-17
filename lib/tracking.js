/**
 * ```javascript
 * // Unminified
 * import { tracked } from 'https://fancy-pants.js.org/tracking.js';
 *
 * // Minified
 * import { tracked } from 'https://fancy-pants.js.org/min/tracking.js';
 * ```
 *
 * This is the auto-tracking system and a use case for
 * [scheduleRender]{@link module:renderer.scheduleRender}.
 * @module tracking
 */
let $REVISION = 0;
let CURRENT_TRACKER = null;
let scheduleRerender = () => {};
const TRACKABLES = new WeakMap();

/**
 * Represents a value that is tracked. When the value is set it will dirty
 * itself and schedule a render (if applicable). The dirty-ness is taken into
 * account when an instance of Cache consumes and instance of Tracked.
 */
export class Tracked {
  /**
   * @property {number} the latest revision number for this Tracked
   */
  revision = $REVISION;

  #value;

  /**
   * @param {any} [initialValue] an optional initial value for this Tracked
   * instance
   */
  constructor(initialValue) {
    this.#value = initialValue;
  }

  /**
   * This is the property to access the tracked value. Reading this property
   * will consume it. Setting this property will dirty it.
   * @property {any}
   */
  get value() {
    this.consume();
    return this.#value;
  }

  set value(newValue) {
    if (this.#value === newValue) return;
    this.#value = newValue;
    this.dirty();
  }

  /**
   * Will dirty this Tracked instance. It will not change the value.
   */
  dirty() {
    this.revision = ++$REVISION;
    scheduleRerender();
  }

  /**
   * Will mark this as consumed. This does not affect the value property.
   */
  consume() {
    CURRENT_TRACKER?.add(this);
  }

  /**
   * Grab a cached Tracked instance for a particular property on a specific
   * owner. This is used to allow tracking of something without modifying the
   * owner itself. Useful for things like getAttribute/setAttribute on DOM
   * nodes.
   *
   * @prop {Object} owner the object that we want to associate the Tracked with
   * @prop {string} prop the property name we want to associate the Tracked with
   * @prop {Function} [initializer] a function that returns the Tracked initial
   * value if a Tracked hasn't already been created previously
   * @return {Tracked} the cached (or newly cached) Tracked instance for the
   * associated property and owner
   */
  static for(owner, prop, initializer = () => {}) {
    let trackablesForOwner = TRACKABLES.get(owner) ?? new Map();
    let tracked = trackablesForOwner.get(prop) ?? new Tracked(initializer());
    trackablesForOwner.set(prop, tracked);
    TRACKABLES.set(owner, trackablesForOwner);
    return tracked;
  }

  /**
   * Convenience function to make a proxy over an object such that any access
   * to one of its properties will be tracked.
   *
   * @example
   * let obj = { foo: 'FOO' };
   * let trackedProxy = Tracked.proxy(obj);
   * trackedProxy.foo = 'BAR'; // will trigger a render (becomes dirty)
   * obj.foo = 'BAZ'; // will NOT trigger a render
   *
   * @param {Object} [owner] an object to proxy. Default is an empty Object.
   * @return {Proxy}
   */
  static proxy(owner = {}) {
    return new Proxy(owner, {
      get(target, prop) {
        Tracked.for(target, prop).consume();
        return Reflect.get(...arguments);
      },
      set(target, prop) {
        Tracked.for(target, prop).dirty();
        return Reflect.set(...arguments);
      },
    });
  }

  /**
   * Will define a property on an owner that is tracked.
   *
   * ```javascript
   * let obj = {};
   * Tracked.defineProperty(obj, 'foobar', new Tracked('FOO'));
   * ```
   *
   * Is the same as
   *
   * ```javascript
   * let obj = Tracked.activate({
   *   foobar: new Tracked('FOO')
   * });
   * ```
   *
   * @prop {Object} owner the object that we want to define a property on
   * @prop {string} prop the property name we want to define
   * @prop {Tracked} [tracked] a Tracked instance. Default is new Tracked()
   */
  static defineProperty(owner, prop, tracked = new Tracked()) {
    Object.defineProperty(owner, prop, {
      get() {
        return tracked.value;
      },
      set(newValue) {
        tracked.value = newValue;
      },
    });
  }

  /**
   * Loop over the properties of the owner and any properties that are
   * a Tracked instance convert them to a getter/setter.
   *
   * @example
   * class Foo {
   *   bar = new Tracked();
   * }
   * let foo = Tracked.activate(new Foo());
   * foo.bar = 'BAR'; // will trigger a render (becomes dirty)
   *
   * @example
   * let obj = Tracked.activate({ bar: new Tracked('FOO') });
   * foo.bar = 'BAR'; // will trigger a render (becomes dirty)
   *
   * @prop {Object} owner the object er want to convert all Tracked values to
   * a getter/setter
   * @return {Object} the owner
   */
  static activate(owner) {
    for (let prop of Reflect.ownKeys(owner)) {
      let { value: tracked } = Reflect.getOwnPropertyDescriptor(owner, prop);
      if (tracked instanceof Tracked) {
        Tracked.defineProperty(owner, prop, tracked);
      }
    }
    return owner;
  }
}

/**
 * Represents a cache for a tracked value. It uses a function to find the
 * actual value and caches it. Then as long as none of the Tracked instances it
 * encounters during the execution of the function have not dirtied then the
 * result of this Cache's value remains the same. Only when Tracked instances
 * are dirtied would this re-execute the original function to update the cached
 * value.
 *
 * This handles auto-tracking which means that while it is executing the
 * function it is keeping track of any Tracked consumed. It then knows which
 * Tracked to check with when it determines if it needs to re-evaluate the
 * cached value.
 */
export class Cache {
  #cachedValue;
  #cachedRevision = -1;
  #deps = [];

  /**
   * @param {Function} valueFn the function called to update the cached value
   */
  constructor(valueFn) {
    this.valueFn = valueFn;
  }

  /**
   * Execute the value function if it needs to be updated based on any
   * dependent Tracked it encounters.
   * @return {any} the cached value of the previous execution
   */
  execute(...args) {
    if (this.revision > this.#cachedRevision) {
      let { valueFn } = this;
      let currentTracker = new Set();
      let prevTracker = CURRENT_TRACKER;
      setCurrentTracker(currentTracker);

      try {
        this.#cachedValue = valueFn(...args);
      } finally {
        setCurrentTracker(prevTracker);
        this.#deps = Array.from(currentTracker);
        this.#cachedRevision = this.revision;
      }
    }

    CURRENT_TRACKER?.add(this);

    return this.#cachedValue;
  }

  /**
   * @property {any} the cached value
   */
  get value() {
    return this.execute();
  }

  /**
   * @property {number} the latest revision number for this Cache
   */
  get revision() {
    return Math.max(...this.#deps.map(d => d.revision), 0);
  }

  /**
   * Convenience method to wrap a function in a Cache so that it is memoized.
   * @prop {Function} fn the function to be wrapped
   * @return {Function} a memoized version of the function
   */
  static memoize(fn) {
    let cachedFunction = new Cache(fn);
    return function cachedFunctionWrapper(...args) {
      return cachedFunction.execute(...args);
    };
  }
}

/**
 * Used for testing Tracked.consume() method.
 * @private
 * @prop {Set} tracker
 */
export function setCurrentTracker(tracker) {
  CURRENT_TRACKER = tracker;
}

/**
 * Register a function to be called when a Tracked instance is dirtied.
 * There can only be one. This is not used when working with the
 * [renderer]{@link module:renderer} or {@link Component} class as they mange
 * this for you.
 *
 * You would only use this if you were interfacing with this module on your own.
 *
 * @param {function} callback the function to call when tags are dirtied
 */
export function setScheduleRerender(scheduleRerenderFn) {
  scheduleRerender = scheduleRerenderFn;
}

/**
 * Wrap a function to be memoized based on the auto-tracking system.
 * @param {function} fn the function to memoized
 * @return {function} a memoized version of the function
 */
export function memoizeFunction(fn) {
  return Cache.memoize(fn);
}

/**
 * Create a Tracked instance.
 * @see [Tracked]{@link module:tracking.Tracked}
 *
 * @example
 * class Foo {
 *   bar = tracked();
 * }
 * let foo = new Foo();
 * foo.bar.revision; // 0
 * foo.bar.value = 'BAR';
 * foo.bar.revision; // 1
 *
 * @example
 * let foo = { bar: tracked('FOO') };
 * foo.bar.revision; // 0
 * foo.bar.value = 'BAR';
 * foo.bar.revision; // 1
 *
 * @param {any} [initialValue]
 * @return {Tracked}
 */
export function tracked(initialValue) {
  return new Tracked(initialValue);
}

/**
 * This is how all [tracked]{@link module:tracking.tracked} properties are
 * converted from the place holder TrackedProperty object into actual tracked
 * getter/setters. Any object that uses [tracked]{@link module:tracking.tracked}
 * must be passed through `activateTracking` otherwise the properties are
 * useless.
 * @see [Tracked.activate]{@link module:tracking.Tracked.activate}
 *
 * @example
 * class Foo {
 *   bar = tracked();
 * }
 * let foo = activateTracking(new Foo());
 * foo.bar = 'BAR'; // will trigger a render (becomes dirty)
 *
 * @example
 * let obj = activateTracking({ bar: tracked('FOO') });
 * foo.bar = 'BAR'; // will trigger a render (becomes dirty)
 *
 * @param {Object} owner the object to search and replace any Tracked
 * objects.
 * @return {Object} the same owner object passed in to support chaining
 */
export function activateTracking(owner) {
  return Tracked.activate(owner);
}
