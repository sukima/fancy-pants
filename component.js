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

export default class Component extends HTMLElement {

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

  connectedCallback() {
    activateTracking(this);
    registerRenderer(this[RENDER]);
    scheduleRender();
  }

  disconnectedCallback() {
    unregisterRenderer(this[RENDER]);
  }

  attributeChangedCallback(name) {
    dirtyTag(this[ATTRIBUTE_TAGS].get(name));
  }

  getAttribute(name) {
    consumeTag(this[ATTRIBUTE_TAGS].get(name));
    return super.getAttribute(name);
  }

  render() {}

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

  static get tagName() {
    return dasherize(this.name);
  }

}
