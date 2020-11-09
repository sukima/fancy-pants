## Building a selectable table

In this tutorial we will walk over key ideas I used to implement a selectable
table. This is a table of tabular data where clicking the row selects or
unselects it from a set. That includes a select all at the top of the table.

**To see this example in action look at [Example Nine](tutorial-example9.html)**

Our first step is to define the data we want to display. In this simple example
I will presume the data is defined in the HTML itself.

```html
<selectable-data>
  <table>
    <thead>
      <tr>
        <td>Name</td>
        <td>Count</td>
      </tr>
    </thead>
    <tbody>
      <tr itemscope>
        <td itemprop="name">Alice</td>
        <td itemprop="count">4</td>
      </tr>
      <tr itemscope>
        <td itemprop="name">Bob</td>
        <td itemprop="count">9</td>
      </tr>
      <tr itemscope>
        <td itemprop="name">Charlie</td>
        <td itemprop="count">12</td>
      </tr>
      <tr itemscope>
        <td itemprop="name">Zoë</td>
        <td itemprop="count">35</td>
      </tr>
    </tbody>
  </table>
</selectable-data>
```

We will wrap the table in a Component that knows how to build trackable data
based on the current table. To do this the Component will scan the DOM in the
`constructor` and save it off as an array of objects.

```js
import Component from 'fancy-pants/component.js';
import { activateTracking, tracked } from './fancy-pants/tracking.js';

class SelectableData extends Component {
  constructor() {
    super();
    this.data = tracked(this.getInitialData());
  }
  …
}

SelectableData.register();
```

With this we import `Component` and `tracked`, Mark `this.data` as a tracked
property and set its initial value to the results of `this.getInitialData()`.

`getInitialData` will loop over the table grabbing the rows and convert them to
objects that have the data as properties.

```js
getInitialData() {
  let entries = [];
  let items = this.querySelectorAll('tbody [itemscope]');
  for (let item of items) {
    let data = this.getItemData(item);
    entries.push(data);
  }
  return entries;
}
createItemData(item) {
  let entries = [...item.querySelectorAll('[itemprop]')].map(propNode => {
    return [propNode.getAttribute('itemprop'), propNode.textContent];
  });
  return Object.fromEntries(entries);
}
```

However, there is a gotcha. Because we are going to handle DOM events to check
and uncheck the items we need a way to look up our data objects (which will have
tracked properties) from the DOM nodes that we will have an event listener on.

To do this we can register our data with a `WeakMap`.

```js
constructor() {
  …
  this.dataFrom = new WeakSet();
}
…
getInitialData() {
  …
  for (let item of items) {
    …
    this.dataFrom.set(item, data);
  }
  …
}
```

Let's add some checkboxes.

```html
<tbody>
  <tr itemscope>
    <td><input type="checkbox"></td>
    …
  </tr>
  <tr itemscope>
    <td><input type="checkbox"></td>
    …
  </tr>
  <tr itemscope>
    <td><input type="checkbox"></td>
    …
  </tr>
  <tr itemscope>
    <td><input type="checkbox"></td>
    …
  </tr>
</tbody>
```

And add them as part of the data objects we created. But because the value of
the checkboxes drive the rendering we need the checked status in the data
objects to be tracked.

```js
getItemData(item) {
  …
  let checked = item.querySelector('input[type=checkbox]').checked;
  return activateTracking(
    Object.fromEntries([...entries, ['isChecked', tracked(checked)]])
  );
}
```
