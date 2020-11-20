/**********************************************\
*  FancyPants — customElements micro-lib   O   *
*  MIT — Copyright © 2020 Devin Weaver    /|\  *
*  https://sukima.github.io/fancy-pants/  </>  *
\**********************************************/
/**
 * This is an **optional** module that might clean up a little boiler plate
 * when it comes to writing render functions and attaching events.
 *
 * It should be noted that this module is agnostic to the rest of FancyPants
 * and can be used independently. If you want a tracked version of the
 * operations this module prepares use the
 * [tracked-dom]{@link module:tracked-dom} module.
 *
 * For example presume we have timer that updates a series of DOM nodes each
 * second; the VanillaJS™ version might look something like the following:
 *
 * ```js
 * let attachEvents = () => {
 *   let form = this.shadow.querySelector('#do-it-live-section');
 *   let handler1 = e => { e.preventDefault(); };
 *   let handler2 = e => { this.updateValues(e.currentTarget); };
 *   form.addEventListener('submit', handler1);
 *   form.addEventListener('input', handler2);
 *   return () => {
 *     form.removeEventListener('submit', handler1);
 *     form.removeEventListener('input', handler2);
 *   };
 * };
 *
 * let render = () => {
 *   let form = this.shadow.querySelector('#do-it-live-section');
 *   form.dataset.state = this.state;
 * };
 * ```
 *
 * With simple-dom the equivalent could be done in either of these ways:
 *
 * ### Chained style
 * ```js
 * let [render, attachEvents] = dom($ => {
 *   $('#my-container', this.shadow)
 *     .data('state', () => this.state)
 *     .event
 *       .submit().preventDefault()
 *       .input(e => this.updateValues(e.currentTarget));
 * });
 * ```
 *
 * ### Procedural style
 * ```js
 * let [render, attachEvents] = dom(({ scope, select, data, event }) => {
 *   scope(this.shadow);
 *   select('#my-container');
 *   data('state', () => this.state);
 *   event.submit().preventDefault();
 *   event.input(e => this.updateValues(e.currentTarget));
 * });
 * ```
 *
 * ## Domain Language
 * The `initFn` function passed to `dom()` will recive a special DSL that you
 * can use to build the operations that will happen when the prepared
 * `render()` function is called or attached emvents via the `attachEvent()`
 * function.
 *
 * The API is statefull which means as the `scope()` and `select()` functions
 * are called they will store their values and apply them to operations defined
 * after till the next encounter of `scope()`/`select()`. These can also be
 * defined in one statement for convinience using the top level function
 * `$('.my-selector', myScope)`.
 *
 * All these functions return themselves thus they can be chained, procedural,
 * or both. Object destructoring can be used as well as the top level
 * function/object.
 *
 * ### $() / scope() / select()
 * The first step in the DSL is to declare the scope and the selector. Scope is
 * the DOM element/node that the operations will work with. It is expected to
 * have a `querySelectorAll()` interface. The default scope is `document`.
 *
 * If you want to add events or manipulate the scope itself then use
 * `selector()` with no argument and it will use the scope and not
 * querySelectorAll within the scope.
 *
 * ### `run()`
 * Run this function passed the element(s) from the selecotor.
 *
 * ```js
 * $('#my-component').run(el => console.log(el.textContent));
 * ```
 * ### `text()`
 * Change the `textContent` of the element(s) with the return value.
 *
 * ```js
 * $('#my-component').text(el => `${el.textContent} echo`);
 * ```
 *
 * ### `html()`
 * Change the `innerHTML` of the element(s) with the return value.
 *
 * ```js
 * $('#my-component').html(el => `${el.textContent} <b>echo</b>`);
 * ```
 *
 * ### `clear()`
 * Remove all children of the element(s) if the return value is truthy.
 *
 * ```js
 * $('#my-component').clear(el => true);
 * ```
 *
 * ### `prop()`
 * Assign the return value to a property on the element(s).
 *
 * ```js
 * $('#my-component').prop('indeterminate', el => this.isIndeterminate);
 * ```
 *
 * ### `data()`
 * Assign the return value to an element(s) `dataset` property.
 *
 * ```js
 * $('#my-component').data('state', el => this.state);
 * ```
 *
 * ### `attr()`
 * Assign or remove an attribute to the element(s). If the return value is
 * `false`, `null`, or `undefined` it will remove the attribute. If `true`
 * add/set the attribute with an empty string. All others is add/set to the
 * value.
 *
 * ```js
 * $('#my-component').attr('foobar', el => 'bar'); // foobar="bar"
 * $('#my-component').attr('foobar', el => 123);   // foobar="123"
 * $('#my-component').attr('foobar', el => 0);     // foobar="0"
 * $('#my-component').attr('foobar', el => true);  // foobar=""
 * $('#my-component').attr('foobar', el => false); // remove foobar
 * $('#my-component').attr('foobar', el => {});    // remove foobar
 * ```
 *
 * ### `value()`
 * Assign the `value` property of the element(s) to the return value.
 *
 * ```js
 * $('#my-component').value(el => 'search term');
 * ```
 *
 * ### `check()`
 *
 * ```js
 * $('#my-component').checked(el => this.isChecked);
 * ```
 *
 * ### `show()`/`hide()`
 * Add/remove the `hidden` attribute to the element(s) depending on the
 * truthy/falsey return value.
 *
 * ```js
 * $('#my-component').show(el => this.isOpen);
 * $('#my-component').hide(el => this.isClosed);
 * ```
 *
 * ### `event`
 * Prepare event handlers to be added to the element(s). This is a proxy object
 * which will take any method call to assign an event. It can also chain both
 * `.preventDefault()` and `.stopPropagation()`. Multiple events can be chained
 * and so can other simple-dom methods but non events will end the current
 * event preparation. The `.on()` can also be used.
 *
 * ```js
 * $('#my-component').event.click(handler);
 * $('#my-component').event.click(handler).preventDefault();
 * $('#my-component')
 *   .event.input(handler).stopPropagation()
 *   .text(() => …)
 *   .event.click(handler).preventDefault()
 *     .on('custom-event', handler).preventDefault()
 *   .html(() => …);
 * ```
 *
 * @module simple-dom
 */
const ATTACH_EVENT = Symbol('attach event');
const NULL_SELECTOR = Symbol('null selector');
const DATA = Symbol('private data');

class Eventer {
  constructor({ scope, selector, eventType , listener }) {
    assertQueryable(scope, selector);
    this[DATA] = { scope, selector, eventType, listener };
  }
  [ATTACH_EVENT]() {
    let { scope, selector, eventType, listener = () => {} } = this[DATA];
    let handler = event => {
      if (this.willPreventDefault) { event.preventDefault(); }
      if (this.willStopPropagation) { event.stopPropagation(); }
      return listener(event);
    };
    let elements = queryAll(scope, selector);
    elements.forEach(i => i.addEventListener(eventType, handler));
    return () => elements.forEach(i => i.removeEventListener(eventType, handler));
  }
  preventDefault() { this.willPreventDefault = true; }
  stopPropagation() { this.willStopPropagation = true; }
}

function queryAll(scope, selector) {
  return selector === NULL_SELECTOR
    ? [scope]
    : scope.querySelectorAll(selector);
}

function assertQueryable(scope, selector) {
  if (!scope?.querySelectorAll) {
    throw new ReferenceError(
      `${scope} does not implement the querySelectorAll interface`
    );
  }
  if (!selector) {
    throw new Error(
      'selector must be defined before registering any tasks'
    );
  }
}

function dslBuilder(tasks, eventers) {
  let currentScope = document;
  let currentSelector;
  let addRun = fn => tasks.push(makeExecutor(fn));
  let chain = fn => (...args) => { fn(...args); return builder; };
  let builder = chain((selector, scope = currentScope) => {
    currentScope = scope;
    currentSelector = selector ?? NULL_SELECTOR;
  });
  let eventManager = new Proxy({}, {
    get(target, method) {
      if (method === 'on') {
        return (eventType, listener) => {
          target.eventer = makeEventer(eventType, listener);
          return eventManager;
        };
      } else if (!Reflect.has(target, 'eventer')) {
        return listener => {
          target.eventer = makeEventer(method, listener);
          return eventManager;
        };
      } else if (Reflect.has(target.eventer, method)) {
        return (...args) => {
          target.eventer[method](...args);
          return eventManager;
        };
      } else {
        delete target.eventer;
        return builder[method];
      }
    }
  });
  function makeEventer(eventType, listener) {
    let eventer = new Eventer({
      scope: currentScope,
      selector: currentSelector,
      eventType,
      listener
    });
    eventers.push(eventer);
    return eventer;
  }
  function makeExecutor(fn) {
    let scope = currentScope;
    let selector = currentSelector;
    assertQueryable(scope, selector);
    return () => queryAll(scope, selector).forEach(fn);
  }
  return Object.assign(builder, {
    event: eventManager,
    scope: chain(scope => {
      currentScope = scope
      currentSelector = NULL_SELECTOR;
    }),
    select: chain(selector => currentSelector = selector ?? NULL_SELECTOR),
    run: chain(addRun),
    text: chain(fn => addRun(el => el.textContent = fn(el))),
    html: chain(fn => addRun(el => el.innerHTML = fn(el))),
    clear: chain((fn = () => true) => addRun(el => fn(el) && (el.innerHTML = ''))),
    prop: chain((prop, fn) => addRun(el => el[prop] = fn(el))),
    data: chain((prop, fn) => addRun(el => el.dataset[prop] = fn(el))),
    attr: chain((prop, fn) => addRun(el => {
      let val = fn(el);
      if (val === true) {
        el.setAttribute(prop, '');
      } else if (val === false || val == null) {
        el.removeAttribute(prop);
      } else {
        el.setAttribute(prop, `${val}`);
      }
    })),
    value: fn => builder.prop('value', fn),
    check: fn => builder.prop('checked', fn),
    show: fn => builder.attr('hidden', fn),
    hide: fn => builder.attr('hidden', el => !fn(el)),
  });
}

function domFactory(initFn, factoryFn) {
  let tasks = [];
  let eventers = [];
  initFn(dslBuilder(tasks, eventers));
  tasks = tasks.map(factoryFn);
  return [
    () => tasks.forEach(i => i()),
    () => {
      let handlers = eventers.map(i => i[ATTACH_EVENT]());
      return () => handlers.forEach(i => i());
    }
  ];
}

/**
 * Call this function to perform all the render operations.
 *
 * ```js
 * let [render, attachEvents] = dom($ => { … });
 * render();
 * ```
 *
 * @typedef RenderOperation
 * @type function
 */

/**
 * Call this function to attach defined events to their respective DOM elements.
 *
 * ```js
 * let [render, attachEvents] = dom($ => { … });
 * let detachEvents = attachEvents();
 * ```
 *
 * @typedef AttachEventsOperation
 * @type function
 * @returns {DetachEventsOperation} the teardown function for events attached
 * by this function
 */

/**
 * Call this function to detach defined events from their respective DOM elements.
 *
 * ```js
 * let [render, attachEvents] = dom($ => { … });
 * let detachEvents = attachEvents();
 * detachEvents();
 * ```
 *
 * @typedef DetachEventsOperation
 * @type function
 */

/**
 * Tuple returned from `dom()` it has two entries: render and attachEvents.
 *
 * ```js
 * let [render, attachEvents] = dom($ => { … });
 * ```
 *
 * @typedef PreparedOperations
 * @type {array}
 * @property {RenderOperation} 0 the render function
 * @property {AttachEventsOperation} 1 the attach events function
 */

/**
 * Build a set of render operations and events to attach.
 *
 * @param {function} initFn the initialization function used to build the
 * prepared return functions
 * @returns {PreparedOperations} a tuple with the prepared `render` function
 * and the prepared `attachEvents` function
 */
function dom(initFn) {
  return domFactory(initFn, i => i);
}

/**
 * In some cases you may want each operation to perform be wrapped in
 * a function (for example to memoize each operation) use this to factory
 * method to do that.
 *
 * ```js
 * import dom from './fancy-pants/simple-dom.js';
 *
 * export default dom.factory(doOperation => {
 *   console.time('rendering operation');
 *   doOperation();
 *   console.timeEnd('rendering operation');
 * });
 * ```
 *
 * @name factory
 * @function
 * @param {function} factoryFn a function which can wrap the resulting {@link RenderOperation}
 * @returns {dom()} a dom() function that will also wrap the RenderOperation function
 */
dom.factory = function factory(factoryFn) {
  return initFn => domFactory(initFn, factoryFn);
};

export default dom;
