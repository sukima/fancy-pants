# FancyPants

Have you ever been working on a simple JavaScript project like a bookmarklet or
tiny static site and thought to yourself if only you could have a backbone like
micro-lib to make writing **custom elements**?

No?! … oh guess it was just me. Well it is done now might as well show it.

This *micro-lib* is an attempt to introduce some very modern ECMAScript ideas
and allow you to make small and yet *performant* custom elements.

```js
class MyCustomElement extends Component {

  count = tracked(0);

  connectedCallback() {
    super.connectedCallback();
    this.timer = setInterval(() => this.count++, 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this.timer);
  }

  render() {
    this.shadow.querySelector('output').value = this.count;
  }

  static template = `<span>Counter: <output></output></span>`;

}

MyCustomElement.register();
```

[demo](https://sukima.github.io/fancy-pants/examples/6.html)

## Why use this



## Why not use this



## Technical explanation



## Documentation


