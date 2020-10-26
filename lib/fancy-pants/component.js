import { scheduleRender, registerRenderer, unregisterRenderer } from './renderer.js';
import { activateTracking, memoizeFunction, createTag, dirtyTag, consumeTag } from './tracking.js';

const ATTRIBUTE_TAGS = Symbol('attribute tags');
const RENDER = Symbol('memoized render');
const templates = new Map();

function dasherize(str) {
  return str.replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
}

function makeTemplateElement(html = '') {
  let element = document.createElement('template');
  element.innerHTML = html;
  return element;
}

/**
 * This is the main class for using the FancyPants system. When extended it
 * will provide easy means for tracking dirty changes and rendering dynamic
 * parts of the custom element's DOM. You have access to both a ShadowDOM and
 * the HTMLElement itself.
 *
 * You don't need to instantiate it yourself as this is done by the insertion
 * of the custom element into the DOM.
 *
 * Once defined use the [.register()]{@link Component.register} method to
 * define the custom element and associate a template to the custom element.
 */
class Component extends HTMLElement {

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
   * class MyComponent extends Component {
   *   constructor() {
   *     super();
   *     this.foobar = tracked();
   *   }
   * }
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
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.appendChild(template.content.cloneNode(true));
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
    activateTracking(this);
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
    } else if (this.template) {
      templateFactory = () => makeTemplateElement(this.template);
    } else {
      templateFactory = () => queryable.querySelector(`template#${this.tagName}`) ?? makeTemplateElement();
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
   * Optional string version of the Shadow DOM template
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
    return undefined;
  }

}

export default Component;
