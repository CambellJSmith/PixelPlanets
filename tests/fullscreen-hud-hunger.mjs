import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CropId } from '../src/data/crops.db.js';

class FakeContext {
  constructor(){ this.imageSmoothingEnabled=false; this.fillRectCount=0; }
  createImageData(width,height){ return {data:new Uint8ClampedArray(width*height*4)}; }
  putImageData(image){ this.lastImageData=image; }
  fillRect(){ this.fillRectCount++; }
  getImageData(){ return this.createImageData(180,105); }
  set fillStyle(value){ this._fillStyle=value; }
}
class FakeElement {
  constructor(){ this.textContent=''; this.hidden=false; this.listeners=new Map(); this.style={}; }
  addEventListener(type,handler){ this.listeners.set(type,handler); }
}
class FakeCanvas extends FakeElement {
  constructor(){ super(); this.width=180; this.height=105; this.context=new FakeContext(); }
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

globalThis.HTMLCanvasElement=FakeCanvas;
globalThis.document={
  documentElement:{dataset:{}},
  getElementById(id){ return elements.get(id)??null; },
  createElement(tag){ return tag==='canvas'?new FakeCanvas():new FakeElement(); },
};
globalThis.window={addEventListener(){}};
globalThis.requestAnimationFrame=()=>0;
globalThis.setTimeout=()=>0;
globalThis.clearTimeout=()=>{};

const {createGame}=await import('../src/game.js');
const game=createGame(canvas);
game.start();

if(game.state.ui.hud.hp!==100||game.state.ui.hud.hunger!==100){
  throw new Error('Pixel health and hunger HUD values did not initialize.');
}

const before=game.state.player.hunger;
for(let frame=0;frame<900;frame++){
  game.state.frame++;
  game.systems.player.update();
}
if(!(game.state.player.hunger<before))throw new Error('Hunger did not drain over time.');

// Produce now primarily restores hunger while retaining a smaller health benefit.
game.state.player.hunger=35;
game.state.player.hp=70;
game.state.inventory.addProduce(CropId.PUMPKIN,1);
if(!game.systems.crops.eatProduce(CropId.PUMPKIN))throw new Error('Produce could not be eaten.');
if(game.state.player.hunger<=35)throw new Error('Eating produce did not restore hunger.');
if(game.state.ui.hud.hunger!==Math.round(game.state.player.hunger))throw new Error('Hunger bar snapshot did not update after eating.');

// The inventory must be an in-canvas overlay with clickable row hit regions.
game.state.inventory.addProduce(CropId.CARROT,1);
game.systems.input.toggleInventory(true);
game.systems.renderer.render();
if(!game.state.ui.inventoryOpen)throw new Error('The in-canvas pack did not open.');
if(!game.state.ui.inventoryRects.some(rect=>rect.kind==='inventory-item'))throw new Error('The canvas pack did not expose item hit regions.');

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const renderer=fs.readFileSync(path.join(root,'src/render/renderer.js'),'utf8');
if(/\.fillText\s*\(/.test(renderer))throw new Error('Canvas HUD text must use the pixel font, not antialiased fillText.');
for(const token of ['drawSegmentedBar','drawInventoryOverlay','drawDamageFeedback','drawOffscreenBossIndicator']){
  if(!renderer.includes(token))throw new Error(`Missing canvas communication element: ${token}`);
}

console.log('fullscreen HUD and hunger test passed',{hunger:game.state.player.hunger,rects:game.state.ui.inventoryRects.length});
