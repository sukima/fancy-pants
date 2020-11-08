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
  getInitialData() {
  }
  getTrackedSelectable(item) {
    let name = …;
    let count = …;
    let isSelected = …;
    return activateTracking({ name, count, isSelected: tracked(isSelected) });
  }
}

SelectableData.register();
```
