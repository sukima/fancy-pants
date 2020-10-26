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
 * FancyPants Component
 *
 */
class Component extends HTMLElement {

  /**
   * Direct access to the Shadow DOM.
   * @instance
   * @memberof Component
   * @member {ShadowRoot} shadow
   */

  /**
   * Perform any setup in the `constructor()`. This is a good place to assign
   * `tracked()` properties when targeting Mobile Safari browsers.
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
   */
  connectedCallback() {
    activateTracking(this);
    registerRenderer(this[RENDER]);
    scheduleRender();
  }

  /**
   * Here is a good place to remove event listeners to the DOM.
   * Removes this component instance from the renderer.
   */
  disconnectedCallback() {
    unregisterRenderer(this[RENDER]);
  }

  /**
   * This will auto-track any attributes listed in `observedAttributes`.
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
   */
  render() {}

  /**
   * Call this static method to define the component as a custom element with the browser.
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
   * Optional tagName. Defaults to a dasherized version of the class name
   * @member {string}
   */
  static get tagName() {
    return dasherize(this.name);
  }

  /**
   * Optional string version of the Shadow DOM template
   * @member {string}
   */
  static get template() {
    return undefined;
  }

}

export default Component;
