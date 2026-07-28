import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PlayerPixel, UPRIGHT_PLAYER_SPRITE, rotatedSwimSprite } from '../src/render/player-sprite.js';

function assertRotation(sprite,facing){
  if(sprite.length!==3||sprite.some(row=>row.length!==5)){
    throw new Error('Rotated swimming sprite must be 5 pixels wide and 3 pixels high.');
  }
  const source=UPRIGHT_PLAYER_SPRITE;
  for(let y=0;y<3;y++){
    for(let x=0;x<5;x++){
      const expected=facing>=0?source[4-x][y]:source[x][2-y];
      if(sprite[y][x]!==expected){
        throw new Error(`Swimming sprite is not a true ${facing>=0?'clockwise':'counter-clockwise'} rotation at ${x},${y}.`);
      }
    }
  }
}

const right=rotatedSwimSprite(1);
const left=rotatedSwimSprite(-1);
assertRotation(right,1);
assertRotation(left,-1);

// Head and eye must move to the leading end of the swimmer rather than remain
// as a compressed horizontal band across the whole body.
if(right[1][3]!==PlayerPixel.EYE)throw new Error('Right-facing swimmer eye is not at the leading end.');
if(left[1][1]!==PlayerPixel.EYE)throw new Error('Left-facing swimmer eye is not at the leading end.');
if(!right.some(row=>row[0]===PlayerPixel.BODY)&&!right.some(row=>row[1]===PlayerPixel.BODY)){
  throw new Error('Right-facing swimmer has no trailing body/legs.');
}
if(!left.some(row=>row[3]===PlayerPixel.BODY)&&!left.some(row=>row[4]===PlayerPixel.BODY)){
  throw new Error('Left-facing swimmer has no trailing body/legs.');
}

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const renderer=fs.readFileSync(path.join(root,'src/render/renderer.js'),'utf8');
if(!renderer.includes('rotatedSwimSprite'))throw new Error('Renderer does not use the rotated swimming sprite.');
if(/visualWidth\s*=\s*swimming\s*\?\s*5/.test(renderer)){
  throw new Error('Renderer still stretches the upright player into a generic 5x3 rectangle.');
}

console.log('swimming sprite rotation test passed',{rightEye:[3,1],leftEye:[1,1]});
