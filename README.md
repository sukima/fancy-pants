<p style="text-align: center;"><img src="https://fancy-pants.js.org/images/logo.png" width="128" style="border-radius: 24px;" alt="FancyPants logo"></p>

Have you ever been working on a simple JavaScript project like a bookmarklet or
tiny static site and thought to yourself if only you could have a backbone like
micro-lib to make writing **custom elements** easier?

No?! … oh guess it was just me. Well it is done now might as well show it.

This *micro-lib* is an attempt to introduce some very modern ECMAScript ideas
and allow you to make small and yet *performant* custom elements.

```js
import Component from 'https://fancy-pants.js.org/min/component.js';
import { tracked } from 'https://fancy-pants.js.org/min/tracking.js';

class MyCustomElement extends Component {

  // Whenever this value changes it will schedule a render cycle
  count = tracked(0);

  // Every second update the count
  connectedCallback() {
    super.connectedCallback();
    this.timer = setInterval(() => this.count++, 1000);
  }

  // Be nice when the component is disconnected
  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this.timer);
  }

  // Every render cycle update the Shadow DOM
  render() {
    this.shadow.querySelector('output').value = this.count;
  }

  // Use this innerHTML to create the Shadow DOM
  static get template() {
    return `<span>Counter: <output></output></span>`;
  }

}

MyCustomElement.register();
```

[demo](https://fancy-pants.js.org/tutorial-6.html)

*NOTE:* for **Safari Mobile** you will have to assign `tracked()` properties in
the `constructor` instead of as a field since Apple is dragging their feet on
modern JavaScript support.

```js
class MyCustomElement extends Component {
  constructor() {
    super();
    this.count = tracked(0);
  }
}
```

## Locations

#### Minified

* `import Component from 'https://fancy-pants.js.org/min/component.js';`
* `import { tracked, activateTracking } from 'https://fancy-pants.js.org/min/tracking.js';`

#### Unminified

* `import Component from 'https://fancy-pants.js.org/component.js';`
* `import { tracked, activateTracking } from 'https://fancy-pants.js.org/tracking.js';`

## Why use this

* Your project is large enough to benefit from using custom elements but not
  big enough to need templates, DOM libs, or a VirtualDOM™
* You want an easy way to memoize the render functions
* You just want a render function to be called when it needs to be called
* You want to use VanillaJS™ DOM API to update content but you don't want to
  have to roll your own guards to prevent unoptimized DOM mutations (i.e.
  Backbone™)

Basically if your project was large enough to warrant jQuery then this might be
worth it. This micro-lib fits into the same needs spectrum as Backbone™.

## Why not use this

* You are serious about writing an actual application
* You want to use a VirtualDOM™
* Your project is larger then a single HTML file

If your project needs more then just jQuery then this is not for you.

## Technical explanation

This lib has three basic parts tracking, renderer, and component.

### Tracking

This concept is explained in extreme detail (and where I stole this idea from)
in the blog post "[How Autotracking Works][1]" by [Chris Garrett][2].

[1]: https://www.pzuraq.com/how-autotracking-works/
[2]: https://www.pzuraq.com/author/pzuraq/

The condensed version is that when we consume a tracked property it stores
increments a counter specific to that property (*tag*). We then allow functions
to be memoized which run only when the tags it knows about have changed.

Because this is a dense topic I'll paraphrase by running through an example.

A function executes (I will call this `render()`) it *consumes* a tracked
property. When this happens the system records that the `render()` depends on
that tag.

The next time `render()` is called it checks the list of tags for itself to see
if any of the tags revision counter is larger then the last time the memoized
function ran. If so then it executes recording consumed tags. If not then it
knows nothing has changed and does a no-op.

In the end this means that when we dirty a tag by incrementing its revision
counter the next time the `render()` happens it is ready to execute again.

This affords us the ability to call the `render()` function without worrying
that it is executing when nothing has changed. This setup also means that we do
not need to declare the dependencies because the very act of consuming a value
will register it as a dependency. In short executing the memoized function will
**auto-track** its dependencies.

### Renderer

The renderer is responsible for collecting functions and scheduling when to
execute those functions. It uses a microtask to schedule the next run. If all
the functions it attempts to run on each render cycle are memoized it is quite
performant.

It taps into the tracking system simply to schedule a render cycle when
a tracked property is dirtied.

### Component

A simple custom element implementation which is able to create a shadow DOM
from a template and defines a render function that gets memoized.

## Documentation

Each part is split into three files. Import the ones as you need them. Here is
a basic overview of how this system works. There is also
[detailed API docs][api]

Please check out the [examples][] (view source) as they do not use any
minification and are easily digestible.

### Component

First create an HTML template. This can either be a `<template>` element or
a string. For now we will presume a `<template>` element.

```html
<template id="my-component">
  <output></output>
</template>
```

Take note it has the ID of `my-component` which will match to the component's
name `MyComponent`.

```js
import Component from 'fancy-pants/component.js';

class MyComponent extends Component {
}

MyComponent.register();
```

the `register()` will call `customElements.define(…)` and will infer the
tagname based on dasherizing the class name — `MyComponent` will define a
`<my-component></my-component>` element.

This can be overridden by providing a static tagName.

```js
class MyComponent extends Component {
  static get tagName() {
    return 'some-other-dashed-name';
  }
}
MyComponent.register();
```

By default it will look for a `<template>` in the dom with an ID of the
tagname. This can be overridden by passing in a selector string.

```js
MyComponent.register('#a-different-template-id');
```

Dynamic content can be updated with the `render()` method. This methods is
automatically memoized for you. Any tracked/auto-tracked properties consumed
will contribute to this method to being executed.

All other custom element methods are available just be sure to call the
appropriate `super.*()`.

Any observed attributes will also be auto-tracked. Use `this.getAttribute()`
and `this.setAttribute()` as normal.

```
class MyComponent extends Component {
  static get observedAttributes() {
    return ['foo'];
  }
}
```

The Shadow DOM for the component can be accessed via `this.shadow`.

### Renderer

The renderer is not exclusive to components. You can add any function to the
renderer. Even memoizewd functions if you wish.

```js
import { registerRenderer, scheduleRender } from 'fancy-pants/renderer.js';

let shouldRender = true;

registerRenderer(() => {
  if (!shouldRender) {
    console.log('noop cycle');
  } else {
    console.log('render cycle');
  }
  shouldRender = false;
});
```

Rendering is async within a microtask cycle. Calling `scheduleRender()` will
only schedule the render cycle therefor multiple calls will only result in one
pass over the registered functions.

```js
scheduleRender();                  // => render cycle
setTimeout(scheduleRender, 1000);  // => noop cycle
setTimeout(() => shouldRender = true, 2000);
setTimeout(scheduleRender, 3000);  // => render cycle
```

If needed you can also remove a renderer function with `unregisterRenderer(…)`.

### Tracking

Any object can have tracked properties. Until [decorators][3] are available
there is an initialization step to activate tracked properties.

[3]: https://github.com/tc39/proposal-decorators

```js
import { tracked, activateTracking } from 'fancy-pants/tracking.js';
```

The `tracked()` function returns a `Trackable` object. This is an inert object
till it is activated.

Calling `activateTracking()` on an object will convert all `Trackable`
properties to getter and setters hooked into the auto-tracking system.

This allows the following syntax to work with `Component`s.

```js
let myObject = {
  foo: tracked()
};
activateTracking(myObject);
```

It also returns the same object to a more condenced syntax.

```js
let myObject = activateTracking({
  foo: tracked()
});
```

Anytime foo is assigned it will mark the property as dirty and schedule
a render cycle.

```js
myObject.foo = 'bar';
```

To create a function that only runs when any of its auto-tracked dependencies
changes use `memoizeFunction()`.

```js
import { memoizeFunction } from 'fancy-pants/tracking.js';
let optimised = memoizeFunction(() => { … });
```

For more specific usage see the many [Examples][examples].

[examples]: https://fancy-pants.js.org/tutorial-examples.html
[api]: https://fancy-pants.js.org/
