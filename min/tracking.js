/**********************************************\
*  FancyPants — customElements micro-lib   O   *
*  MIT — Copyright © 2021 Devin Weaver    /|\  *
*  https://fancy-pants.js.org/   v2.4.0   </>  *
\**********************************************/
const REVISION=Symbol("REVISION");let CURRENT_REVISION=0;let currentComputation=null;let onTagDirtied=()=>{};class Tag{constructor(){this[REVISION]=CURRENT_REVISION}}class TrackedProperty{constructor(t){this.initializer=t}}export function setOnTagDirtied(t){onTagDirtied=t}export function createTag(){return new Tag}export function dirtyTag(t){if(currentComputation?.has(t)){throw new Error("Cannot dirty a tag during a computation")}t[REVISION]=++CURRENT_REVISION;onTagDirtied()}export function consumeTag(t){if(!(currentComputation&&t instanceof Tag)){return}currentComputation.add(t)}function getMax(t){return Math.max(...t.map((t=>t[REVISION])))}export function memoizeFunction(t){let e,r,n;return(...i)=>{if(n&&getMax(n)===r){if(currentComputation&&n.length>0){currentComputation=new Set([...currentComputation,...n])}return e}let o=currentComputation;currentComputation=new Set;try{e=t(...i)}finally{n=Array.from(currentComputation);r=getMax(n);if(o&&n.length>0){o=new Set([...o,...n])}currentComputation=o}return e}}function isTrackedPropertyDescriptor(t){return t.value instanceof TrackedProperty}function trackedDescriptor(t=(()=>{})){let e=new WeakMap;let r=new WeakMap;return{get(){if(!r.has(this)){r.set(this,t.call(this));e.set(this,createTag())}consumeTag(e.get(this));return r.get(this)},set(t){r.set(this,t);if(!e.has(this)){e.set(this,createTag())}dirtyTag(e.get(this))}}}export function tracked(t){return new TrackedProperty(typeof t==="function"?t:()=>t)}export function defineTrackedProp(t,e,r){Reflect.defineProperty(t,e,trackedDescriptor(r))}export function activateTracking(t){for(let e of Reflect.ownKeys(t)){let r=Reflect.getOwnPropertyDescriptor(t,e);if(!isTrackedPropertyDescriptor(r)){continue}defineTrackedProp(t,e,r.value.initializer)}return t}