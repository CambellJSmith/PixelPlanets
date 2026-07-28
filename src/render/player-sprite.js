export const PlayerPixel = Object.freeze({
  SKIN:'skin',
  BODY:'body',
  EYE:'eye',
});

const P=PlayerPixel;

// The canonical upright 3x5 player bitmap. Swimming uses an actual matrix
// rotation of this exact bitmap instead of stretching the bounding box.
export const UPRIGHT_PLAYER_SPRITE=Object.freeze([
  Object.freeze([P.SKIN,P.SKIN,P.SKIN]),
  Object.freeze([P.SKIN,P.EYE,P.SKIN]),
  Object.freeze([P.BODY,P.BODY,P.BODY]),
  Object.freeze([P.BODY,P.BODY,P.BODY]),
  Object.freeze([P.BODY,null,P.BODY]),
]);

export function rotatedSwimSprite(facing=1){
  const source=UPRIGHT_PLAYER_SPRITE;
  const sourceHeight=source.length;
  const sourceWidth=source[0].length;
  const rotated=Array.from({length:sourceWidth},()=>Array(sourceHeight).fill(null));

  if(facing>=0){
    // Clockwise: the head points right.
    for(let y=0;y<sourceWidth;y++){
      for(let x=0;x<sourceHeight;x++)rotated[y][x]=source[sourceHeight-1-x][y];
    }
  }else{
    // Counter-clockwise: the head points left.
    for(let y=0;y<sourceWidth;y++){
      for(let x=0;x<sourceHeight;x++)rotated[y][x]=source[x][sourceWidth-1-y];
    }
  }

  return rotated;
}
