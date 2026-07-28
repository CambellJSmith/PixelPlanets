import { CHUNK_CELL_COUNT, ACTIVE_CHUNK_COUNT, PERFORMANCE_CONFIG } from '../src/config.js';

class FakeContext {
  constructor(){ this.imageSmoothingEnabled=false; this.putCount=0; }
  createImageData(width,height){ return {data:new Uint8ClampedArray(width*height*4)}; }
  putImageData(image){ this.lastImageData=image; this.putCount++; }
  fillRect(){}
  clearRect(){}
  drawImage(){}
  beginPath(){}
  moveTo(){}
  lineTo(){}
  stroke(){}
  arc(){}
  clip(){}
  save(){}
  restore(){}
  set fillStyle(value){ this._fillStyle=value; }
  set strokeStyle(value){ this._strokeStyle=value; }
  set lineWidth(value){ this._lineWidth=value; }
}
class FakeElement {
  constructor(){
    this.textContent='';
    this.hidden=false;
    this.listeners=new Map();
    this.style={};
    this.classList={add(){}};
  }
  addEventListener(type,handler){ this.listeners.set(type,handler); }
}
class FakeCanvas extends FakeElement {
  constructor(){ super(); this.width=360; this.height=210; this.context=new FakeContext(); }
  getContext(){ return this.context; }
  getBoundingClientRect(){ return {left:0,top:0,width:360,height:210}; }
  setPointerCapture(){}
  releasePointerCapture(){}
  hasPointerCapture(){ return false; }
}

const canvas=new FakeCanvas();
const elements=new Map([
  ['game',canvas],
  ['boot-status',new FakeElement()],
  ['accessibility-status',new FakeElement()],
]);
let scheduled=null;
globalThis.document={
  documentElement:{dataset:{}},
  getElementById(id){ return elements.get(id)??null; },
  createElement(tag){ return tag==='canvas'?new FakeCanvas():new FakeElement(); },
};
globalThis.window={addEventListener(){}};
Object.defineProperty(globalThis,'performance',{value:{now(){ return 0; }},configurable:true});
globalThis.requestAnimationFrame=callback=>{ scheduled=callback; return 1; };

const {createGame}=await import('../src/game.js');
const game=createGame(canvas);
game.start();

if(game.state.frame!==1)throw new Error(`Expected one immediate startup step, received ${game.state.frame}.`);
for(let index=1;index<=20;index++){
  const callback=scheduled;
  if(typeof callback!=='function')throw new Error('Frame callback was not scheduled.');
  callback(index*(1000/144));
}
const expectedMax=Math.ceil(20*(PERFORMANCE_CONFIG.targetFps/144))+2;
if(game.state.frame>expectedMax){
  throw new Error(`High-refresh display ran too many simulations: ${game.state.frame} > ${expectedMax}.`);
}

game.systems.renderer.render();
const renderStats=game.systems.renderer.getPerformanceStats();
if(renderStats.terrainPixelsUpdated!==0){
  throw new Error(`Unchanged terrain recolored ${renderStats.terrainPixelsUpdated} pixels instead of using its cache.`);
}

game.systems.materials.update();
const processed=game.systems.materials.getLastProcessedCount();
if(processed>CHUNK_CELL_COUNT){
  throw new Error(`Material simulation processed ${processed} cells; visible-chunk ceiling is ${CHUNK_CELL_COUNT}.`);
}
if(processed>=CHUNK_CELL_COUNT*ACTIVE_CHUNK_COUNT){
  throw new Error('Material simulation still scanned the entire active neighborhood.');
}

console.log('performance optimization test passed',{
  simulatedFrames:game.state.frame,
  materialCells:processed,
  cachedTerrainPixels:renderStats.terrainPixelsUpdated,
});
