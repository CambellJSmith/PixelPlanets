export function createNoise(state){
  function hash(value){
    let n=value|0;
    n=Math.imul(n^(n>>>16),0x45d9f3b);
    n=Math.imul(n^(n>>>16),0x45d9f3b);
    return (n^(n>>>16))>>>0;
  }

  function randomAt(x,y,salt=0){
    return hash(
      Math.imul(x|0,374761393)^
      Math.imul(y|0,668265263)^
      Math.imul(state.seed,1442695041)^
      salt
    )/4294967295;
  }

  const smooth=t=>t*t*(3-2*t);

  function noise1(x,scale,salt){
    const value=x/scale;
    const base=Math.floor(value);
    const blend=smooth(value-base);
    const a=randomAt(base,salt,salt*13);
    return a+(randomAt(base+1,salt,salt*13)-a)*blend;
  }

  function noise2(x,y,scale,salt){
    const sx=x/scale;
    const sy=y/scale;
    const bx=Math.floor(sx);
    const by=Math.floor(sy);
    const tx=smooth(sx-bx);
    const ty=smooth(sy-by);
    const a=randomAt(bx,by,salt);
    const b=randomAt(bx+1,by,salt);
    const c=randomAt(bx,by+1,salt);
    const d=randomAt(bx+1,by+1,salt);
    const top=a+(b-a)*tx;
    const bottom=c+(d-c)*tx;
    return top+(bottom-top)*ty;
  }

  return { hash, randomAt, noise1, noise2 };
}
