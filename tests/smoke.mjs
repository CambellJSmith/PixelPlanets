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

globalThis.document={
  getElementById(id){ return elements.get(id)??null; },
  createElement(tag){ return tag==='canvas'?new FakeCanvas():new FakeElement(); },
};
globalThis.window={ addEventListener(){} };
globalThis.requestAnimationFrame=()=>0;

const {createGame}=await import('../src/game.js');
const game=createGame(canvas);
game.start();

if(game.state.world.activeChunks.length!==9)throw new Error('Expected nine active chunks.');
if(game.state.world.chunks.size<9)throw new Error('Expected generated chunk cache.');
if(game.state.player.hp!==100)throw new Error('Player did not initialize correctly.');
if(game.state.ui.hud.weapon!=='gun')throw new Error('Canvas HUD did not initialize.');
if(game.state.ui.hud.hunger!==100)throw new Error('Hunger HUD did not initialize.');
const pixels=canvas.context.lastImageData?.data;
if(!pixels||!pixels.some((value,index)=>index%4!==3&&value!==0))throw new Error('Rendered frame was entirely black.');

console.log('smoke test passed',{
  seed:game.state.seed,
  chunks:game.state.world.chunks.size,
  biome:game.state.ui.hud.biome,
});
