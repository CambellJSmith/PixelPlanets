import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

class FakeClassList {
  add(){}
}
class FakeContext {
  constructor(){ this.imageSmoothingEnabled=false; }
  createImageData(width,height){ return {data:new Uint8ClampedArray(width*height*4)}; }
  putImageData(image){ this.lastImageData=image; }
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
    this.classList=new FakeClassList();
  }
  addEventListener(type,handler){ this.listeners.set(type,handler); }
}
class FakeCanvas extends FakeElement {
  constructor(){
    super();
    this.width=180;
    this.height=105;
    this.context=new FakeContext();
  }
  getContext(){ return this.context; }
  getBoundingClientRect(){ return {left:0,top:0,width:180,height:105}; }
  setPointerCapture(){}
  releasePointerCapture(){}
  hasPointerCapture(){ return false; }
}

const elements=new Map();
const canvas=new FakeCanvas();
elements.set('game',canvas);
for(const id of ['boot-status','accessibility-status'])elements.set(id,new FakeElement());
const documentElement={dataset:{}};
const context={
  console,
  Uint8Array,Uint16Array,Uint32Array,Uint8ClampedArray,
  Map,Set,Math,Object,Array,Error,String,Number,Boolean,
  HTMLCanvasElement:FakeCanvas,
  document:{
    documentElement,
    getElementById(id){ return elements.get(id)??null; },
    createElement(tag){ return tag==='canvas'?new FakeCanvas():new FakeElement(); },
  },
  window:{ addEventListener(){} },
  requestAnimationFrame(){ return 0; },
  clearTimeout(){},
  setTimeout(){ return 0; },
};
context.window.window=context.window;
context.window.document=context.document;
context.window.requestAnimationFrame=context.requestAnimationFrame;
context.window.clearTimeout=context.clearTimeout;
context.window.setTimeout=context.setTimeout;

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'dist','game.bundle.js'),'utf8');
vm.runInNewContext(source,context,{filename:'dist/game.bundle.js'});

if(!context.window.pixelWorldGame)throw new Error('Standalone bundle did not expose the game.');
if(context.window.pixelWorldGame.state.world.activeChunks.length!==9)throw new Error('Standalone bundle did not generate nine active chunks.');
if(elements.get('boot-status').hidden!==true)throw new Error('Loading overlay was not dismissed.');
if(context.window.pixelWorldGame.state.ui.hud.hunger!==100)throw new Error('Standalone hunger HUD did not initialize.');
if(documentElement.dataset.gameReady!=='true')throw new Error('Game-ready marker was not set.');
const pixels=canvas.context.lastImageData?.data;
if(!pixels||!pixels.some((value,index)=>index%4!==3&&value!==0))throw new Error('Rendered frame was entirely black.');
console.log('standalone smoke test passed');
