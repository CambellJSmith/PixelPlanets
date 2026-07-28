import { WeatherType } from '../src/data/weather.db.js';

class FakeContext {
  constructor(){
    this.imageSmoothingEnabled=false;
    this.rects=[];
    this._fillStyle='';
  }
  createImageData(width,height){ return {data:new Uint8ClampedArray(width*height*4),width,height}; }
  putImageData(){}
  getImageData(x,y,width,height){ return this.createImageData(width,height); }
  fillRect(x,y,w,h){ this.rects.push({x,y,w,h,style:this._fillStyle}); }
  clearRect(){}
  drawImage(){}
  save(){}
  restore(){}
  set fillStyle(value){ this._fillStyle=value; }
  get fillStyle(){ return this._fillStyle; }
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
  constructor(){
    super();
    this.width=360;
    this.height=210;
    this.context=new FakeContext();
  }
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
if(typeof scheduled!=='function')throw new Error('Game loop did not schedule a frame.');

game.systems.weather.forceWeather(WeatherType.FOG);
game.state.frame=180;
canvas.context.rects.length=0;
game.systems.renderer.render();

const hazeRects=canvas.context.rects.filter(rect=>String(rect.style).startsWith('rgba(194,204,211,'));
if(hazeRects.length===0)throw new Error('Fog rendered no visibility haze.');
if(hazeRects.length>700){
  throw new Error(`Fog rendered ${hazeRects.length} haze rectangles; likely restored the screen-wide pixel lattice.`);
}
const broadRows=hazeRects.filter(rect=>rect.w>=4);
if(broadRows.length<8){
  throw new Error('Fog is still composed primarily of isolated evenly spaced pixels instead of irregular banks.');
}
const distinctWidths=new Set(broadRows.map(rect=>rect.w));
if(distinctWidths.size<5)throw new Error('Fog bank silhouettes do not vary enough to avoid a visible repeated grid.');

console.log('weather visibility rendering test passed',{
  hazeRects:hazeRects.length,
  broadRows:broadRows.length,
  distinctWidths:distinctWidths.size,
});
