/** @module component */
import {
  activateTracking,
  memoizeFunction,
  createTag,
  dirtyTag,
  consumeTag,
  setOnTagDirtied
} from './tracking.js';
import {
  scheduleRender,
  registerRenderer,
  unregisterRenderer
} from './renderer.js';

setOnTagDirtied(scheduleRender);

const ATTRIBUTE_TAGS = Symbol('attribute tags');
const RENDER = Symbol('memoized render');
const YIELDS = Symbol('yieldable identifier');
const templates = new Map();
const yieldables = new Map();
const yieldableProxy = new Proxy(yieldables, { get: (t, p) => t.get(p)?.yields() });

function dasherize(str) {
  return str.replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
}

function camelize(str) {
  return dasherize(str).replace(/-([a-z])/g, (_, g1) => g1.toUpperCase());
}

function makeTemplateElement({ template, shadow }) {
  if (template === null && shadow === null) { return null; }
  let element = document.createElement('template');
  if (template) {
    element.innerHTML = template;
  } else if (shadow) {
    element.innerHTML = shadow;
    element.dataset.shadow = true;
  }
  return element;
}

function appendWithSlotableContent(target, content) {
  target.querySelectorAll('[slot]').forEach(node => {
    let slotName = node.getAttribute('slot');
    content.querySelector(`slot[name="${slotName}"]`)?.after(node);
  });
  content.querySelector('slot:not([name])')?.after(...target.childNodes);
  content.querySelectorAll('slot').forEach(node => node.remove());
  target.append(content);
}

/**
 * ```js
 * // Unminified
 * import { componentOf } from 'https://fancy-pants.js.org/component.js';
 *
 * // Minified
 * import { componentOf } from 'https://fancy-pants.js.org/min/component.js';
 * ```
 *
 * Construct a Component class that extends from a specific kind of HTMLElement.
 * Use this if you want a custom element to work like a Component but extend
 * from a more specific type.
 *
 * ```js
 * class MyComponent extends componentOf(HTMLParagraphElement) {
 *   …
 * }
 * MyComponent.register();
 * ```
 *
 * @param {HTMLElement} ElementClass the HTMLElement the component class will extend from
 * @returns Component a FancyPants component that extends from ElementClass
 */
function componentOf(ElementClass) {

  /**
   * ```js
   * // Unminified
   * import Component from 'https://fancy-pants.js.org/component.js';
   *
   * // Minified
   * import Component from 'https://fancy-pants.js.org/min/component.js';
   * ```
   *
   * This is the main class for using the FancyPants system. When extended it
   * will provide easy means for tracking dirty changes and rendering dynamic
   * parts of the custom element's DOM. You have access to both a ShadowDOM and
   * the HTMLElement itself.
   *
   * You don't need to instantiate it yourself as this is done by the insertion
   * of the custom element into the DOM.
   *
   * Use the [.register()]{@link module:component~Component.register} method to
   * define the custom element and associate a template to the custom element.
   */
  class Component extends ElementClass {

    /**
     * Direct access to the Shadow DOM.
     * @instance
     * @memberof Component
     * @member {ShadowRoot} shadow
     */

    /**
     * Perform any setup in the constructor. This
     * is a good place to assign [tracked()]{@link module:tracking.tracked}
     * properties when targeting Mobile Safari browsers.
     *
     * ```js
     * import Component from './fancy-pants/component.js';
     *
     * class MyComponent extends Component {
     *   constructor() {
     *     super();
     *     this.foobar = tracked();
     *   }
     * }
     *
     * MyComponent.register();
     * ```
     *
     * If you do not need to support **Mobile Safari** then you can use class
     * field syntax instead.
     *
     * ```js
     * class MyComponent extends Component {
     *   foobar = tracked();
     * }
     * ```
     */
    constructor() {
      super();
      let template = templates.get(this.tagName.toLowerCase());
      if (template) {
        if (template.dataset.shadow === undefined) {
          appendWithSlotableContent(this, template.content.cloneNode(true));
        } else {
          this.shadow = this.attachShadow({ mode: 'open' });
          this.shadow.appendChild(template.content.cloneNode(true));
        }
      }
      this[ATTRIBUTE_TAGS] = new Map(
        (this.constructor.observedAttributes ?? []).map(i => [i, createTag()])
      );
      this[YIELDS] = this.getAttribute('id') || camelize(this.tagName);
      this[RENDER] = memoizeFunction(() => this.render(yieldableProxy));
    }

    /**
     * Here is a good place to add event listeners to the DOM.
     * Activates tracking and registers this component instance with the renderer.
     * First render is scheduled after this callback.
     *
     * ```js
     * class MyComponent extends Component {
     *   connectedCallback() {
     *     super.connectedCallback();
     *     this.clickHandler = () => this.doSomething();
     *     this.shadow.querySelector('button')
     *       .addEventListener('click', this.clickHandler);
     *   }
     * }
     * ```
     */
    connectedCallback() {
      this.track();
      yieldables.set(this[YIELDS], this);
      registerRenderer(this[RENDER]);
      scheduleRender();
    }

    /**
     * Here is a good place to remove event listeners to the DOM.
     * Removes this component instance from the renderer.
     *
     * ```js
     * class MyComponent extends Component {
     *   disconnectedCallback() {
     *     super.disconnectedCallback();
     *     this.shadow.querySelector('button')
     *       .removeEventListener('click', this.clickHandler);
     *   }
     * }
     * ```
     */
    disconnectedCallback() {
      yieldables.delete(this[YIELDS]);
      unregisterRenderer(this[RENDER]);
    }

    /**
     * This will auto-track any attributes listed in `observedAttributes`.
     *
     * ```js
     * class MyComponent extends Component {
     *   static get observedAttributes() {
     *     return ['foo', 'bar'];
     *   }
     * }
     * ```
     */
    attributeChangedCallback(name) {
      dirtyTag(this[ATTRIBUTE_TAGS].get(name));
    }

    getAttribute(name) {
      consumeTag(this[ATTRIBUTE_TAGS].get(name));
      return super.getAttribute(name);
    }

    hasAttribute(name) {
      consumeTag(this[ATTRIBUTE_TAGS].get(name));
      return super.hasAttribute(name);
    }

    /**
     * Activate tracking on this component. Called automatically during
     * [.connectedCallback()]{@link module:component~Component#connectedCallback}
     * Use this if you want to assign to a tracked property prior to being
     * appended to the DOM.
     *
     * ```js
     * let myComponent = document.createElement('my-component').track();
     * myComponent.foobar = 'This is now tracked';
     * document.body.appendChild(myComponent);
     * ```
     *
     * @returns {this}
     */
    track() {
      activateTracking(this);
      return this;
    }

    /**
     * When this component needs to render this function will be called.
     *
     * ```js
     * class MyComponent extends Component {
     *   render() {
     *     this.shadow.querySelector('.foo').textContent = this.foobar;
     *   }
     * }
     * ```
     *
     * @param {object} attrs an object with all values which have been
     * yielded by parent components index by their camelized name or id of the
     * respective components
     */
    render() {}

    /**
     * Called during child components' rendering to ask for any yielded values.
     * This is a method to pass tracked values to other components in it. Most
     * cases this will be a component that has `null` for the shadow and
     * template but it isn't required. The `render()` and the `yields()` are
     * two separate ways to react to tracked changes but they can be used
     * together. Anything returned from this hook will be passed to any child
     * component's `render()` hook as named argument.
     *
     * ```html
     * <my-provider>
     *   <my-presenter></my-presenter>
     * </my-provider>
     * ```
     *
     * ```js
     * class MyProvider extends Component {
     *   trackedValue = tracked();
     *   static get shadow() { return null; }
     *   yields() {
     *     return { yieldedValue: this.trackedValue };
     *   }
     * }
     * MyProvider.register();
     *
     * class MyPresenter extends Component {
     *   render(attrs) {
     *     let { yieldedValue } = attrs.myProvider;
     *     this.shadow.textContent = yieldedValue;
     *   }
     * }
     * MyPresenter.register();
     * ```
     *
     * @tutorial example10
     * @return any
     */
    yields() {}

    /**
     * Call this static method to define the component as a custom element with
     * the browser.
     *
     * ```js
     * class MyComponent extends Component {
     *   …
     * }
     *
     * MyComponent.register();
     * MyComponent.register('#selector');
     * MyComponent.register(myTemplateNode);
     * ```
     *
     * When defining a template, register will look for a `<template>` element
     * that matches the kabob-case of the component's class name. The shadow
     * DOM can be used instead by adding the `data-shadow` attribute to the
     * template element.
     *
     * @param {HTMLElement|string|undefined} [templatable] optional template
     * element or selector
     * @param {Queryable} [queryable=document] optional scope for the template
     * selector
     */
    static register(templatable, queryable = document) {
      let templateFactory;
      if (typeof templatable === 'string') {
        templateFactory = () => queryable.querySelector(templatable);
      } else if (templatable instanceof Element) {
        templateFactory = () => templatable;
      } else {
        let templateEl = queryable.querySelector(`template#${this.tagName}`);
        templateFactory = () => templateEl ?? makeTemplateElement(this);
      }
      templates.set(this.tagName, templateFactory());
      customElements.define(this.tagName, this);
    }

    /**
     * Optional tag name. Defaults to a dasherized version of the class name
     *
     * ```js
     * class MyComponent extends Component {
     *   static get tagName() {
     *     return 'my-alternative-component-tag-name';
     *   }
     * }
     * ```
     *
     * @member {string}
     */
    static get tagName() {
      return dasherize(this.name);
    }

    /**
     * Optional string version of the Shadow DOM template.
     * Defaults to null.
     *
     * ```js
     * class MyComponent extends Component {
     *   static get shadow() {
     *     return `<p>lorem ipsum</p>`;
     *   }
     * }
     * ```
     *
     * @member {string}
     */
    static get shadow() {
      return null;
    }

    /**
     * Optional string version of the innerHTML template.
     * Defaults to `null`.
     * Return `null` to **disable** appendChild on construction.
     *
     * ```js
     * class MyComponent extends Component {
     *   static get template() {
     *     return `<p>lorem ipsum</p>`;
     *   }
     * }
     * ```
     *
     * @member {string}
     */
    static get template() {
      return null;
    }

  }

  return Component;

}

export default componentOf(HTMLElement);
export { componentOf };
