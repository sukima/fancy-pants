Like before we can make a simple Hello World example using the FancyPants
system.

```html
<select>
  <option value="">-- Pick One --</option>
  <option value="Jane">Jane</option>
  <option value="Alice">Alice</option>
  <option value="Bob">Bob</option>
  <option value="Charlie">Charlie</option>
</select>

<hello-world></hello-world>
```

```js
import Component from '../fancy-pants/component.js';

class HelloWorld extends Component {
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

HelloWorld.register();

document.querySelector('select').addEventListener('change', e => {
  document.querySelector('hello-world').setAttribute('name', e.target.value);
});
```

In this example the re-rendering or update dynamic content is driven by the
`setAttribute()` which is tracked and when it changes it will ask the rendering
engine to run the component's `render()` function. In this case assigning
a _new_ `innerHTML`.

With FancyPants any attributes defined in `observedAttributes` will be auto
tracked.

## Tracking

The power of FancyPants is in how it manages dirty tracking. How this works is
highly technical and best described by Chris Garrett's blog post ["How
Autotracking Works"][1] (2020-02-26).

[1]: https://www.pzuraq.com/how-autotracking-works/

For us it means that if a property is marked as **tracked** when it changes it
will initiate a render loop where all Component's will run their `render()`
functions *only* if those render functions depend on the thing that just
changed.

A simple example say we have an object every Component uses.

```js
const theFruit = activateTracking({
  name: tracked(),
  count: tracked()
});
```

And a component that uses it.

```js
class MyComponent extends Component {
  render() {
    this.innerHTML = `${theFruit.name}: ${theFruit.count}`;
  }
}
```

Then the component's innerHTML would update when `theFruit` properties change.

```js
theFruit.name = 'Apples'; // schedules a render loop
theFruit.count = 4; // schedules a render loop
```

This done by making the `name` and `count` properties getters/setters. That way
we can track when they are either assigned (set) or consumed (get). Whith this
information the system can determine which `render()` functions depend on which
property and if they should run or not run depending on if one of its
dependents changed or not.

This even works if the dependency is indirect like this.

```js
function makeFruitString() {
  return `${theFruit.name}: ${theFruit.count}`;
}

class MyComponent extends Component {
  render() {
    this.innerHTML = makeFruitString();
  }
}
```

In fact the system affords the ability to be even more granular if needed. In
this example we mark separate methods to be autotracked and only the one which
need to run will run.

```js
class MyComponent extends Component {
  constructor() {
    super();
    this.doExpensiveDOMUpdateWithName = memoizeFunction(this.doExpensiveDOMUpdateWithName);
    this.doExpensiveDOMUpdateWithCount = memoizeFunction(this.doExpensiveDOMUpdateWithCount);
  }
  render() {
    this.doExpensiveDOMUpdateWithName();
    this.doExpensiveDOMUpdateWithCount();
  }
  doExpensiveDOMUpdateWithName() { … }
  doExpensiveDOMUpdateWithCount() { … }
}
```

In this case when `theFruit.name = 'Orange'` happens the `render()` is called
which will run both methods. But since only `name` changed only
`doExpensiveDOMUpdateWithName()` is executed. `doExpensiveDOMUpdateWithCount()`
is just a no-op unless `count` was also updated.
