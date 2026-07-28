import {
  snappedCellCenter,
  invalidCrossRects,
  pointerCrosshairRects,
} from '../src/render/reticle.js';

const snapped=snappedCellCenter(10.5,8.5);
if(snapped.x!==10||snapped.y!==8){
  throw new Error(`Half-cell reticle rounded down-right: ${JSON.stringify(snapped)}`);
}

const invalid=invalidCrossRects(10.5,8.5);
if(!invalid.some(([x,y])=>x===10&&y===8)){
  throw new Error('Invalid reticle is not centered on the selected cell.');
}
if(invalid.some(([x,y])=>x===13||y===11)){
  throw new Error('Invalid reticle retained the old bottom-right offset.');
}

const pointer=pointerCrosshairRects(42.2,19.7);
const expectedX=Math.round(42.2);
const expectedY=Math.round(19.7);
if(!pointer.some(([x,y])=>x===expectedX&&y===expectedY)){
  throw new Error('Destruculator pointer cursor is not centered on the mouse coordinate.');
}

console.log('destruculator crosshair alignment test passed');
