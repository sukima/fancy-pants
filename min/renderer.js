/**********************************************\
*  FancyPants — customElements micro-lib   O   *
*  MIT — Copyright © 2020 Devin Weaver    /|\  *
*  https://sukima.github.io/fancy-pants/  </>  *
\**********************************************/
let renderScheduled=false;const renderOperations=new Set;export function registerRenderer(e){renderOperations.add(e)}export function unregisterRenderer(e){renderOperations.delete(e)}export function scheduleRender(){if(renderScheduled){return}renderScheduled=true;Promise.resolve().then(executeRenderOperations)}function executeRenderOperations(){try{renderOperations.forEach((e=>e()))}finally{renderScheduled=false}}
