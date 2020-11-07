## A refresher (crash) course on custom elements

* Custom elements must have at least one dash in their names
* Custom elements are inert in HTML until `customElements.define(…)` in JavaScript
* Custom elements are JavaScript classes extended from `HTMLElement` or a descendent of one
* Custom elements have several life cycle hooks
* Custom elements can either sandbox their content (ShadowDOM) or directly manipulate the document
* Custom elements can use a ShadowDOM to (sort of) inject content into their own sandbox
* Templating, if any, is on the developer to implement
* Updating (re-rendering) is also on the developer to implement

The descriptions above got a little weird near the end of that list. That is
because custom elements focus on one job and leave the pretty packaging to the
developer to invent. This leaves far too much room for interpretation on the
student when learning about custom elements. In fact I myself am still trying
to wrap my head around them. Which is likely a reason why they haven't gain
wide spread popularity like React did.

In the end though depending on the scale of your project custom elements might
be just enough to help without needing a huge framework to work around them.

FancyPants sits in the middle between the bare metal of the browsers' API and
helping remove the boiler plate of re-running update code in a performant
manor.

### Hello World — Vanilla code

First we can just plunk down a custom element into the HTML and it remains
inert.

```html
<hello-world></hello-world>
```

In the JS we will make a simple hello world custom element definition:

```js
class HelloWorld extends HTMLElement {
  constructor() {
    super();
    this.textContent = 'Hello World';
  }
}

customElements.define('hello-world', HelloWorld);
```

You can manipulate the child DOM nodes on your own or you could also scope the
DOM into a ShadowDOM which lets you scope things like CSS and IDs. Basically
a sand boxed setup.

```js
class HelloWorld extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.innerHTML = `
      <style>
      span { background-color: #bada55; }
      </style>
      <span>Hello World</span>
    `;
  }
}

customElements.define('hello-world', HelloWorld);
```

A smell of placing a style on a global tag name like this might raise a flag
but in this example it is safe because the style is scoped to the ShadowDOM.

How about we add some dynamic content.

```js
class HelloWorld extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.innerHTML = `
      <style>
      span { background-color: #bada55; }
      </style>
      <span>Hello ${this.name}</span>
    `;
  }
  get name() {
    return this.getAttribute('name') || 'World';
  }
}

customElements.define('hello-world', HelloWorld);
```

```html
<hello-world name="Alice"></hello-world>
```

You might also notice the use of `innerHTML` which in this case would very
quickly get out of control as the component scales. We could move this to
a `<template>` tag for easier maintenance but this introduces the task of
updating the DOM instead of using string interpolation

Also if we enable observing the attribute changes we will also need a way to
re-render the dynamic content.

```js
class HelloWorld extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    this.shadow.innerHTML = `
      <style>
      span { background-color: #bada55; }
      </style>
      <span>Hello ${this.name}</span>
    `;
  }
  get name() {
    return this.getAttribute('name') || 'World';
  }
  static get observedAttributes() {
    return ['name'];
  }
}

customElements.define('hello-world', HelloWorld);
```

Hopefully this gave a general idea on what they are and perhaps see how
FancyPants can help with this process by managing how we trigger and manage
re-renders of dynamic content.

For more information you can see the [MDN Reference][MDN] on custom elements.

[MDN]: https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements
