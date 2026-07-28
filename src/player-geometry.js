export function playerPixelBounds(x,y,width=3,height=5){
  const pixelWidth=Math.max(1,Math.round(width));
  const pixelHeight=Math.max(1,Math.round(height));
  const centerX=Math.round(x);
  const baselineY=Math.round(y);
  const left=centerX-Math.floor(pixelWidth/2);
  const top=baselineY-pixelHeight;

  return {
    centerX,
    baselineY,
    left,
    right:left+pixelWidth-1,
    top,
    bottom:baselineY-1,
    groundRow:baselineY,
    width:pixelWidth,
    height:pixelHeight,
  };
}

export function playerOccupiesPixel(x,y,playerX,playerY,width=3,height=5){
  const bounds=playerPixelBounds(playerX,playerY,width,height);
  return x>=bounds.left&&x<=bounds.right&&y>=bounds.top&&y<=bounds.bottom;
}
