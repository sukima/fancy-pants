/**
 * This is a [memoizeFunction()]{@link module:tracking.memoizeFunction} version
 * of [simple-dom]{@link module:simple-dom} in that it wraps the render
 * operations to be ganularally tracked.
 *
 * Best used when working with FancyPants [Components]{@link module:component~Component}
 *
 * ```js
 * import Component from './fancy-pants/component.js';
 * import dom from './fancy-pants/tracked-dom.js';
 * import { tracked } from './fancy-pants/tracking.js';
 *
 * class MyComponent extends Component {
 *   constructor() {
 *     super();
 *     let [render, attachEvents] = dom($ => {
 *       $.scope(this.shadow);
 *       $('#my-thing-1').data('state', () => this.state);
 *       $('#my-thing-2').text(() => this.message);
 *     });
 *     this.render = render;
 *     this.attachEvents = attachEvents;
 *     this.state = tracked();
 *     this.message = tracked();
 *   }
 *   connectedCallback() {
 *     super.connectedCallback();
 *     this.detachEvents = this.attachEvents();
 *   }
 *   disconnectedCallback() {
 *     super.disconnectedCallback();
 *     this.detachEvents();
 *   }
 * }
 *
 * MyComponent.register();
 * ```
 *
 * @module tracked-dom
 */
import dom from './simple-dom.js';
import { memoizeFunction } from './tracking.js';

export default dom.factory(memoizeFunction);
