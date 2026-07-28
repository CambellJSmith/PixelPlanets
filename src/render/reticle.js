export function snappedCellCenter(x,y){
  return {x:Math.floor(x),y:Math.floor(y)};
}

export function targetCornerRects(x,y,size=5){
  const center=snappedCellCenter(x,y);
  const half=Math.floor(size/2);
  const left=center.x-half;
  const top=center.y-half;
  const right=center.x+half;
  const bottom=center.y+half;
  return [
    [left,top,2,1],
    [left,top,1,2],
    [right-1,top,2,1],
    [right,top,1,2],
    [left,bottom,2,1],
    [left,bottom-1,1,2],
    [right-1,bottom,2,1],
    [right,bottom-1,1,2],
  ];
}

export function invalidCrossRects(x,y){
  const center=snappedCellCenter(x,y);
  return [
    [center.x-2,center.y-2,1,1],
    [center.x+2,center.y-2,1,1],
    [center.x-1,center.y-1,1,1],
    [center.x+1,center.y-1,1,1],
    [center.x,center.y,1,1],
    [center.x-1,center.y+1,1,1],
    [center.x+1,center.y+1,1,1],
    [center.x-2,center.y+2,1,1],
    [center.x+2,center.y+2,1,1],
  ];
}

export function pointerCrosshairRects(x,y){
  const centerX=Math.round(x);
  const centerY=Math.round(y);
  return [
    [centerX-4,centerY,3,1],
    [centerX+2,centerY,3,1],
    [centerX,centerY-4,1,3],
    [centerX,centerY+2,1,3],
    [centerX,centerY,1,1],
  ];
}
