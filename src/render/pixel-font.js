const GLYPHS=Object.freeze({
  ' ':[0,0,0,0,0],
  'A':[2,5,7,5,5], 'B':[6,5,6,5,6], 'C':[3,4,4,4,3], 'D':[6,5,5,5,6],
  'E':[7,4,6,4,7], 'F':[7,4,6,4,4], 'G':[3,4,5,5,3], 'H':[5,5,7,5,5],
  'I':[7,2,2,2,7], 'J':[1,1,1,5,2], 'K':[5,5,6,5,5], 'L':[4,4,4,4,7],
  'M':[5,7,7,5,5], 'N':[5,7,7,7,5], 'O':[2,5,5,5,2], 'P':[6,5,6,4,4],
  'Q':[2,5,5,3,1], 'R':[6,5,6,5,5], 'S':[3,4,2,1,6], 'T':[7,2,2,2,2],
  'U':[5,5,5,5,7], 'V':[5,5,5,5,2], 'W':[5,5,7,7,5], 'X':[5,5,2,5,5],
  'Y':[5,5,2,2,2], 'Z':[7,1,2,4,7],
  '0':[7,5,5,5,7], '1':[2,6,2,2,7], '2':[6,1,7,4,7], '3':[6,1,3,1,6],
  '4':[5,5,7,1,1], '5':[7,4,6,1,6], '6':[3,4,7,5,7], '7':[7,1,2,2,2],
  '8':[7,5,7,5,7], '9':[7,5,7,1,6],
  '.':[0,0,0,0,2], ',':[0,0,0,2,4], ':':[0,2,0,2,0], ';':[0,2,0,2,4],
  '!':[2,2,2,0,2], '?':[6,1,2,0,2], '-':[0,0,7,0,0], '+':[0,2,7,2,0],
  '/':[1,1,2,4,4], '\\':[4,4,2,1,1], '(':[1,2,2,2,1], ')':[4,2,2,2,4],
  '[':[3,2,2,2,3], ']':[6,2,2,2,6], '<':[1,2,4,2,1], '>':[4,2,1,2,4],
  '=':[0,7,0,7,0], '_':[0,0,0,0,7], '%':[5,1,2,4,5], '#':[5,7,5,7,5],
  '*':[0,5,2,5,0], "'":[2,2,0,0,0], '"':[5,5,0,0,0], '|':[2,2,2,2,2],
});

export function pixelTextWidth(text,scale=1,spacing=1){
  const length=String(text??'').length;
  if(length===0)return 0;
  return length*(3*scale+spacing)-spacing;
}

export function drawPixelText(context,text,x,y,color='rgb(255,255,255)',scale=1,spacing=1,maxWidth=Infinity){
  const source=String(text??'').toUpperCase();
  let cursor=Math.round(x);
  const top=Math.round(y);
  const pixelScale=Math.max(1,Math.round(scale));
  const gap=Math.max(0,Math.round(spacing));
  context.fillStyle=color;

  for(const rawCharacter of source){
    const character=rawCharacter==='\n'?' ':rawCharacter;
    if(cursor+3*pixelScale>x+maxWidth)break;
    const rows=GLYPHS[character]??GLYPHS['?'];
    for(let row=0;row<5;row++){
      const bits=rows[row];
      for(let column=0;column<3;column++){
        if(!(bits&(1<<(2-column))))continue;
        context.fillRect(cursor+column*pixelScale,top+row*pixelScale,pixelScale,pixelScale);
      }
    }
    cursor+=3*pixelScale+gap;
  }
  return cursor-Math.round(x);
}
