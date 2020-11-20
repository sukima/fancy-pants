/**********************************************\
*  FancyPants — customElements micro-lib   O   *
*  MIT — Copyright © 2020 Devin Weaver    /|\  *
*  https://sukima.github.io/fancy-pants/  </>  *
\**********************************************/
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
const templates = new Map();

function dasherize(str) {
  return str.replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
}

function makeTemplateElement(html) {
  if (html === null) { return null; }
  let element = document.createElement('template');
  element.innerHTML = html ?? '';
  return element;
}

/**
 * Construct a Component class that extends from a specific kind of HTMLElement.
 * Use this if you want a custom element to work like a Component but extend
 * from a more specific type.
 *
 * ```js
 * import { componentOf } from './fancy-pants/component.js';
 *
 * class MyComponent extends componentOf(HTMLParagraphElement) {
 *   …
 * }
 *
 * MyComponent.register();
 * ```
 *
 * @param {HTMLElement} ElementClass the HTMLElement the component class will extend from
 * @returns Component a FancyPants component that extends from ElementClass
 */
function componentOf(ElementClass) {

  /**
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
        this.shadow = this.attachShadow({ mode: 'open' });
        this.shadow.appendChild(template.content.cloneNode(true));
      }
      this[RENDER] = memoizeFunction(() => this.render());
      this[ATTRIBUTE_TAGS] = new Map(
        (this.constructor.observedAttributes ?? []).map(i => [i, createTag()])
      );
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
     */
    render() {}

    /**
     * Call this static method to define the component as a custom element with the browser.
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
     * @param {HTMLElement|string|undefined} [templatable] optional template element or selector
     * @param {Queryable} [queryable=document] optional scope for the template selector
     */
    static register(templatable, queryable = document) {
      let templateFactory;
      if (typeof templatable === 'string') {
        templateFactory = () => queryable.querySelector(templatable);
      } else if (templatable instanceof Element) {
        templateFactory = () => templatable;
      } else {
        let templateEl = queryable.querySelector(`template#${this.tagName}`);
        templateFactory = () => templateEl ?? makeTemplateElement(this.template);
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
     * Defaults to `<slot></slot>`.
     * Return `null` to **disable** the ShadowDOM (`this.shadow`).
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
      return '<style>:host { all: inherit; }</style><slot></slot>';
    }

  }

  return Component;

}

export default componentOf(HTMLElement);
export { componentOf };