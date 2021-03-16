/**********************************************\
*  FancyPants — customElements micro-lib   O   *
*  MIT — Copyright © 2021 Devin Weaver    /|\  *
*  https://fancy-pants.js.org/   v2.4.0   </>  *
\**********************************************/
import{activateTracking,memoizeFunction,createTag,dirtyTag,consumeTag,setOnTagDirtied}from"./tracking.js";import{scheduleRender,registerRenderer,unregisterRenderer}from"./renderer.js";setOnTagDirtied(scheduleRender);const ATTRIBUTE_TAGS=Symbol("attribute tags");const RENDER=Symbol("memoized render");const YIELDS=Symbol("yieldable identifier");const templates=new Map;const yieldables=new Map;const yieldableProxy=new Proxy(yieldables,{get:(e,t)=>e.get(t)?.yields()});function dasherize(e){return e.replace(/([a-z\d])([A-Z])/g,"$1-$2").toLowerCase()}function camelize(e){return dasherize(e).replace(/-([a-z])/g,((e,t)=>t.toUpperCase()))}function makeTemplateElement({template:e,shadow:t}){if(e===null&&t===null){return null}let r=document.createElement("template");if(e){r.innerHTML=e}else if(t){r.innerHTML=t;r.dataset.shadow=true}return r}function appendWithSlotableContent(e,t){e.querySelectorAll("[slot]").forEach((e=>{let r=e.getAttribute("slot");t.querySelector(`slot[name="${r}"]`)?.after(e)}));t.querySelector("slot:not([name])")?.after(...e.childNodes);t.querySelectorAll("slot").forEach((e=>e.remove()));e.append(t)}function componentOf(e){class t extends e{constructor(){super();let e=templates.get(this.tagName.toLowerCase());if(e){if(e.dataset.shadow===undefined){appendWithSlotableContent(this,e.content.cloneNode(true))}else{this.shadow=this.attachShadow({mode:"open"});this.shadow.appendChild(e.content.cloneNode(true))}}this[ATTRIBUTE_TAGS]=new Map((this.constructor.observedAttributes??[]).map((e=>[e,createTag()])));this[YIELDS]=this.getAttribute("id")||camelize(this.tagName);this[RENDER]=memoizeFunction((()=>this.render(yieldableProxy)))}connectedCallback(){this.track();yieldables.set(this[YIELDS],this);registerRenderer(this[RENDER]);scheduleRender()}disconnectedCallback(){yieldables.delete(this[YIELDS]);unregisterRenderer(this[RENDER])}attributeChangedCallback(e){dirtyTag(this[ATTRIBUTE_TAGS].get(e))}getAttribute(e){consumeTag(this[ATTRIBUTE_TAGS].get(e));return super.getAttribute(e)}hasAttribute(e){consumeTag(this[ATTRIBUTE_TAGS].get(e));return super.hasAttribute(e)}track(){activateTracking(this);return this}render(){}yields(){return this}static register(e,t=document){let r;if(typeof e==="string"){r=()=>t.querySelector(e)}else if(e instanceof Element){r=()=>e}else{let e=t.querySelector(`template#${this.tagName}`);r=()=>e??makeTemplateElement(this)}templates.set(this.tagName,r());customElements.define(this.tagName,this)}static get tagName(){return dasherize(this.name)}static get shadow(){return null}static get template(){return null}}return t}export default componentOf(HTMLElement);export{componentOf};