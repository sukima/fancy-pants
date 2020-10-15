const EXECUTE = Symbol('execute');
const OPERATIONS = Symbol('operations');
const ATTACH_EVENT = Symbol('attach event');
const QUERYABLE = Symbol('queryable');

const identity = i => i;

class MutationChain {

  constructor({ property, selector, queryable }) {
    if (!property) {
      throw new Error('update called without a preceeding when clause');
    }
    Object.defineProperty(this, 'property', { value: property });
    Object.defineProperty(this, 'selector', { value: selector });
    this[QUERYABLE] = queryable;
    this[OPERATIONS] = [];
  }

  [EXECUTE](ctx, queryable = this[QUERYABLE]) {
    let value = ctx[this.property];
    let element = maybeQueryable(queryable).querySelector(this.selector);
    for (let op of this[OPERATIONS]) {
      op(value, element, ctx);
    }
  }

  run(cb) {
    this[OPERATIONS].push(cb);
    return this;
  }

  html(cb = identity) {
    return this.run((v, e, c) => e.innerHTML = cb.call(c, v));
  }

  text(cb = identity) {
    return this.run((v, e, c) => e.textContent = cb.call(c, v));
  }

  data(name, cb = identity) {
    return this.run((v, e, c) => e.dataset[name] = cb.call(c, v));
  }

  attr(name, cb = identity) {
    return this.run((v, e, c) => {
      let value = cb.call(c, v);
      if (value == null) {
        e.removeAttribute(name);
      } else {
        e.setAttribute(name, value);
      }
    });
  }

  prop(name, cb = identity) {
    return this.run((v, e, c) => e[name] = cb.call(c, v));
  }

}

// class RepeatableMutationChain extends MutationChain {
//   [EXECUTE](ctx) {
//   }
// }

class Eventer {

  constructor({ selector, eventType, listener, queryable }) {
    Object.defineProperty(this, 'selector', { value: selector });
    Object.defineProperty(this, 'eventType', { value: eventType });
    Object.defineProperty(this, 'listener', { value: listener });
    this[QUERYABLE] = queryable;
  }

  [ATTACH_EVENT](queryable = this[QUERYABLE]) {
    let el = this.selector
      ? maybeQueryable(queryable).querySelector(this.selector)
      : queryable;
    let handler = event => {
      if (this.willPreventDefault) { event.preventDefault(); }
      if (this.willStopPropagation) { event.stopPropagation(); }
      this.listener(event);
    };
    el.addEventListener(this.eventType, handler);
    return () => el.removeEventListener(this.eventType, handler);
  }

  preventDefault(enable = true) {
    this.willPreventDefault = enable;
  }

  stopPropagation(enable = true) {
    this.willStopPropagation = enable;
  }

}

export function executeMutationChain(mutationChain, ctx, queryable) {
  return mutationChain[EXECUTE](ctx, queryable);
}

export function simpleDom() {
  let currentProp;
  let renderOperations = [];
  let eventListeners = [];
  const compile = () => Object.freeze(renderOperations);
  const attachEvents = queryable => {
    let removals = eventListeners.map(eventer => eventer[ATTACH_EVENT](queryable));
    return () => removals.forEach(i => i());
  };
  const builder = {
    when(prop) { currentProp = prop; },
    update(selector, queryable) {
      let operation = new MutationChain({ property: currentProp, selector, queryable });
      renderOperations.push(operation);
      return operation;
    },
    // repeat(selector) {
    //   let operation = new RepeatableMutationChain(currentProp, selector);
    //   renderOperations.push(operation);
    //   return operation;
    // },
    event(selector, queryable) {
      let eventManager = new Proxy({}, {
        get(_, method) {
          let lastEventer = eventListeners.slice(-1);
          return lastEventer[method]
            ? (...args) => lastEventer[method](...args)
            : listener => {
              let eventer = new Eventer({ selector, eventType: method, listener, queryable });
              eventListeners.push(eventer);
              return eventManager;
            };
        }
      });
      return eventManager;
    }
  };
  return { builder, compile, attachEvents };
}

export function maybeQueryable(obj) {
  return obj?.querySelector ? obj : document;
}
