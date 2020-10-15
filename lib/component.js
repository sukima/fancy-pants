import { simpleDom } from './simple-dom.js';
import { render, makeRenderable } from './renderer.js';
import { activateTracking } from './tracking.js';

const ATTACH_EVENTS = Symbol('attach events');
const TEARDOWN_EVENTS = Symbol('teardown events');
const SHADOW = Symbol('shadow dom');

const templates = new Map();

export default class Component extends HTMLElement {

  constructor() {
    super();
    let template = templates.get(this.tagName.toLowerCase());
    let { attachEvents } = makeRenderable(this, this.defineDynamicContent);
    this[ATTACH_EVENTS] = attachEvents;
    this[SHADOW] = this.attachShadow({ mode: 'open' });
    this[SHADOW].appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    activateTracking(this);
    this[TEARDOWN_EVENTS] = this[ATTACH_EVENTS](this[SHADOW]);
    render(this);
  }

  disconnectedCallback() {
    this[TEARDOWN_EVENTS]();
  }

  attributeChangedCallback() {
    render(this);
  }

  querySelector(selector) {
    return this[SHADOW].querySelector(selector);
  }

  static register(templateSelector, queryable = document) {
    let template = typeof templateSelector === 'string'
      ? queryable.querySelector(templateSelector)
      : templateSelector;
    templates.set(this.tagName, template);
    customElements.define(this.tagName, this);
  }

  static get tagName() {
    return dasherize(this.name);
  }

}

function dasherize(str) {
  return str
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')
    .toLowerCase();
}
