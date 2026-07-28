import { WORLD_WIDTH, WORLD_HEIGHT, MAGNIFIER_CONFIG, PERFORMANCE_CONFIG, REALITY_ZIPPER_CONFIG } from '../config.js';
import { WeaponId, WEAPON_DB } from '../data/weapons.db.js';
import { MaterialId } from '../data/materials.db.js';
import { targetCornerRects, invalidCrossRects, pointerCrosshairRects } from './reticle.js';
import { playerPixelBounds } from '../player-geometry.js';
import { faunaById, lootById } from '../data/fauna.db.js';
import { WeatherType } from '../data/weather.db.js';
import { dimensionDefinition } from '../data/dimensions.db.js';
import { drawPixelText, pixelTextWidth } from './pixel-font.js';
import { PlayerPixel, rotatedSwimSprite } from './player-sprite.js';
import { FURNITURE_PIXEL_COLORS, SIGN_LABELS, furnitureById, furnitureBounds } from '../data/furniture.db.js';

export function createRenderer(state,canvas,chunks,weapons,palette,timeSystem,weatherSystem=null,juiceSystem=null,furnitureSystem=null){
  const context=canvas.getContext('2d',{alpha:false});
  context.imageSmoothingEnabled=false;
  const M=MaterialId;
  const terrainImage=context.createImageData(WORLD_WIDTH,WORLD_HEIGHT);
  const terrainData=terrainImage.data;
  const TERRAIN_FULL_REFRESH_FRAMES=PERFORMANCE_CONFIG.terrainFullRefreshFrames;
  let cachedTerrainChunk=null;
  let lastFullTerrainFrame=-TERRAIN_FULL_REFRESH_FRAMES;
  let lastTerrainPixelsUpdated=0;

  function ensureRenderTracking(chunk){
    if(!chunk.renderDirtyFlags){
      chunk.renderDirtyFlags=new Uint8Array(chunk.cells.length);
      chunk.renderDirtyQueue=[];
      chunk.renderAllDirty=true;
    }
  }

  function writeTerrainPixel(chunk,index){
    const x=index%WORLD_WIDTH;
    const y=Math.floor(index/WORLD_WIDTH);
    const offset=index*4;
    const color=palette.color(chunk.cells[index],chunk.shade[index],x,y,chunk.cropId?.[index]??0);
    terrainData[offset]=color[0];
    terrainData[offset+1]=color[1];
    terrainData[offset+2]=color[2];
    terrainData[offset+3]=255;
  }

  function refreshTerrainCache(chunk){
    ensureRenderTracking(chunk);
    const fullRefresh=chunk!==cachedTerrainChunk
      ||chunk.renderAllDirty
      ||state.frame-lastFullTerrainFrame>=TERRAIN_FULL_REFRESH_FRAMES;

    if(fullRefresh){
      for(let index=0;index<chunk.cells.length;index++)writeTerrainPixel(chunk,index);
      chunk.renderDirtyFlags.fill(0);
      chunk.renderDirtyQueue.length=0;
      chunk.renderAllDirty=false;
      cachedTerrainChunk=chunk;
      lastFullTerrainFrame=state.frame;
      lastTerrainPixelsUpdated=chunk.cells.length;
      return;
    }

    let updated=0;
    for(const index of chunk.renderDirtyQueue){
      if(!chunk.renderDirtyFlags[index])continue;
      writeTerrainPixel(chunk,index);
      chunk.renderDirtyFlags[index]=0;
      updated++;
    }
    chunk.renderDirtyQueue.length=0;
    lastTerrainPixelsUpdated=updated;
  }


  function drawPixelLine(x0,y0,x1,y1,color,thickness=1){
    let ax=Math.round(x0);
    let ay=Math.round(y0);
    const bx=Math.round(x1);
    const by=Math.round(y1);
    const dx=Math.abs(bx-ax);
    const sx=ax<bx?1:-1;
    const dy=-Math.abs(by-ay);
    const sy=ay<by?1:-1;
    let error=dx+dy;
    const half=Math.floor(Math.max(1,thickness)/2);
    context.fillStyle=color;

    while(true){
      context.fillRect(ax-half,ay-half,Math.max(1,thickness),Math.max(1,thickness));
      if(ax===bx&&ay===by)break;
      const twiceError=2*error;
      if(twiceError>=dy){ error+=dy; ax+=sx; }
      if(twiceError<=dx){ error+=dx; ay+=sy; }
    }
  }

  function drawPixelCircle(cx,cy,radius,color,thickness=1){
    const centerX=Math.round(cx);
    const centerY=Math.round(cy);
    const outer=Math.max(1,Math.round(radius));
    const inner=Math.max(0,outer-Math.max(1,Math.round(thickness)));
    const outerSquared=outer*outer;
    const innerSquared=inner*inner;
    context.fillStyle=color;

    for(let y=-outer;y<=outer;y++){
      for(let x=-outer;x<=outer;x++){
        const distanceSquared=x*x+y*y;
        if(distanceSquared>outerSquared||distanceSquared<innerSquared)continue;
        context.fillRect(centerX+x,centerY+y,1,1);
      }
    }
  }

  function drawPixelBox(x,y,width,height,color){
    const left=Math.round(x);
    const top=Math.round(y);
    const right=left+Math.max(1,Math.round(width))-1;
    const bottom=top+Math.max(1,Math.round(height))-1;
    drawPixelLine(left,top,right,top,color);
    drawPixelLine(left,bottom,right,bottom,color);
    drawPixelLine(left,top,left,bottom,color);
    drawPixelLine(right,top,right,bottom,color);
  }

  function hash(value){
    let n=(value|0)^state.seed;
    n=Math.imul(n^(n>>>16),0x45d9f3b);
    n=Math.imul(n^(n>>>16),0x45d9f3b);
    return (n^(n>>>16))>>>0;
  }

  function paintSkyPixel(current,x,y,color,alpha=1){
    const px=Math.round(x);
    const py=Math.round(y);
    if(px<0||py<0||px>=WORLD_WIDTH||py>=WORLD_HEIGHT)return;
    if(current.cells[px+py*WORLD_WIDTH]!==M.AIR)return;
    context.fillStyle=`rgba(${Math.round(color[0])},${Math.round(color[1])},${Math.round(color[2])},${alpha})`;
    context.fillRect(px,py,1,1);
  }

  function drawDisk(current,cx,cy,radius,color,alpha=1){
    for(let oy=-radius;oy<=radius;oy++)for(let ox=-radius;ox<=radius;ox++){
      if(ox*ox+oy*oy<=radius*radius)paintSkyPixel(current,cx+ox,cy+oy,color,alpha);
    }
  }

  function drawSkyDetails(current,originX,originY){
    if(originY>0)return;
    const time=timeSystem.getTime();

    if(time.nightStrength>.08){
      for(let index=0;index<72;index++){
        const value=hash(index+state.world.camera.chunkX*977);
        const x=value%WORLD_WIDTH;
        const y=3+((value>>>9)%52);
        const twinkle=.35+(((state.frame>>4)+index)%5)*.12;
        paintSkyPixel(current,x,y,[225,233,255],Math.min(.95,time.nightStrength*twinkle));
      }
    }

    if(time.isDay){
      const x=7+time.phaseProgress*(WORLD_WIDTH-14);
      const y=42-Math.sin(time.phaseProgress*Math.PI)*31;
      drawDisk(current,x,y,4,[255,226,118],Math.max(.35,time.daylight));
      paintSkyPixel(current,x-1,y-1,[255,248,208],time.daylight);
    }else{
      const x=7+time.phaseProgress*(WORLD_WIDTH-14);
      const y=39-Math.sin(time.phaseProgress*Math.PI)*27;
      drawDisk(current,x,y,3,[210,220,238],.85);
      drawDisk(current,x+1,y-1,2,[91,103,139],.55);
    }

    const drift=state.frame*.012;
    const first=Math.floor((originX-drift-100)/66);
    const last=Math.ceil((originX+WORLD_WIDTH-drift+100)/66);
    const cloudColor=time.isDay?[224,230,232]:[76,83,105];
    const cloudAlpha=.46+.34*time.daylight;
    const cloudShape=[
      [-5,1],[-4,0],[-3,0],[-2,-1],[-1,-2],[0,-2],[1,-1],[2,-1],[3,0],[4,0],[5,1],
      [-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],[4,1],
    ];

    for(let cloudIndex=first;cloudIndex<=last;cloudIndex++){
      const value=hash(cloudIndex*7919+27);
      const worldX=cloudIndex*66+(value%31)+drift;
      const localX=worldX-originX;
      const y=11+((value>>>8)%25);
      const scale=1+((value>>>15)&1);
      for(const [ox,oy] of cloudShape){
        for(let sx=0;sx<scale;sx++)paintSkyPixel(current,localX+ox*scale+sx,y+oy,cloudColor,cloudAlpha);
      }
    }
  }

  function positiveModulo(value,modulus){
    return ((value%modulus)+modulus)%modulus;
  }

  function fillWrappedRect(x,y,width,height){
    const left=positiveModulo(Math.round(x),WORLD_WIDTH);
    const top=Math.max(0,Math.round(y));
    const drawHeight=Math.min(Math.max(1,Math.round(height)),WORLD_HEIGHT-top);
    const drawWidth=Math.min(WORLD_WIDTH,Math.max(1,Math.round(width)));
    if(drawHeight<=0)return;
    const firstWidth=Math.min(drawWidth,WORLD_WIDTH-left);
    context.fillRect(left,top,firstWidth,drawHeight);
    if(firstWidth<drawWidth)context.fillRect(0,top,drawWidth-firstWidth,drawHeight);
  }

  function drawVisibilityHaze(weather,type){
    const hazeStrength=Math.max(0,(1-weather.visibility)*.68);
    if(hazeStrength<=.025)return;

    const colors={
      [WeatherType.FOG]:[194,204,211],
      [WeatherType.BLIZZARD]:[222,232,238],
      [WeatherType.OCEAN_STORM]:[142,164,181],
      [WeatherType.ASHFALL]:[94,82,78],
      [WeatherType.SPORE_HAZE]:[114,78,128],
    };
    const color=colors[type]??colors[WeatherType.FOG];
    const alpha=Math.min(.34,.055+hazeStrength*.48);
    const slowFrame=Math.floor(state.frame/18);
    const windDrift=Math.floor(state.frame*weather.windX*.08);
    const bankCount=8+Math.round(hazeStrength*18);

    // Large, irregular banks replace the old evenly spaced screen-wide
    // stipple. Their silhouettes remain stable and move slowly as whole pixels,
    // preventing the pale checkerboard shimmer visible at high resolution.
    context.fillStyle=`rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
    for(let bank=0;bank<bankCount;bank++){
      const value=hash(bank*3253+weather.segment*1877+41);
      const width=24+((value>>>2)%72);
      const height=2+((value>>>9)%7);
      const direction=bank%3===0?-1:1;
      const baseX=positiveModulo((value%WORLD_WIDTH)+windDrift+slowFrame*direction,WORLD_WIDTH);
      const baseY=3+((value>>>17)%Math.max(1,WORLD_HEIGHT-8));
      const maxInset=Math.max(2,Math.floor(width*.18));
      for(let row=0;row<height;row++){
        const rowValue=hash(value+row*811+97);
        const inset=rowValue%maxInset;
        const rowShift=((rowValue>>>7)%7)-3;
        const rowWidth=Math.max(4,width-inset*2-((rowValue>>>13)%9));
        fillWrappedRect(baseX+inset+rowShift,baseY+row,rowWidth,1);
      }
    }

    const fleckCount=10+Math.round(hazeStrength*36);
    context.fillStyle=`rgba(${color[0]},${color[1]},${color[2]},${Math.max(.035,alpha*.52)})`;
    for(let index=0;index<fleckCount;index++){
      const value=hash(index*4937+weather.segment*659+173);
      const x=positiveModulo((value%WORLD_WIDTH)+windDrift+Math.floor(slowFrame/2),WORLD_WIDTH);
      const y=2+((value>>>10)%Math.max(1,WORLD_HEIGHT-4));
      context.fillRect(x,y,(value>>>21)%5===0?2:1,1);
    }
  }

  function drawWeather(originX,originY){
    const weather=weatherSystem?.getWeather?.();
    if(!weather||weather.intensity<=.02)return;
    const intensity=weather.intensity;
    const wind=Math.round(weather.windX*4);
    const type=weather.type;

    if([WeatherType.RAIN,WeatherType.THUNDERSTORM,WeatherType.OCEAN_STORM].includes(type)){
      const count=Math.round((type===WeatherType.RAIN?48:88)*intensity);
      const speed=type===WeatherType.RAIN?3:4;
      for(let index=0;index<count;index++){
        const value=hash(index*1777+weather.segment*991);
        const x=positiveModulo((value%WORLD_WIDTH)+Math.floor(state.frame*weather.windX*.32),WORLD_WIDTH);
        const y=positiveModulo(((value>>>8)%WORLD_HEIGHT)+state.frame*speed+index*7,WORLD_HEIGHT);
        const length=type===WeatherType.RAIN?2:3;
        drawPixelLine(x,y,x+Math.sign(wind),y+length,type===WeatherType.RAIN?'rgba(139,199,235,.8)':'rgba(185,224,248,.9)');
      }
    }else if([WeatherType.SNOW,WeatherType.BLIZZARD].includes(type)){
      const count=Math.round((type===WeatherType.SNOW?55:105)*intensity);
      context.fillStyle=type===WeatherType.SNOW?'rgba(235,244,250,.92)':'rgba(248,252,255,.95)';
      for(let index=0;index<count;index++){
        const value=hash(index*2099+weather.segment*613);
        const sway=Math.round(Math.sin((state.frame+index*11)*.08)*(type===WeatherType.BLIZZARD?3:1));
        const x=positiveModulo((value%WORLD_WIDTH)+Math.floor(state.frame*weather.windX*.45)+sway,WORLD_WIDTH);
        const y=positiveModulo(((value>>>9)%WORLD_HEIGHT)+Math.floor(state.frame/(type===WeatherType.BLIZZARD?2:3))+index*5,WORLD_HEIGHT);
        context.fillRect(x,y,type===WeatherType.BLIZZARD&&index%5===0?2:1,1);
      }
    }else if(type===WeatherType.ASHFALL){
      const count=Math.round(72*intensity);
      for(let index=0;index<count;index++){
        const value=hash(index*2371+weather.segment*701);
        const x=positiveModulo((value%WORLD_WIDTH)+Math.floor(state.frame*weather.windX*.25),WORLD_WIDTH);
        const y=positiveModulo(((value>>>8)%WORLD_HEIGHT)+Math.floor(state.frame/3)+index*3,WORLD_HEIGHT);
        context.fillStyle=index%4===0?'rgba(160,119,91,.9)':'rgba(97,85,82,.86)';
        context.fillRect(x,y,1,1);
      }
    }else if(type===WeatherType.CAVE_DRIP){
      const count=Math.round(20*intensity);
      for(let index=0;index<count;index++){
        const value=hash(index*1871+weather.segment*433);
        const x=value%WORLD_WIDTH;
        const y=positiveModulo(((value>>>8)%WORLD_HEIGHT)+state.frame*2+index*13,WORLD_HEIGHT);
        context.fillStyle='rgba(112,181,224,.8)';
        context.fillRect(x,y,1,2);
      }
    }else if(type===WeatherType.SPORE_HAZE){
      const count=Math.round(64*intensity);
      for(let index=0;index<count;index++){
        const value=hash(index*2791+weather.segment*557);
        const x=positiveModulo((value%WORLD_WIDTH)+Math.round(Math.sin((state.frame+index*17)*.025)*4),WORLD_WIDTH);
        const y=positiveModulo(((value>>>8)%WORLD_HEIGHT)-Math.floor(state.frame/5)+index*3,WORLD_HEIGHT);
        context.fillStyle=index%3===0?'rgba(231,148,218,.82)':'rgba(154,93,177,.66)';
        context.fillRect(x,y,1,1);
      }
    }else if(type===WeatherType.BREEZE){
      const count=Math.round(18*intensity);
      for(let index=0;index<count;index++){
        const value=hash(index*1597+weather.segment*379);
        const x=positiveModulo((value%WORLD_WIDTH)+Math.floor(state.frame*weather.windX),WORLD_WIDTH);
        const y=5+((value>>>8)%(WORLD_HEIGHT-10));
        drawPixelLine(x,y,x+Math.sign(weather.windX)*3,y,'rgba(224,235,238,.32)');
      }
    }

    for(const flash of state.weather?.flashes??[]){
      const targetX=Math.round(flash.x-originX);
      const targetY=Math.round(flash.y-originY);
      let x=targetX;
      let y=0;
      const bright=flash.frames%4<2;
      while(y<targetY){
        const nextY=Math.min(targetY,y+5);
        const nextX=x+((hash(y+flash.x+flash.frames)%3)-1);
        drawPixelLine(x,y,nextX,nextY,bright?'rgb(248,252,255)':'rgb(161,190,235)',bright?2:1);
        x=nextX;
        y=nextY;
      }
    }

    if(type===WeatherType.FOG||type===WeatherType.BLIZZARD||type===WeatherType.OCEAN_STORM||type===WeatherType.ASHFALL||type===WeatherType.SPORE_HAZE){
      drawVisibilityHaze(weather,type);
    }

    if(type===WeatherType.HEATWAVE){
      context.fillStyle='rgba(255,188,102,.12)';
      for(let x=(state.frame>>2)%5;x<WORLD_WIDTH;x+=5){
        const y=8+positiveModulo(hash(x+weather.segment)%83+Math.floor(state.frame/6),83);
        context.fillRect(x,y,1,2);
      }
    }
  }


  const NYAN_RAINBOW=[
    'rgb(255,64,72)',
    'rgb(255,145,46)',
    'rgb(255,224,76)',
    'rgb(83,208,98)',
    'rgb(62,151,238)',
    'rgb(154,91,224)',
  ];

  const REALITY_COLORS=[
    'rgb(255,45,196)',
    'rgb(82,250,244)',
    'rgb(255,238,72)',
    'rgb(118,255,92)',
    'rgb(143,72,255)',
    'rgb(255,103,48)',
    'rgb(235,247,255)',
    'rgb(48,126,255)',
  ];

  function drawNyanCatProjectile(cat,originX,originY){
    const trail=cat.trail??[];
    for(let index=trail.length-2;index>=0;index--){
      const point=trail[index];
      const next=trail[index+1];
      const fade=index/Math.max(1,trail.length-1);
      if(fade>.92)continue;
      for(let band=0;band<NYAN_RAINBOW.length;band++){
        drawPixelLine(
          point.x-originX,
          point.y-originY-3+band,
          next.x-originX,
          next.y-originY-3+band,
          NYAN_RAINBOW[band],
          1,
        );
      }
    }

    const x=Math.round(cat.x-originX);
    const y=Math.round(cat.y-originY);
    if(x<-18||y<-12||x>WORLD_WIDTH+18||y>WORLD_HEIGHT+12)return;
    const facing=Math.sign(cat.vx||1);
    const flap=Math.floor((state.frame+(cat.phase??0)*4)/4)%2;
    const rx=offset=>x+offset*facing;

    context.fillStyle='rgb(92,72,91)';
    context.fillRect(Math.min(rx(-5),rx(4)),y-3,10,7);
    context.fillStyle='rgb(237,181,114)';
    context.fillRect(Math.min(rx(-4),rx(3)),y-2,8,5);
    context.fillStyle='rgb(247,213,151)';
    context.fillRect(Math.min(rx(-3),rx(2)),y-1,6,3);
    context.fillStyle='rgb(241,110,143)';
    context.fillRect(rx(-2),y-1,1,1);
    context.fillRect(rx(1),y+1,1,1);

    context.fillStyle='rgb(126,127,145)';
    context.fillRect(Math.min(rx(4),rx(8)),y-3,5,6);
    context.fillRect(rx(5),y-5,1,2);
    context.fillRect(rx(8),y-5,1,2);
    context.fillStyle='rgb(207,210,220)';
    context.fillRect(rx(5),y-2,1,1);
    context.fillRect(rx(7),y-2,1,1);
    context.fillStyle='rgb(42,43,55)';
    context.fillRect(rx(5),y-1,1,1);
    context.fillRect(rx(7),y-1,1,1);
    context.fillRect(rx(8),y+1,1,1);

    context.fillStyle='rgb(126,127,145)';
    context.fillRect(rx(-6),y-1,2,2);
    context.fillRect(rx(-7),y-2+(flap?1:0),2,1);
    context.fillRect(rx(-3),y+4,2,1);
    context.fillRect(rx(2),y+4+(flap?0:1),2,1);
  }

  function drawProjectiles(originX,originY){
    for(const cat of state.entities.nyanCats??[])drawNyanCatProjectile(cat,originX,originY);

    for(const spark of state.entities.nyanSparks??[]){
      const x=Math.round(spark.x-originX);
      const y=Math.round(spark.y-originY);
      if(x>=-2&&y>=-2&&x<WORLD_WIDTH+2&&y<WORLD_HEIGHT+2){
        context.fillStyle=NYAN_RAINBOW[(spark.colorIndex??0)%NYAN_RAINBOW.length];
        context.fillRect(x,y,spark.life>25?2:1,1);
      }
    }

    for(const spark of state.entities.realitySparks??[]){
      const x=Math.round(spark.x-originX);
      const y=Math.round(spark.y-originY);
      if(x>=-3&&y>=-3&&x<WORLD_WIDTH+3&&y<WORLD_HEIGHT+3){
        context.fillStyle=REALITY_COLORS[(spark.colorIndex??0)%REALITY_COLORS.length];
        const size=spark.life>27&&state.frame%3===0?2:1;
        context.fillRect(x,y,size,size);
        if(spark.life>20&&state.frame%4===0){
          context.fillRect(x-Math.sign(spark.vx||1),y-Math.sign(spark.vy||1),1,1);
        }
      }
    }

    for(const bullet of state.entities.bullets){
      const x=bullet.x-originX;
      const y=bullet.y-originY;
      if(x>=-2&&y>=-2&&x<WORLD_WIDTH+2&&y<WORLD_HEIGHT+2){
        context.fillStyle='rgb(255,235,145)';
        context.fillRect(Math.round(x),Math.round(y),2,1);
      }
    }

    for(const spark of state.entities.laserSparks??[]){
      const x=Math.round(spark.x-originX);
      const y=Math.round(spark.y-originY);
      if(x>=-2&&y>=-2&&x<WORLD_WIDTH+2&&y<WORLD_HEIGHT+2){
        context.fillStyle=spark.life>11?'rgb(255,248,204)':spark.life>6?'rgb(255,176,62)':'rgb(235,76,32)';
        context.fillRect(x,y,spark.life>10?2:1,1);
      }
    }

    for(const shot of state.entities.napalmShots){
      const x=shot.x-originX;
      const y=shot.y-originY;
      if(x>=-3&&y>=-3&&x<WORLD_WIDTH+3&&y<WORLD_HEIGHT+3){
        // Airborne napalm is shown as an amber liquid droplet before ignition.
        context.fillStyle='rgb(232,132,34)';
        context.fillRect(Math.round(x)-1,Math.round(y)-1,3,2);
        context.fillStyle='rgb(255,190,64)';
        context.fillRect(Math.round(x),Math.round(y),1,1);
      }
    }

    for(const grenade of state.entities.grenades){
      const x=Math.round(grenade.x-originX);
      const y=Math.round(grenade.y-originY);
      if(x>=-3&&y>=-3&&x<WORLD_WIDTH+3&&y<WORLD_HEIGHT+3){
        context.fillStyle='rgb(42,54,42)';
        context.fillRect(x-1,y-1,3,3);
        context.fillStyle='rgb(128,148,82)';
        context.fillRect(x-1,y-1,2,1);
        if(grenade.fuse<24&&state.frame%6<3){
          context.fillStyle='rgb(255,176,55)';
          context.fillRect(x+1,y-2,1,1);
        }
      }
    }

    for(const drone of state.entities.drones){
      const x=Math.round(drone.x-originX);
      const y=Math.round(drone.y-originY+Math.sin(drone.bob)*.45);
      if(x>=-8&&y>=-5&&x<WORLD_WIDTH+8&&y<WORLD_HEIGHT+5){
        context.fillStyle='rgb(72,84,96)';
        context.fillRect(x-3,y-1,7,3);
        context.fillStyle='rgb(148,166,176)';
        context.fillRect(x-1,y-2,3,2);
        context.fillStyle='rgb(32,38,44)';
        context.fillRect(x-5,y-2,3,1);
        context.fillRect(x+3,y-2,3,1);
        context.fillStyle='rgb(108,225,240)';
        context.fillRect(x+(drone.direction>0?3:-3),y,1,1);
        if(!drone.launched){
          context.fillStyle='rgb(94,102,72)';
          context.fillRect(x,y+2,1,2);
        }
      }
    }

    for(const rocket of state.entities.droneRockets){
      const x=Math.round(rocket.x-originX);
      const y=Math.round(rocket.y-originY);
      if(x>=-5&&y>=-7&&x<WORLD_WIDTH+5&&y<WORLD_HEIGHT+7){
        const angle=Math.atan2(rocket.vy,rocket.vx);
        const tailX=Math.round(x-Math.cos(angle)*3);
        const tailY=Math.round(y-Math.sin(angle)*3);
        drawPixelLine(tailX,tailY,x,y,'rgb(226,230,220)',2);
        context.fillStyle='rgb(255,232,126)';
        context.fillRect(tailX-1,tailY-1,2,2);
        context.fillStyle='rgb(255,104,36)';
        context.fillRect(Math.round(tailX-Math.cos(angle)*2),Math.round(tailY-Math.sin(angle)*2),2,2);
      }
    }

    for(const blade of state.entities.glaives){
      const x=Math.round(blade.x-originX);
      const y=Math.round(blade.y-originY);
      if(x>=-5&&y>=-5&&x<WORLD_WIDTH+5&&y<WORLD_HEIGHT+5){
        const angle=blade.spin??0;
        const armLength=3;
        const color='rgb(215,225,240)';
        const edgeColor='rgb(118,205,232)';
        for(let arm=0;arm<4;arm++){
          const armAngle=angle+arm*Math.PI*.5;
          const endX=x+Math.cos(armAngle)*armLength;
          const endY=y+Math.sin(armAngle)*armLength;
          drawPixelLine(x,y,endX,endY,arm%2===0?color:edgeColor);
        }
        context.fillStyle='rgb(250,248,220)';
        context.fillRect(x,y,1,1);
      }
    }

    for(const seed of state.entities.seedParticles){
      const x=Math.round(seed.x-originX);
      const y=Math.round(seed.y-originY);
      if(x>=-2&&y>=-2&&x<WORLD_WIDTH+2&&y<WORLD_HEIGHT+2){
        const color=palette.cropColor(seed.cropId,'seed',5);
        context.fillStyle=`rgb(${Math.round(color[0])},${Math.round(color[1])},${Math.round(color[2])})`;
        context.fillRect(x,y,1,1);
      }
    }

    for(const fireball of state.entities.bossFireballs){
      const x=Math.round(fireball.x-originX);
      const y=Math.round(fireball.y-originY);
      if(x>=-4&&y>=-4&&x<WORLD_WIDTH+4&&y<WORLD_HEIGHT+4){
        context.fillStyle='rgb(255,166,46)';
        context.fillRect(x-1,y-1,3,3);
        context.fillStyle='rgb(255,238,146)';
        context.fillRect(x,y,1,1);
        context.fillStyle='rgb(196,72,24)';
        context.fillRect(x-2,y,1,1);
        context.fillRect(x+2,y,1,1);
      }
    }

    for(const projectile of state.entities.serpentProjectiles){
      const x=Math.round(projectile.x-originX);
      const y=Math.round(projectile.y-originY);
      if(x>=-4&&y>=-4&&x<WORLD_WIDTH+4&&y<WORLD_HEIGHT+4){
        context.fillStyle='rgb(55,154,224)';
        context.fillRect(x-1,y-1,3,3);
        context.fillStyle='rgb(164,231,255)';
        context.fillRect(x,y-1,1,1);
        context.fillRect(x+1,y,1,1);
        context.fillStyle='rgb(26,91,166)';
        context.fillRect(x-2,y,1,1);
      }
    }

    for(const projectile of state.entities.bossProjectiles){
      const x=Math.round(projectile.x-originX);
      const y=Math.round(projectile.y-originY);
      if(projectile.kind==='lightning_marker'){
        const targetX=Math.round((projectile.targetX??projectile.x)-originX);
        const targetY=Math.round((projectile.targetY??projectile.y)-originY);
        const flash=(projectile.delay??0)<12||state.frame%8<4;
        drawDottedBeam(targetX,1,targetX,targetY,flash?'rgb(226,239,255)':'rgb(113,145,204)');
        context.fillStyle=flash?'rgb(245,250,255)':'rgb(135,166,218)';
        context.fillRect(targetX-2,targetY,5,1);
        continue;
      }
      if(x<-5||y<-5||x>WORLD_WIDTH+5||y>WORLD_HEIGHT+5)continue;
      const colors={
        ice_boulder:['rgb(168,223,247)','rgb(238,251,255)'],
        mud_glob:['rgb(112,92,48)','rgb(174,151,81)'],
        spore:['rgb(195,77,185)','rgb(248,181,239)'],
        bamboo_shard:['rgb(111,168,56)','rgb(210,235,123)'],
        branch:['rgb(102,67,40)','rgb(174,121,65)'],
        crystal_shard:['rgb(122,101,230)','rgb(226,219,255)'],
        magma_rock:['rgb(224,70,25)','rgb(255,207,88)'],
        shadow_bolt:['rgb(83,66,153)','rgb(196,181,255)'],
        cannonball:['rgb(48,61,64)','rgb(137,160,162)'],
        electric_orb:['rgb(109,113,225)','rgb(226,235,255)'],
        world_spit:['rgb(137,75,43)','rgb(224,157,91)'],
      };
      const pair=colors[projectile.kind]??['rgb(220,220,220)','rgb(255,255,255)'];
      context.fillStyle=pair[0];
      if(['bamboo_shard','branch','crystal_shard'].includes(projectile.kind)){
        const angle=Math.atan2(projectile.vy,projectile.vx);
        drawPixelLine(x-Math.cos(angle)*3,y-Math.sin(angle)*3,x+Math.cos(angle)*3,y+Math.sin(angle)*3,pair[0]);
        context.fillStyle=pair[1];
        context.fillRect(x,y,1,1);
      }else{
        context.fillRect(x-1,y-1,3,3);
        context.fillStyle=pair[1];
        context.fillRect(x,y-1,1,1);
      }
    }

    for(const pickup of state.entities.pickups){
      const x=Math.round(pickup.x-originX);
      const y=Math.round(pickup.y-originY+Math.sin(pickup.bob)*.25);
      if(x>=-3&&y>=-3&&x<WORLD_WIDTH+3&&y<WORLD_HEIGHT+3){
        if(pickup.kind==='loot'){
          const loot=lootById(pickup.lootId);
          if(!loot)continue;
          const [r,g,b]=loot.color;
          context.fillStyle=`rgb(${r},${g},${b})`;
          context.fillRect(x-1,y-1,2,2);
          context.fillStyle=(pickup.cookedFlash??0)>0&&state.frame%4<2?'rgb(255,249,190)':'rgb(245,240,220)';
          context.fillRect(x,y-1,1,1);
          if((pickup.cookFrames??0)>0){
            context.fillStyle='rgb(255,151,54)';
            context.fillRect(x-2,y-2,1,1);
            if(pickup.cookFrames>=30)context.fillRect(x+1,y-3,1,1);
          }
        }else{
          const part=pickup.kind==='seed'?'seed':'fruit';
          const color=palette.cropColor(pickup.cropId,part,8);
          context.fillStyle=`rgb(${Math.round(color[0])},${Math.round(color[1])},${Math.round(color[2])})`;
          context.fillRect(x-1,y-1,pickup.kind==='produce'?2:1,pickup.kind==='produce'?2:1);
        }
        if(pickup.amount>1){
          context.fillStyle='rgba(245,248,255,.9)';
          context.fillRect(x+1,y-1,1,1);
        }
      }
    }
  }


  function drawExplosionEffects(originX,originY){
    for(const effect of state.entities.explosions){
      const progress=1-effect.frames/effect.maxFrames;
      const x=effect.x-originX;
      const y=effect.y-originY;
      const radius=Math.max(1,effect.radius*(.28+progress*.72));
      const droneStrike=effect.kind==='drone';
      const serpentSplash=effect.kind==='serpent';
      const nyanBurst=effect.kind==='nyan';
      if(nyanBurst){
        for(let band=0;band<NYAN_RAINBOW.length;band++){
          drawPixelCircle(x,y,Math.max(1,radius-band*.85),NYAN_RAINBOW[band],1);
        }
        if(effect.frames>11){
          context.fillStyle='rgb(255,250,220)';
          context.fillRect(Math.round(x)-2,Math.round(y)-2,5,5);
          context.fillRect(Math.round(x)-5,Math.round(y),11,1);
          context.fillRect(Math.round(x),Math.round(y)-5,1,11);
        }
        continue;
      }
      const outerColor=effect.color??(serpentSplash
        ?(effect.frames>5?'rgb(174,235,248)':'rgb(47,147,216)')
        :droneStrike
          ?(effect.frames>12?'rgb(255,252,220)':'rgb(255,92,30)')
          :(effect.frames>7?'rgb(255,238,150)':'rgb(255,112,38)'));
      const thickness=serpentSplash?2:(droneStrike&&effect.frames>12?3:(effect.frames>7?2:1));
      drawPixelCircle(x,y,radius,outerColor,thickness);

      if(droneStrike){
        drawPixelCircle(x,y,Math.max(1,radius*.62),'rgb(255,178,54)',1);
      }

      if(effect.frames>(droneStrike?14:8)){
        context.fillStyle='rgb(255,245,205)';
        context.fillRect(Math.round(x)-2,Math.round(y)-2,5,5);
      }
    }
  }


  function drawAmbientJuice(current,originX,originY){
    const biome=String(state.ui.hud?.biome??'');
    const underground=originY>0;
    let colors=null;
    let count=0;
    let driftY=0;
    if(biome.includes('swamp')){ colors=['rgba(220,242,112,.72)','rgba(119,203,105,.56)']; count=20; driftY=-1; }
    else if(biome.includes('mushroom')){ colors=['rgba(238,135,225,.65)','rgba(152,103,211,.55)']; count=26; driftY=-1; }
    else if(biome.includes('volcano')){ colors=['rgba(255,122,45,.72)','rgba(255,205,76,.54)']; count=20; driftY=-2; }
    else if(biome.includes('snow')){ colors=['rgba(237,247,255,.46)','rgba(173,213,236,.38)']; count=16; driftY=1; }
    else if(biome==='moon'){ colors=['rgba(225,230,255,.62)','rgba(146,134,220,.42)']; count=24; driftY=0; }
    else if(biome.includes('emberdeep')){ colors=['rgba(255,92,35,.72)','rgba(255,211,77,.52)']; count=28; driftY=-2; }
    else if(biome.includes('frostvoid')){ colors=['rgba(226,248,255,.62)','rgba(104,181,255,.42)']; count=26; driftY=1; }
    else if(biome.includes('prismatica')){ colors=['rgba(255,77,206,.62)','rgba(72,242,255,.56)','rgba(255,236,83,.5)']; count=30; driftY=-1; }
    else if(biome.includes('blacktide')){ colors=['rgba(70,216,224,.38)','rgba(18,95,150,.42)']; count=24; driftY=-1; }
    else if(biome.includes('verdant')){ colors=['rgba(166,255,111,.58)','rgba(51,194,92,.46)']; count=28; driftY=-1; }
    else if(biome.includes('clockwork')){ colors=['rgba(255,207,98,.46)','rgba(174,112,43,.38)']; count=18; driftY=0; }
    else if(biome.includes('lucid')){ colors=['rgba(255,123,226,.66)','rgba(126,101,255,.52)']; count=32; driftY=-1; }
    else if(biome.includes('cloudsea')){ colors=['rgba(255,255,255,.62)','rgba(132,213,255,.44)']; count=24; driftY=0; }
    else if(biome.includes('static')){ colors=['rgba(66,255,205,.62)','rgba(255,53,207,.58)','rgba(255,245,65,.48)']; count=30; driftY=0; }
    else if(underground){ colors=['rgba(163,179,193,.26)','rgba(109,130,151,.22)']; count=12; driftY=-1; }
    if(!colors)return;
    for(let index=0;index<count;index++){
      const value=hash(index*3253+state.world.camera.chunkX*557+state.world.camera.chunkY*911);
      const x=positiveModulo((value%WORLD_WIDTH)+Math.floor(state.frame*(index%2?-.03:.02)),WORLD_WIDTH);
      const y=positiveModulo(((value>>>9)%WORLD_HEIGHT)+Math.floor(state.frame*driftY/Math.max(1,18+(index%7)*3)),WORLD_HEIGHT);
      if(current.cells[x+y*WORLD_WIDTH]!==M.AIR)continue;
      context.fillStyle=colors[(index+Math.floor(state.frame/18))%colors.length];
      context.fillRect(x,y,(index%9===0&&state.frame%12<6)?2:1,1);
    }
  }

  function drawJuiceWorld(originX,originY){
    for(const wave of state.entities.juiceShockwaves??[]){
      const progress=1-wave.life/Math.max(1,wave.maxLife);
      const radius=Math.max(1,Math.round(wave.radius*progress));
      const x=wave.x-originX;
      const y=wave.y-originY;
      drawPixelCircle(x,y,radius,wave.color,wave.life>wave.maxLife*.5?2:1);
    }

    for(const flash of state.entities.juiceFlashes??[]){
      const ratio=flash.life/Math.max(1,flash.maxLife);
      const radius=Math.max(1,Math.round(flash.radius*ratio));
      const x=Math.round(flash.x-originX);
      const y=Math.round(flash.y-originY);
      context.fillStyle=flash.color;
      context.fillRect(x-radius,y,2*radius+1,1);
      context.fillRect(x,y-radius,1,2*radius+1);
      if(flash.life>flash.maxLife*.55){
        context.fillRect(x-1,y-1,3,3);
      }
    }

    for(const item of state.entities.juiceParticles??[]){
      const x=Math.round(item.x-originX);
      const y=Math.round(item.y-originY);
      if(x<-4||y<-4||x>WORLD_WIDTH+4||y>WORLD_HEIGHT+4)continue;
      if(item.twinkle&&Math.floor(item.life/item.twinkle)%2===0)continue;
      context.fillStyle=item.color;
      const size=item.life>item.maxLife*.66?item.size:1;
      if(item.kind==='star'){
        context.fillRect(x-1,y,3,1);
        context.fillRect(x,y-1,1,3);
      }else if(item.kind==='slash'){
        const horizontal=Math.abs(item.vx)>=Math.abs(item.vy);
        context.fillRect(x-(horizontal?1:0),y-(horizontal?0:1),horizontal?3:1,horizontal?1:3);
      }else if(item.kind==='streak'){
        const length=Math.max(2,Math.min(5,Math.round(Math.hypot(item.vx,item.vy)*3)));
        if(Math.abs(item.vx)>=Math.abs(item.vy))context.fillRect(x-Math.sign(item.vx||1)*length,y,length,1);
        else context.fillRect(x,y-Math.sign(item.vy||1)*length,1,length);
      }else{
        context.fillRect(x,y,size,size);
      }
    }

    for(const number of state.entities.damageNumbers??[]){
      const x=Math.round(number.x-originX);
      const y=Math.round(number.y-originY);
      if(x<-20||y<-10||x>WORLD_WIDTH+20||y>WORLD_HEIGHT+10)continue;
      const scale=number.big&&number.life>number.maxLife*.58?2:1;
      const width=pixelTextWidth(number.text,scale,scale);
      drawPixelText(context,number.text,x-Math.floor(width*.5)+1,y+1,'rgba(12,8,18,.78)',scale,scale);
      drawPixelText(context,number.text,x-Math.floor(width*.5),y,number.color,scale,scale);
    }
  }

  function drawJuiceScreen(){
    const speed=Math.max(0,Math.min(1,state.juice?.speedIntensity??0));
    if(speed>.02){
      const count=Math.round(4+speed*18);
      context.fillStyle='rgba(216,238,255,.28)';
      for(let index=0;index<count;index++){
        const value=hash(index*2017+Math.floor(state.frame/2));
        const x=value%WORLD_WIDTH;
        const y=(value>>>9)%WORLD_HEIGHT;
        const direction=Math.sign(state.player.vx||1);
        const length=2+Math.round(speed*6)+index%3;
        context.fillRect(x-direction*length,y,length,1);
      }
    }

    const hpRatio=Math.max(0,Math.min(1,state.player.hp/100));
    if(hpRatio<.28&&!state.ui.inventoryOpen&&!state.ui.worldMenuOpen){
      const pulse=(Math.sin(state.frame*.18)+1)*.5;
      const thickness=1+Math.round((1-hpRatio)*3+pulse);
      context.fillStyle=`rgba(145,18,34,${.16+pulse*.12})`;
      context.fillRect(0,0,WORLD_WIDTH,thickness);
      context.fillRect(0,WORLD_HEIGHT-thickness,WORLD_WIDTH,thickness);
      context.fillRect(0,0,thickness,WORLD_HEIGHT);
      context.fillRect(WORLD_WIDTH-thickness,0,thickness,WORLD_HEIGHT);
    }

    if((state.juice?.screenFlash??0)>0){
      context.fillStyle=state.juice.screenFlashColor??'rgba(255,255,255,.2)';
      context.fillRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);
    }
  }

  function drawHook(originX,originY){
    const hook=state.entities.hook;
    if(!hook.active)return;

    drawPixelLine(
      state.player.x-originX,
      state.player.y-2-originY,
      hook.x-originX,
      hook.y-originY,
      'rgb(185,190,200)',
    );

    context.fillStyle='rgb(240,205,80)';
    context.fillRect(Math.round(hook.x-originX)-1,Math.round(hook.y-originY)-1,3,3);
  }

  function rgb(color){ return `rgb(${color[0]},${color[1]},${color[2]})`; }

  function drawCreaturePixel(x,y,offsetX,offsetY,facing,color){
    context.fillStyle=color;
    context.fillRect(x+offsetX*facing,y+offsetY,1,1);
  }

  function drawCreatureRect(x,y,offsetX,offsetY,width,height,facing,color){
    context.fillStyle=color;
    const left=facing<0?x-offsetX-width+1:x+offsetX;
    context.fillRect(left,y+offsetY,width,height);
  }

  function drawCreatureSprite(enemy,species,x,y){
    const frame=Math.floor((state.frame+(enemy.animationOffset??0))/Math.max(2,species.animationRate??8))%2;
    const facing=enemy.facing<0?-1:1;
    const moving=Math.abs(enemy.vx??0)>.08||Math.abs(enemy.vy??0)>.08;
    const body=enemy.burning>0&&state.frame%4<2?'rgb(255,145,35)':enemy.hit>0?'rgb(255,235,235)':rgb(species.palette[0]);
    const accent=rgb(species.palette[1]);
    const dark=rgb(species.palette[2]);
    const legA=moving?(frame?0:1):0;
    const legB=moving?(frame?1:0):0;
    const sprite=species.sprite;

    if(sprite==='hare'){
      drawCreatureRect(x,y,-1,-2,3,2,facing,body);
      drawCreaturePixel(x,y,1,-3,facing,body); drawCreaturePixel(x,y,1,-4,facing,body);
      drawCreaturePixel(x,y,0,-4,facing,accent); drawCreaturePixel(x,y,-2,-2,facing,accent);
      drawCreaturePixel(x,y,1,0,facing,dark); drawCreaturePixel(x,y,-1-legA,0,facing,dark);
    }else if(sprite==='mouse'||sprite==='rat'){
      drawCreatureRect(x,y,-1,-1,3,2,facing,body);
      drawCreaturePixel(x,y,1,-2,facing,accent); drawCreaturePixel(x,y,2,-1,facing,dark);
      drawPixelLine(x-2*facing,y,x-(4+frame)*facing,y+frame,dark);
      drawCreaturePixel(x,y,-1,1,facing,dark); drawCreaturePixel(x,y,1,1,facing,dark);
    }else if(sprite==='deer'||sprite==='goat'||sprite==='yak'){
      const longBody=sprite==='yak'?5:4;
      drawCreatureRect(x,y,-2,-3,longBody,3,facing,body);
      drawCreatureRect(x,y,2,-5,2,3,facing,accent);
      drawCreaturePixel(x,y,3,-5,facing,dark);
      if(sprite==='deer'){
        drawPixelLine(x+2*facing,y-5,x+1*facing,y-7,dark);
        drawPixelLine(x+3*facing,y-5,x+4*facing,y-7,dark);
      }else if(sprite==='goat'){
        drawCreaturePixel(x,y,2,-6,facing,dark); drawCreaturePixel(x,y,3,-6,facing,dark);
      }else{
        drawCreatureRect(x,y,-3,-4,6,1,facing,dark);
        drawCreaturePixel(x,y,3,-5,facing,dark);
      }
      drawCreaturePixel(x,y,-1-legA,0,facing,dark); drawCreaturePixel(x,y,1+legB,0,facing,dark);
    }else if(['fox','wolf','badger','boar','panda','quadruped'].includes(sprite)){
      const width=sprite==='panda'?5:4;
      drawCreatureRect(x,y,-2,-3,width,3,facing,body);
      drawCreatureRect(x,y,2,-4,2,2,facing,accent);
      drawCreaturePixel(x,y,3,-4,facing,dark);
      if(sprite==='fox'||sprite==='wolf')drawPixelLine(x-2*facing,y-3,x-(4+frame)*facing,y-4+frame,accent);
      if(sprite==='boar'){ drawCreaturePixel(x,y,4,-3,facing,accent); drawCreaturePixel(x,y,4,-2,facing,dark); }
      if(sprite==='badger')drawCreatureRect(x,y,-1,-3,3,1,facing,accent);
      if(sprite==='panda'){ drawCreaturePixel(x,y,2,-5,facing,dark); drawCreaturePixel(x,y,3,-5,facing,dark); }
      drawCreaturePixel(x,y,-1-legA,0,facing,dark); drawCreaturePixel(x,y,1+legB,0,facing,dark);
    }else if(sprite==='squirrel'){
      drawCreatureRect(x,y,-1,-2,3,2,facing,body);
      drawCreatureRect(x,y,1,-4,2,2,facing,accent);
      drawPixelLine(x-1*facing,y-2,x-(3+frame)*facing,y-5+frame,accent,2);
      drawCreaturePixel(x,y,2,-4,facing,dark); drawCreaturePixel(x,y,-1,0,facing,dark);
    }else if(sprite==='hedgehog'){
      drawCreatureRect(x,y,-2,-2,4,2,facing,body);
      for(let i=-2;i<=1;i++)drawCreaturePixel(x,y,i,-3-(Math.abs(i)%2),facing,dark);
      drawCreaturePixel(x,y,2,-1,facing,accent); drawCreaturePixel(x,y,2,-2,facing,dark);
    }else if(['bee','hornet','firefly'].includes(sprite)){
      drawCreatureRect(x,y,-1,-1,3,2,facing,body);
      drawCreaturePixel(x,y,0,-2-frame,facing,accent); drawCreaturePixel(x,y,-1,-2+(frame?1:0),facing,accent);
      drawCreaturePixel(x,y,1,-1,facing,dark);
      if(sprite==='firefly')drawCreaturePixel(x,y,-1,0,facing,accent);
      else drawCreaturePixel(x,y,-1,-1,facing,dark);
    }else if(sprite==='swarm'){
      for(const [ox,oy] of [[-2,-1],[0,-2],[2,-1],[-1,1],[1,1]])drawCreaturePixel(x,y,ox+(frame&&oy<0?1:0),oy,facing,body);
      drawCreaturePixel(x,y,0,0,facing,accent);
    }else if(['bird','owl','duck'].includes(sprite)){
      drawCreatureRect(x,y,-1,-1,3,2,facing,body);
      drawCreaturePixel(x,y,2,-1,facing,accent); drawCreaturePixel(x,y,2,-2,facing,dark);
      const wingY=frame?-3:0;
      drawPixelLine(x,y-1,x-2*facing,y+wingY,accent,1);
      if(sprite==='owl'){ drawCreaturePixel(x,y,1,-2,facing,accent); drawCreaturePixel(x,y,0,-2,facing,accent); }
      if(sprite==='duck')drawCreaturePixel(x,y,3,-1,facing,accent);
    }else if(sprite==='penguin'){
      drawCreatureRect(x,y,-1,-4,3,4,facing,dark);
      drawCreatureRect(x,y,0,-3,2,3,facing,accent);
      drawCreaturePixel(x,y,2,-3,facing,species.palette[2]?rgb([232,157,60]):accent);
      drawCreaturePixel(x,y,-1-frame,0,facing,accent); drawCreaturePixel(x,y,1+frame,0,facing,accent);
    }else if(['bat','moth'].includes(sprite)){
      drawCreatureRect(x,y,0,-1,2,3,facing,body);
      const wingHeight=frame?1:3;
      drawPixelLine(x-1*facing,y-1,x-(4+frame)*facing,y-wingHeight,accent,2);
      drawPixelLine(x+1*facing,y-1,x+(4+frame)*facing,y-wingHeight,accent,2);
      drawCreaturePixel(x,y,1,-2,facing,dark);
    }else if(sprite==='imp'){
      drawCreatureRect(x,y,-1,-2,3,4,facing,body);
      drawCreaturePixel(x,y,-1,-3,facing,accent); drawCreaturePixel(x,y,1,-3,facing,accent);
      drawPixelLine(x-1*facing,y,x-(3+frame)*facing,y+2,dark);
      drawCreaturePixel(x,y,1,-1,facing,accent);
    }else if(['beetle','mite'].includes(sprite)){
      drawCreatureRect(x,y,-2,-2,4,3,facing,body);
      drawCreatureRect(x,y,-1,-2,2,2,facing,accent);
      drawCreaturePixel(x,y,2,-1,facing,dark);
      for(const side of [-1,1]){
        drawCreaturePixel(x,y,-1+frame,side>0?1:-3,facing,dark);
        drawCreaturePixel(x,y,1-frame,side>0?1:-3,facing,dark);
      }
    }else if(sprite==='mantis'){
      drawCreatureRect(x,y,0,-4,2,4,facing,body);
      drawCreaturePixel(x,y,1,-5,facing,accent);
      drawPixelLine(x,y-3,x+3*facing,y-4+frame,dark);
      drawPixelLine(x,y-2,x-2*facing,y-1-frame,dark);
      drawCreaturePixel(x,y,-1,0,facing,dark); drawCreaturePixel(x,y,1,0,facing,dark);
    }else if(sprite==='spider'){
      drawCreatureRect(x,y,-1,-2,3,3,facing,body);
      drawCreaturePixel(x,y,0,-2,facing,accent);
      for(const side of [-1,1])for(let leg=0;leg<3;leg++)drawPixelLine(x+side,y-1+leg,x+side*(3+frame),y-3+leg*2+(frame?1:0),dark);
    }else if(sprite==='scorpion'){
      drawCreatureRect(x,y,-2,-2,4,3,facing,body);
      drawCreaturePixel(x,y,2,-1,facing,accent);
      drawPixelLine(x-2*facing,y-2,x-4*facing,y-4-frame,dark);
      drawCreaturePixel(x,y,-4,-5-frame,facing,accent);
      drawCreaturePixel(x,y,-1,1,facing,dark); drawCreaturePixel(x,y,1,1,facing,dark);
    }else if(sprite==='crab'){
      drawCreatureRect(x,y,-2,-2,5,3,facing,body);
      drawCreaturePixel(x,y,-3,-2-frame,facing,accent); drawCreaturePixel(x,y,3,-2+(frame?0:-1),facing,accent);
      drawCreaturePixel(x,y,-2,1,facing,dark); drawCreaturePixel(x,y,2,1,facing,dark);
      drawCreaturePixel(x,y,-1,-2,facing,dark); drawCreaturePixel(x,y,1,-2,facing,dark);
    }else if(['lizard','gecko','newt','crawler'].includes(sprite)){
      drawCreatureRect(x,y,-2,-2,5,2,facing,body);
      drawCreaturePixel(x,y,2,-3,facing,accent); drawCreaturePixel(x,y,3,-2,facing,dark);
      drawPixelLine(x-2*facing,y-1,x-(5+frame)*facing,y-2+frame,accent);
      drawCreaturePixel(x,y,-1-legA,0,facing,dark); drawCreaturePixel(x,y,1+legB,0,facing,dark);
      if(sprite==='crawler')drawCreatureRect(x,y,-1,-3,3,1,facing,dark);
    }else if(sprite==='frog'){
      const crouch=frame&&moving?1:0;
      drawCreatureRect(x,y,-1,-2+crouch,3,2,facing,body);
      drawCreaturePixel(x,y,1,-3+crouch,facing,accent); drawCreaturePixel(x,y,2,-2+crouch,facing,dark);
      drawCreaturePixel(x,y,-2,0,facing,dark); drawCreaturePixel(x,y,2+(frame?1:0),0,facing,dark);
    }else if(['snake','eel','leech','worm','grub'].includes(sprite)){
      const length=species.width??6;
      for(let i=0;i<length;i++)drawCreaturePixel(x,y,2-Math.floor(length/2)+i,(i+frame)%2, facing,i===length-1?accent:body);
      drawCreaturePixel(x,y,Math.ceil(length/2),0,facing,dark);
    }else if(['fish','shark','dolphin'].includes(sprite)){
      const length=sprite==='shark'||sprite==='dolphin'?6:4;
      drawCreatureRect(x,y,-Math.floor(length/2),-1,length,3,facing,body);
      drawCreaturePixel(x,y,Math.ceil(length/2),0,facing,dark);
      drawCreaturePixel(x,y,-Math.ceil(length/2)-1,-1-frame,facing,accent);
      drawCreaturePixel(x,y,-Math.ceil(length/2)-1,1+frame,facing,accent);
      if(sprite==='shark')drawCreaturePixel(x,y,0,-2,facing,accent);
      if(sprite==='dolphin')drawCreaturePixel(x,y,2,-2,facing,accent);
    }else if(sprite==='seahorse'){
      drawCreatureRect(x,y,0,-2,2,4,facing,body);
      drawCreaturePixel(x,y,2,-2,facing,accent); drawCreaturePixel(x,y,2,-3,facing,dark);
      drawPixelLine(x,y+1,x-2*facing,y+3-frame,accent);
    }else if(sprite==='squid'){
      drawCreatureRect(x,y,-1,-3,3,3,facing,body);
      drawCreaturePixel(x,y,0,-4,facing,accent);
      for(let i=-2;i<=2;i+=2)drawPixelLine(x+i,y,x+i+(frame?1:-1),y+3,dark);
      drawCreaturePixel(x,y,1,-2,facing,dark);
    }else if(sprite==='jellyfish'){
      drawCreatureRect(x,y,-2,-2,5,2,facing,body);
      drawCreatureRect(x,y,-1,-3,3,1,facing,accent);
      for(let i=-2;i<=2;i+=2)drawPixelLine(x+i,y,x+i+(frame?1:0),y+3,dark);
    }else if(sprite==='turtle'){
      drawCreatureRect(x,y,-2,-2,5,3,facing,body);
      drawCreatureRect(x,y,-1,-2,3,2,facing,accent);
      drawCreaturePixel(x,y,3,-1,facing,dark);
      drawCreaturePixel(x,y,-2-legA,1,facing,dark); drawCreaturePixel(x,y,2+legB,1,facing,dark);
    }else if(sprite==='snail'){
      drawCreatureRect(x,y,-2,-1,5,2,facing,body);
      drawCreatureRect(x,y,-1,-3,3,3,facing,accent);
      drawCreaturePixel(x,y,3,-2,facing,dark); drawCreaturePixel(x,y,3,-3-frame,facing,dark);
    }else if(sprite==='slime'){
      const squish=frame&&moving?1:0;
      drawCreatureRect(x,y,-2,-3+squish,5,3-squish,facing,body);
      drawCreatureRect(x,y,-1,-4+squish,3,1,facing,accent);
      drawCreaturePixel(x,y,1,-2+squish,facing,dark); drawCreaturePixel(x,y,-1,-2+squish,facing,dark);
    }else if(sprite==='sporeling'){
      drawCreatureRect(x,y,-1,-3,3,4,facing,body);
      drawCreatureRect(x,y,-2,-5,5,2,facing,accent);
      drawCreaturePixel(x,y,1,-4,facing,dark);
      drawCreaturePixel(x,y,-1-legA,1,facing,dark); drawCreaturePixel(x,y,1+legB,1,facing,dark);
    }else if(sprite==='mimic'){
      if(enemy.disguised){
        drawCreatureRect(x,y,-2,-4,5,5,facing,body);
        drawCreatureRect(x,y,-1,-3,3,3,facing,dark);
        drawCreaturePixel(x,y,-2,-5,facing,accent); drawCreaturePixel(x,y,0,-5,facing,accent); drawCreaturePixel(x,y,2,-5,facing,accent);
        drawCreaturePixel(x,y,-1,-2,facing,body); drawCreaturePixel(x,y,1,-1,facing,body);
      }else{
        drawCreatureRect(x,y,-2,-4,5,5,facing,body);
        drawCreatureRect(x,y,-1,-3,3,2,facing,dark);
        drawCreaturePixel(x,y,-1,-2,facing,accent); drawCreaturePixel(x,y,1,-2,facing,accent);
        drawCreaturePixel(x,y,-2,1,facing,dark); drawCreaturePixel(x,y,2,1,facing,dark);
      }
    }else{
      drawCreatureRect(x,y,-1,-1,3,3,facing,body);
      drawCreaturePixel(x,y,1,-1,facing,accent);
    }
  }

  function drawEnemyBehaviorWorld(originX,originY){
    for(const nest of state.entities.enemyNests??[]){
      const x=Math.round(nest.x-originX);
      const y=Math.round(nest.y-originY);
      if(x<-8||y<-8||x>WORLD_WIDTH+8||y>WORLD_HEIGHT+8)continue;
      const species=faunaById(nest.speciesId);
      const paletteRows=species?.palette??[[143,104,65],[221,194,137],[69,52,42]];
      const pulse=Math.floor((state.frame+(nest.phase??0)*10)/7)%2;
      context.fillStyle=rgb(paletteRows[2]);
      context.fillRect(x-3,y-2,7,3);
      context.fillRect(x-2,y-4,5,2);
      context.fillStyle=rgb(paletteRows[0]);
      context.fillRect(x-2,y-3,5,3);
      context.fillStyle=rgb(paletteRows[1]);
      context.fillRect(x-1,y-3,1,1);
      context.fillRect(x+1,y-2,1,1);
      if(pulse){
        context.fillStyle='rgb(244,232,185)';
        context.fillRect(x,y-4,1,1);
      }
    }

    for(const portal of state.entities.invasionPortals??[]){
      const x=Math.round(portal.x-originX);
      const y=Math.round(portal.y-originY);
      if(x<-12||y<-14||x>WORLD_WIDTH+12||y>WORLD_HEIGHT+14)continue;
      const colors=dimensionDefinition(portal.sourceDimension).portalColors;
      const opening=Math.min(1,(portal.age??0)/70);
      const radiusX=Math.max(2,Math.round(4*opening));
      const radiusY=Math.max(3,Math.round(7*opening));
      context.fillStyle='rgb(4,2,12)';
      context.fillRect(x-radiusX+1,y-radiusY+1,Math.max(1,radiusX*2-1),Math.max(2,radiusY*2-1));
      for(let step=0;step<24;step++){
        const angle=portal.phase+step/24*Math.PI*2;
        const px=x+Math.round(Math.cos(angle)*radiusX);
        const py=y+Math.round(Math.sin(angle)*radiusY);
        context.fillStyle=colors[(step+Math.floor(state.frame/3))%colors.length];
        context.fillRect(px,py,step%6===0?2:1,step%5===0?2:1);
      }
      if((portal.spawnTimer??99)<12){
        context.fillStyle='rgba(255,255,255,.75)';
        context.fillRect(x-radiusX-2,y,2,1);
        context.fillRect(x+radiusX+1,y,2,1);
      }
    }
  }

  function drawAttachedParasites(originX,originY){
    const attached=state.player.attachedParasites??[];
    if(attached.length===0)return;
    const baseX=Math.round(state.player.x-originX);
    const baseY=Math.round(state.player.y-2-originY);
    for(let index=0;index<attached.length;index++){
      const parasite=attached[index];
      const species=faunaById(parasite.speciesId);
      const color=species?rgb(species.palette[0]):'rgb(255,68,190)';
      const accent=species?rgb(species.palette[1]):'rgb(80,255,216)';
      const angle=(parasite.phase??0)+index*Math.PI*2/Math.max(1,attached.length);
      const x=baseX+Math.round(Math.cos(angle)*2);
      const y=baseY+Math.round(Math.sin(angle)*2);
      context.fillStyle=color;
      context.fillRect(x-1,y,3,1);
      context.fillStyle=accent;
      context.fillRect(x,y-1,1,1);
    }
  }

  function drawEnemies(originX,originY){
    for(const chunk of state.world.activeChunks){
      for(const enemy of chunk.enemies){
        const species=faunaById(enemy.speciesId)??{
          sprite:'wisp',animationRate:8,palette:[[195,65,100],[255,170,190],[84,34,60]],width:3,height:3,
        };
        const x=enemy.x-originX;
        const y=enemy.y-originY;
        const margin=Math.max(species.width??3,species.height??3)+4;
        if(x<-margin||y<-margin||x>WORLD_WIDTH+margin||y>WORLD_HEIGHT+margin)continue;
        if(enemy.burrowed){
          const px=Math.round(x),py=Math.round(y);
          context.fillStyle='rgb(108,78,54)';
          context.fillRect(px-2,py-1,5,1);
          context.fillStyle='rgb(174,127,75)';
          context.fillRect(px+(state.frame%5<2?-1:1),py-2,1,1);
          continue;
        }
        drawCreatureSprite(enemy,species,Math.round(x),Math.round(y));
        if(enemy.climbing){
          context.fillStyle=rgb(species.palette[1]);
          context.fillRect(Math.round(x)+enemy.facing*3,Math.round(y)-3,1,1);
          context.fillRect(Math.round(x)+enemy.facing*3,Math.round(y),1,1);
        }
        if(Number.isInteger(enemy.stolenWeaponId)){
          drawWeaponIcon(Math.round(x)-4,Math.round(y)-11,enemy.stolenWeaponId);
          context.fillStyle=state.frame%8<4?'rgb(255,233,116)':'rgb(255,126,64)';
          context.fillRect(Math.round(x),Math.round(y)-7,1,1);
        }
      }
    }
  }


  function drawBossSprite(pixelX,pixelY,boss){
    const flapping=Math.floor((boss.flap??0)/2)%2===0;
    const bodyColor=boss.hit>0?'rgb(255,235,235)':'rgb(76,40,56)';
    const bodyShade='rgb(46,24,36)';
    const lavaColor='rgb(214,86,52)';
    const glowColor='rgb(255,192,88)';
    const wingColor='rgb(114,54,68)';

    context.fillStyle=wingColor;
    if(flapping){
      context.fillRect(pixelX-10,pixelY-5,4,1);
      context.fillRect(pixelX-12,pixelY-4,5,1);
      context.fillRect(pixelX-14,pixelY-3,6,1);
      context.fillRect(pixelX+7,pixelY-5,4,1);
      context.fillRect(pixelX+8,pixelY-4,5,1);
      context.fillRect(pixelX+8,pixelY-3,6,1);
    }else{
      context.fillRect(pixelX-12,pixelY-1,6,1);
      context.fillRect(pixelX-14,pixelY,7,1);
      context.fillRect(pixelX-12,pixelY+1,6,1);
      context.fillRect(pixelX+7,pixelY-1,6,1);
      context.fillRect(pixelX+8,pixelY,7,1);
      context.fillRect(pixelX+7,pixelY+1,6,1);
    }

    context.fillStyle=bodyShade;
    context.fillRect(pixelX-4,pixelY-4,9,2);
    context.fillRect(pixelX-6,pixelY-1,13,5);
    context.fillRect(pixelX-4,pixelY+4,9,2);
    context.fillRect(pixelX-1,pixelY+6,3,1);

    context.fillStyle=bodyColor;
    context.fillRect(pixelX-3,pixelY-5,7,2);
    context.fillRect(pixelX-5,pixelY-2,11,6);
    context.fillRect(pixelX-3,pixelY+4,7,1);

    context.fillStyle=lavaColor;
    context.fillRect(pixelX-2,pixelY-1,5,3);
    context.fillRect(pixelX-1,pixelY+2,3,1);

    context.fillStyle=glowColor;
    context.fillRect(pixelX-1,pixelY,1,1);
    context.fillRect(pixelX+1,pixelY,1,1);
    context.fillRect(pixelX,pixelY+1,1,1);

    context.fillStyle='rgb(245,72,56)';
    context.fillRect(pixelX-2,pixelY-3,1,1);
    context.fillRect(pixelX+2,pixelY-3,1,1);

    context.fillStyle='rgb(225,210,188)';
    context.fillRect(pixelX-4,pixelY-6,1,2);
    context.fillRect(pixelX+3,pixelY-6,1,2);
    context.fillRect(pixelX-3,pixelY+5,1,2);
    context.fillRect(pixelX+2,pixelY+5,1,2);
  }

  function drawSeaSerpentSprite(pixelX,pixelY,boss,originY){
    const waterY=Math.round((boss.waterY??boss.y+10)-originY);
    const hitFlash=boss.hit>0;
    const bodyColor=hitFlash?'rgb(238,250,255)':'rgb(24,110,126)';
    const bodyShade='rgb(14,62,83)';
    const finColor='rgb(38,154,151)';
    const bellyColor='rgb(82,190,174)';
    const eyeColor='rgb(255,220,96)';
    const phase=(boss.flap??0)*.28;

    const segments=Math.max(5,Math.min(11,Math.ceil((waterY-pixelY+18)/3)));
    for(let segment=segments-1;segment>=0;segment--){
      const sy=pixelY+5+segment*3;
      const sx=pixelX+Math.round(Math.sin(phase+segment*.72)*(3+segment*.38));
      const submerged=sy>=waterY;
      context.fillStyle=submerged?'rgb(18,77,109)':bodyShade;
      context.fillRect(sx-3,sy-1,7,3);
      context.fillStyle=submerged?'rgb(24,105,132)':bodyColor;
      context.fillRect(sx-2,sy-1,5,2);
      if(segment%2===0){
        context.fillStyle=submerged?'rgb(28,118,137)':finColor;
        context.fillRect(sx-4,sy,1,2);
        context.fillRect(sx+4,sy,1,2);
      }
    }

    context.fillStyle=bodyShade;
    context.fillRect(pixelX-5,pixelY-5,11,8);
    context.fillRect(pixelX-7,pixelY-2,15,4);
    context.fillRect(pixelX-4,pixelY+3,9,3);
    context.fillStyle=bodyColor;
    context.fillRect(pixelX-4,pixelY-6,9,8);
    context.fillRect(pixelX-6,pixelY-2,13,3);
    context.fillRect(pixelX-3,pixelY+2,7,3);

    context.fillStyle=bellyColor;
    context.fillRect(pixelX-2,pixelY-1,5,5);
    context.fillRect(pixelX-1,pixelY+4,3,1);

    context.fillStyle=finColor;
    context.fillRect(pixelX-7,pixelY-5,2,4);
    context.fillRect(pixelX+6,pixelY-5,2,4);
    context.fillRect(pixelX-9,pixelY-4,2,2);
    context.fillRect(pixelX+8,pixelY-4,2,2);
    context.fillRect(pixelX,pixelY-8,1,3);
    context.fillRect(pixelX-2,pixelY-7,1,2);
    context.fillRect(pixelX+2,pixelY-7,1,2);

    context.fillStyle=eyeColor;
    context.fillRect(pixelX-3,pixelY-4,1,1);
    context.fillRect(pixelX+3,pixelY-4,1,1);
    context.fillStyle='rgb(10,22,31)';
    context.fillRect(pixelX-3,pixelY-3,1,1);
    context.fillRect(pixelX+3,pixelY-3,1,1);

    context.fillStyle='rgb(210,244,244)';
    context.fillRect(pixelX-1,pixelY-6,1,1);
    context.fillRect(pixelX+1,pixelY-5,1,1);

    if(boss.phase==='emerge'||Math.abs(pixelY-waterY)<18){
      context.fillStyle='rgb(164,225,238)';
      const splashPhase=Math.floor((boss.flap??0))%3;
      context.fillRect(pixelX-10-splashPhase,waterY,5,1);
      context.fillRect(pixelX+6+splashPhase,waterY,5,1);
      context.fillRect(pixelX-6,waterY-1,3,1);
      context.fillRect(pixelX+4,waterY-2,3,1);
    }
  }

  function drawFrostColossus(x,y,boss){
    const body=boss.hit>0?'rgb(255,255,255)':'rgb(166,219,240)';
    context.fillStyle='rgb(77,125,160)';
    context.fillRect(x-5,y-6,11,12);
    context.fillRect(x-8,y-2,3,7);
    context.fillRect(x+6,y-2,3,7);
    context.fillRect(x-5,y+6,4,3);
    context.fillRect(x+2,y+6,4,3);
    context.fillStyle=body;
    context.fillRect(x-4,y-7,9,5);
    context.fillRect(x-6,y-2,13,8);
    context.fillRect(x-8,y-1,2,5);
    context.fillRect(x+7,y-1,2,5);
    context.fillStyle='rgb(229,248,255)';
    context.fillRect(x-2,y-5,1,1);
    context.fillRect(x+2,y-5,1,1);
    context.fillRect(x-2,y,5,2);
    context.fillStyle='rgb(87,155,205)';
    context.fillRect(x-1,y+1,3,1);
  }

  function drawBogLeviathan(x,y,boss){
    const body=boss.hit>0?'rgb(235,247,208)':'rgb(84,126,63)';
    context.fillStyle='rgb(55,70,43)';
    context.fillRect(x-9,y-3,19,7);
    context.fillRect(x-7,y-6,15,4);
    context.fillRect(x-6,y+4,4,2);
    context.fillRect(x+3,y+4,4,2);
    context.fillStyle=body;
    context.fillRect(x-8,y-4,17,7);
    context.fillRect(x-6,y-7,13,4);
    context.fillStyle='rgb(167,184,82)';
    context.fillRect(x-4,y-5,2,1);
    context.fillRect(x+3,y-5,2,1);
    context.fillStyle='rgb(37,30,27)';
    context.fillRect(x-4,y,9,2);
    context.fillStyle='rgb(166,71,79)';
    context.fillRect(x-1,y+2,5,1);
    context.fillStyle='rgb(89,67,37)';
    context.fillRect(x-8,y+3,17,2);
  }

  function drawMycelialMonarch(x,y,boss){
    const cap=boss.hit>0?'rgb(255,224,250)':'rgb(191,76,178)';
    context.fillStyle='rgb(68,39,74)';
    context.fillRect(x-10,y-6,21,5);
    context.fillRect(x-7,y-9,15,4);
    context.fillStyle=cap;
    context.fillRect(x-9,y-7,19,5);
    context.fillRect(x-6,y-10,13,4);
    context.fillStyle='rgb(245,178,227)';
    context.fillRect(x-5,y-8,2,2);
    context.fillRect(x+2,y-6,2,2);
    context.fillRect(x+6,y-7,1,1);
    context.fillStyle='rgb(217,190,168)';
    context.fillRect(x-4,y-2,9,10);
    context.fillStyle='rgb(136,103,123)';
    context.fillRect(x-6,y+6,3,2);
    context.fillRect(x+4,y+6,3,2);
    context.fillRect(x-8,y+8,5,1);
    context.fillRect(x+4,y+8,5,1);
    context.fillStyle='rgb(75,35,76)';
    context.fillRect(x-2,y+1,1,1);
    context.fillRect(x+2,y+1,1,1);
  }

  function drawBambooWarMachine(x,y,boss){
    const bamboo=boss.hit>0?'rgb(240,250,188)':'rgb(126,181,67)';
    context.fillStyle='rgb(55,80,42)';
    context.fillRect(x-7,y-5,15,9);
    context.fillRect(x-9,y-2,2,7);
    context.fillRect(x+8,y-2,2,7);
    context.fillRect(x-6,y+4,3,5);
    context.fillRect(x+4,y+4,3,5);
    context.fillStyle=bamboo;
    for(const ox of [-6,-3,0,3,6])context.fillRect(x+ox,y-4,2,8);
    context.fillRect(x-8,y-1,2,5);
    context.fillRect(x+7,y-1,2,5);
    context.fillStyle='rgb(180,214,91)';
    context.fillRect(x-5,y-6,11,2);
    context.fillStyle='rgb(231,74,45)';
    context.fillRect(x-1,y-1,3,3);
  }

  function drawSegmentedWyrm(x,y,boss,colors,segments=8,scale=1){
    const phase=(boss.flap??0)*.35;
    for(let segment=segments-1;segment>=0;segment--){
      const sx=x-segment*3*scale;
      const sy=y+Math.round(Math.sin(phase+segment*.7)*2);
      context.fillStyle=segment%2?colors[0]:colors[1];
      context.fillRect(sx-2*scale,sy-scale,5*scale,3*scale);
    }
    context.fillStyle=boss.hit>0?'rgb(255,255,255)':colors[2];
    context.fillRect(x-5*scale,y-3*scale,9*scale,6*scale);
    context.fillStyle=colors[3];
    context.fillRect(x+2*scale,y-2*scale,3*scale,2*scale);
    context.fillStyle='rgb(245,225,112)';
    context.fillRect(x+2*scale,y-2*scale,1,1);
  }

  function drawCanopyWyrm(x,y,boss){
    drawSegmentedWyrm(x+7,y,boss,['rgb(35,97,56)','rgb(57,132,70)','rgb(81,166,91)','rgb(28,50,34)'],8,1);
    context.fillStyle='rgb(79,146,67)';
    context.fillRect(x-2,y-6,6,2);
    context.fillRect(x+1,y+4,6,2);
    context.fillRect(x-12,y-5,5,1);
  }

  function drawCrystalBurrower(x,y,boss){
    drawSegmentedWyrm(x+9,y,boss,['rgb(57,46,112)','rgb(91,72,174)','rgb(129,104,231)','rgb(37,31,67)'],10,1);
    context.fillStyle='rgb(216,207,255)';
    for(const ox of [-14,-8,-2,4]){
      context.fillRect(x+ox,y-4,1,3);
      context.fillRect(x+ox-1,y-3,3,1);
    }
    context.fillStyle='rgb(235,232,255)';
    context.fillRect(x+11,y-1,2,2);
  }

  function drawMagmaBehemoth(x,y,boss){
    const rock=boss.hit>0?'rgb(255,230,205)':'rgb(83,54,48)';
    context.fillStyle='rgb(45,29,27)';
    context.fillRect(x-8,y-6,17,12);
    context.fillRect(x-10,y-2,3,7);
    context.fillRect(x+8,y-2,3,7);
    context.fillRect(x-6,y+6,5,3);
    context.fillRect(x+2,y+6,5,3);
    context.fillStyle=rock;
    context.fillRect(x-7,y-7,15,12);
    context.fillRect(x-9,y-1,3,6);
    context.fillRect(x+7,y-1,3,6);
    context.fillStyle='rgb(231,69,28)';
    context.fillRect(x-3,y-4,2,7);
    context.fillRect(x+2,y-2,2,7);
    context.fillRect(x-1,y+3,4,2);
    context.fillStyle='rgb(255,200,76)';
    context.fillRect(x-2,y-3,1,2);
    context.fillRect(x+3,y-1,1,2);
  }

  function drawStormRoc(x,y,boss){
    const wingUp=Math.floor(boss.flap??0)%4<2;
    const feather=boss.hit>0?'rgb(245,250,255)':'rgb(79,100,145)';
    context.fillStyle='rgb(42,50,74)';
    if(wingUp){
      context.fillRect(x-13,y-7,9,2);
      context.fillRect(x+5,y-7,9,2);
      context.fillRect(x-11,y-5,7,2);
      context.fillRect(x+5,y-5,7,2);
    }else{
      context.fillRect(x-13,y,9,2);
      context.fillRect(x+5,y,9,2);
      context.fillRect(x-10,y+2,6,2);
      context.fillRect(x+5,y+2,6,2);
    }
    context.fillStyle=feather;
    context.fillRect(x-5,y-4,11,8);
    context.fillRect(x-2,y-6,5,3);
    context.fillStyle='rgb(226,239,255)';
    context.fillRect(x-1,y-4,1,1);
    context.fillRect(x+2,y-4,1,1);
    context.fillStyle='rgb(224,177,68)';
    context.fillRect(x+5,y-2,3,2);
  }

  function drawMoonStalker(x,y,boss){
    const body=boss.hit>0?'rgb(235,229,255)':'rgb(58,48,101)';
    context.fillStyle='rgb(25,23,48)';
    context.fillRect(x-5,y-7,11,13);
    context.fillRect(x-7,y-2,3,7);
    context.fillRect(x+5,y-2,3,7);
    context.fillStyle=body;
    context.fillRect(x-3,y-8,7,5);
    context.fillRect(x-4,y-3,9,9);
    context.fillStyle='rgb(210,202,255)';
    context.fillRect(x-1,y-6,1,1);
    context.fillRect(x+2,y-6,1,1);
    context.fillStyle='rgb(115,91,190)';
    context.fillRect(x+4,y-10,1,4);
    context.fillRect(x+5,y-9,2,1);
  }

  function drawDrownedFleet(x,y,boss){
    const ratio=boss.hp/Math.max(1,boss.maxHp);
    const hull=boss.hit>0?'rgb(225,237,231)':'rgb(74,93,86)';
    context.fillStyle='rgb(37,52,54)';
    context.fillRect(x-14,y,29,6);
    context.fillRect(x-11,y+6,23,3);
    context.fillStyle=hull;
    context.fillRect(x-13,y-1,27,6);
    context.fillRect(x-10,y+5,21,2);
    context.fillStyle='rgb(42,35,31)';
    context.fillRect(x-9,y+1,3,2);
    context.fillRect(x+5,y+1,3,2);
    if(ratio>.33){
      context.fillStyle='rgb(96,78,64)';
      context.fillRect(x,y-10,2,10);
      context.fillStyle='rgb(113,135,124)';
      context.fillRect(x+2,y-9,8,6);
      context.fillRect(x-8,y-8,7,5);
      context.fillStyle='rgb(44,61,62)';
      context.fillRect(x+5,y-7,2,2);
    }
    if(ratio>.66){
      context.fillStyle='rgb(137,160,162)';
      context.fillRect(x-12,y-3,5,2);
      context.fillRect(x+8,y-3,5,2);
    }
  }

  function drawSkyJellyfish(x,y,boss){
    const dome=boss.hit>0?'rgb(245,245,255)':'rgb(142,134,226)';
    context.fillStyle='rgb(70,67,139)';
    context.fillRect(x-9,y-5,19,7);
    context.fillRect(x-7,y-8,15,4);
    context.fillStyle=dome;
    context.fillRect(x-8,y-6,17,7);
    context.fillRect(x-6,y-9,13,4);
    context.fillStyle='rgb(219,224,255)';
    context.fillRect(x-3,y-7,2,2);
    context.fillRect(x+3,y-6,2,2);
    context.fillStyle='rgb(94,85,183)';
    for(let tentacle=-6;tentacle<=6;tentacle+=3){
      const offset=Math.round(Math.sin((boss.flap??0)*.3+tentacle)*2);
      context.fillRect(x+tentacle,y+1,1,8+offset);
      context.fillRect(x+tentacle+1,y+7+offset,2,1);
    }
  }

  function drawWorldEater(x,y,boss){
    drawSegmentedWyrm(x+12,y,boss,['rgb(84,48,35)','rgb(128,69,43)','rgb(180,93,52)','rgb(48,28,24)'],11,1);
    context.fillStyle='rgb(225,194,147)';
    context.fillRect(x+12,y-4,1,3);
    context.fillRect(x+12,y+2,1,3);
    context.fillRect(x+9,y-5,1,3);
    context.fillRect(x+9,y+3,1,3);
    context.fillStyle='rgb(39,23,21)';
    context.fillRect(x+10,y-1,5,3);
    context.fillStyle='rgb(255,178,72)';
    context.fillRect(x+8,y-2,1,1);
  }

  function drawBosses(originX,originY){
    for(const boss of state.entities.bosses){
      const x=Math.round(boss.x-originX);
      const y=Math.round(boss.y-originY);
      if(x<-20||y<-14||x>WORLD_WIDTH+20||y>WORLD_HEIGHT+14)continue;
      switch(boss.kind){
        case 'sea_serpent':drawSeaSerpentSprite(x,y,boss,originY);break;
        case 'frost_colossus':drawFrostColossus(x,y,boss);break;
        case 'bog_leviathan':drawBogLeviathan(x,y,boss);break;
        case 'mycelial_monarch':drawMycelialMonarch(x,y,boss);break;
        case 'bamboo_war_machine':drawBambooWarMachine(x,y,boss);break;
        case 'canopy_wyrm':drawCanopyWyrm(x,y,boss);break;
        case 'crystal_burrower':drawCrystalBurrower(x,y,boss);break;
        case 'magma_behemoth':drawMagmaBehemoth(x,y,boss);break;
        case 'storm_roc':drawStormRoc(x,y,boss);break;
        case 'moon_stalker':drawMoonStalker(x,y,boss);break;
        case 'drowned_fleet':drawDrownedFleet(x,y,boss);break;
        case 'sky_jellyfish':drawSkyJellyfish(x,y,boss);break;
        case 'world_eater':drawWorldEater(x,y,boss);break;
        default:drawBossSprite(x,y,boss);break;
      }
    }
  }

  function drawBossHud(){
    const boss=state.entities.bosses[0];
    if(!boss)return;
    const width=112;
    const left=Math.floor((WORLD_WIDTH-width)*.5);
    const label=String(boss.name??boss.kind??'BOSS').replaceAll('_',' ');
    drawPanel(left,3,width,13,.84);
    const labelWidth=pixelTextWidth(label,1,1);
    drawPixelText(context,label,left+Math.max(3,Math.floor((width-labelWidth)*.5)),5,'rgb(248,242,232)',1,1,width-6);
    const top=11;
    const fill=Math.max(0,Math.min(width-6,Math.round((width-6)*(boss.hp/Math.max(1,boss.maxHp)))));
    context.fillStyle=boss.barBack??'rgb(74,32,40)';
    context.fillRect(left+3,top,width-6,3);
    context.fillStyle=boss.barFill??'rgb(255,96,56)';
    context.fillRect(left+3,top,fill,3);
    context.fillStyle=boss.barHighlight??'rgb(255,214,164)';
    if(fill>0)context.fillRect(left+3,top,Math.max(1,fill-1),1);
    for(let marker=12;marker<width-7;marker+=12){
      context.fillStyle='rgba(12,12,18,.7)';
      context.fillRect(left+3+marker,top,1,3);
    }
    if((boss.hit??0)>0&&state.frame%4<2){
      context.fillStyle='rgba(255,255,255,.88)';
      context.fillRect(left+3,top,width-6,1);
    }
  }


  function drawMoonPortal(originX,originY){
    const portal=state.world.dimensionPortal??state.world.moonPortal;
    if(!portal?.active)return;
    const centerX=Math.round(portal.x-originX);
    const centerY=Math.round(portal.y-originY);
    if(centerX<-12||centerY<-14||centerX>WORLD_WIDTH+12||centerY>WORLD_HEIGHT+14)return;
    const opening=Math.min(1,(portal.timer??0)/10);
    const closing=portal.phase==='closing'||portal.phase==='arrival'?Math.max(0,1-(portal.timer??0)/(portal.phase==='arrival'?28:18)):1;
    const scale=Math.max(.15,opening*closing);
    const radiusX=Math.max(1,Math.round(5*scale));
    const radiusY=Math.max(2,Math.round(9*scale));
    const colors=portal.colors?.length?portal.colors:['rgb(91,229,255)','rgb(130,128,255)','rgb(207,92,255)','rgb(255,103,205)','rgb(244,238,255)'];
    context.fillStyle='rgba(20,9,45,.88)';
    context.fillRect(centerX-radiusX+1,centerY-radiusY+2,Math.max(1,radiusX*2-1),Math.max(2,radiusY*2-3));
    const phase=(state.frame+(portal.timer??0)*2)*.22;
    for(let step=0;step<30;step++){
      const angle=phase+step/30*Math.PI*2;
      const wobble=1+Math.sin(phase*1.7+step*.9)*.12;
      const x=centerX+Math.round(Math.cos(angle)*radiusX*wobble);
      const y=centerY+Math.round(Math.sin(angle)*radiusY);
      context.fillStyle=colors[(step+Math.floor(state.frame/3))%colors.length];
      context.fillRect(x,y,step%5===0?2:1,step%4===0?2:1);
    }
    context.fillStyle=state.frame%6<3?'rgba(215,235,255,.8)':'rgba(255,168,242,.72)';
    for(let i=0;i<5;i++){
      const y=centerY-radiusY+2+((i*4+state.frame)%Math.max(3,radiusY*2-3));
      const x=centerX+Math.round(Math.sin(state.frame*.16+i*1.9)*Math.max(1,radiusX-2));
      context.fillRect(x,y,1,1);
    }
    if(portal.phase==='transit'){
      context.fillStyle='rgba(255,255,255,.46)';
      context.fillRect(centerX-radiusX-2,centerY-1,radiusX*2+5,2);
    }
  }

  function furnitureSprite(entity){
    const definition=furnitureById(entity.furnitureId);
    if(!definition)return null;
    return entity.open&&definition.openSprite?definition.openSprite:definition.sprite;
  }

  function drawFurnitureEntity(entity,originX,originY,{ghost=false,xOverride=null,yOverride=null}={}){
    const definition=furnitureById(entity.furnitureId);
    const sprite=furnitureSprite(entity);
    if(!definition||!sprite)return;
    const useEntity={...entity,x:xOverride??entity.x,y:yOverride??entity.y};
    const bounds=furnitureBounds(useEntity,definition);
    if(!bounds)return;
    const left=bounds.left-originX;
    const top=bounds.top-originY;
    for(let row=0;row<sprite.length;row++){
      const line=sprite[row];
      for(let column=0;column<line.length;column++){
        const pixel=line[column];
        if(pixel===' ')continue;
        let color=FURNITURE_PIXEL_COLORS[pixel]??'rgb(220,220,220)';
        if(pixel==='l'&&entity.on===false)color='rgb(83,76,64)';
        if(ghost)color='rgba(205,238,246,.48)';
        context.fillStyle=color;
        context.fillRect(left+column,top+row,1,1);
      }
    }
    if(entity.furnitureId==='chest'&&(entity.storedTotal??0)>0){
      context.fillStyle='rgb(255,224,111)';
      context.fillRect(left+2,top+1,1,1);
    }
    if(entity.furnitureId==='planter'&&entity.cropId){
      const growth=Math.max(1,Math.min(4,Math.floor((entity.growth??0)/900)+1));
      context.fillStyle=(entity.growth??0)>=3600?'rgb(255,191,75)':'rgb(87,198,93)';
      for(let rise=0;rise<growth;rise++)context.fillRect(left+2,top-rise,1,1);
      if(growth>=3){ context.fillRect(left+1,top-growth+2,1,1); context.fillRect(left+3,top-growth+1,1,1); }
    }
    if(entity.furnitureId==='sign'){
      const label=SIGN_LABELS[entity.labelIndex??0]??'HOME';
      drawPixelText(context,label,left-Math.max(0,Math.floor((pixelTextWidth(label)-definition.w)*.5)),top-6,'rgb(238,225,180)',1,1,38);
    }
    if(entity.furnitureId==='clock'){
      const time=timeSystem.getTime();
      const cx=left+2,cy=top+2;
      context.fillStyle='rgb(43,55,69)';
      context.fillRect(cx,cy,1,1);
      const hourAngle=((time.hours%12)+time.minutes/60)/12*Math.PI*2-Math.PI*.5;
      const minuteAngle=time.minutes/60*Math.PI*2-Math.PI*.5;
      context.fillStyle='rgb(75,55,39)';
      context.fillRect(cx+Math.round(Math.cos(hourAngle)),cy+Math.round(Math.sin(hourAngle)),1,1);
      context.fillStyle='rgb(199,77,66)';
      context.fillRect(cx+Math.round(Math.cos(minuteAngle)*2),cy+Math.round(Math.sin(minuteAngle)*2),1,1);
    }
  }

  function drawFurnitureLights(originX,originY){
    for(const entity of furnitureSystem?.visibleFurniture?.(originX,originY)??[]){
      const definition=furnitureById(entity.furnitureId);
      if(!definition?.lightRadius||entity.on===false)continue;
      const x=Math.round(entity.x-originX);
      const y=Math.round(entity.y-Math.floor(definition.h*.65)-originY);
      const radius=definition.lightRadius;
      for(let ring=radius;ring>=4;ring-=4){
        const alpha=.012+(radius-ring)/radius*.012;
        context.fillStyle=`rgba(255,226,126,${alpha})`;
        context.fillRect(x-ring,y-Math.floor(ring*.65),ring*2+1,Math.floor(ring*1.3)+1);
      }
    }
  }

  function drawFurniture(originX,originY){
    for(const entity of furnitureSystem?.visibleFurniture?.(originX,originY)??[])drawFurnitureEntity(entity,originX,originY);
  }

  function drawPlayer(originX,originY){
    if(state.player.invulnerability>0&&state.frame%4<2)return;
    const bounds=playerPixelBounds(
      state.player.x-originX,
      state.player.y-originY,
      state.player.width,
      state.player.height,
    );
    const recoil=state.juice?.recoilFrames>0?(state.juice.recoilX??0):0;
    const x=bounds.centerX+recoil;
    const y=bounds.baselineY;
    const swimming=Boolean(state.player.status?.swimming);
    const seated=!swimming&&state.player.furnitureMode==='sit';
    const squashed=!swimming&&!seated&&(state.juice?.playerSquash??0)>0;
    const stretched=!swimming&&!squashed&&(state.juice?.playerStretch??0)>0;
    let visualWidth=seated?3:squashed?5:bounds.width;
    let visualHeight=seated?3:squashed?3:stretched?6:bounds.height;
    let visualLeft=x-Math.floor(visualWidth*.5);
    let visualTop=y-visualHeight+1;
    let swimFacing=state.player.facing??1;

    if(swimming){
      if(state.player.vx<-.04)swimFacing=-1;
      else if(state.player.vx>.04)swimFacing=1;
      const sprite=rotatedSwimSprite(swimFacing);
      visualHeight=sprite.length;
      visualWidth=sprite[0].length;
      visualLeft=x-Math.floor(visualWidth*.5);
      const bodyCenterY=bounds.top+Math.floor(bounds.height*.5);
      visualTop=bodyCenterY-Math.floor(visualHeight*.5);
      const colors={
        [PlayerPixel.SKIN]:'rgb(235,210,125)',
        [PlayerPixel.BODY]:'rgb(70,150,220)',
        [PlayerPixel.EYE]:'rgb(28,49,73)',
      };
      for(let py=0;py<sprite.length;py++){
        for(let px=0;px<sprite[py].length;px++){
          const pixel=sprite[py][px];
          if(!pixel)continue;
          context.fillStyle=colors[pixel];
          context.fillRect(visualLeft+px,visualTop+py,1,1);
        }
      }
      // A single trailing kick pixel animates the separated legs without
      // distorting the rotated torso or moving the swimmer out of alignment.
      const kickHigh=Math.floor(state.frame/5)%2===0;
      context.fillStyle='rgb(55,125,202)';
      const kickX=swimFacing>0?visualLeft-1:visualLeft+visualWidth;
      const kickY=visualTop+(kickHigh?0:visualHeight-1);
      context.fillRect(kickX,kickY,1,1);
    }else{
      const headHeight=(squashed||seated)?1:2;
      context.fillStyle='rgb(235,210,125)';
      context.fillRect(visualLeft,visualTop,visualWidth,headHeight);
      context.fillStyle='rgb(70,150,220)';
      context.fillRect(visualLeft,visualTop+headHeight,visualWidth,visualHeight-headHeight);
      if(seated){
        context.fillStyle='rgb(55,125,202)';
        context.fillRect(visualLeft+(state.player.facing>0?2:0),visualTop+2,2,1);
      }
    }
    if((state.juice?.recoilFrames??0)>0){
      context.fillStyle='rgba(184,225,255,.45)';
      context.fillRect(visualLeft-recoil,visualTop+1,1,Math.max(1,visualHeight-2));
    }

    if(state.build.active&&state.build.equippedFurnitureId){
      const facing=swimming?swimFacing:(state.input.pointerX>=x?1:-1);
      const heldX=x+facing*3;
      const heldY=swimming?visualTop+1:y-3;
      context.fillStyle='rgb(214,184,123)';
      context.fillRect(heldX-(facing<0?2:0),heldY,3,2);
      drawPixelBox(heldX-(facing<0?2:0),heldY,3,2,'rgba(245,248,255,.8)');
    }else if(state.build.active&&Number.isInteger(state.build.equippedMaterial)){
      const facing=swimming?swimFacing:(state.input.pointerX>=x?1:-1);
      const heldColor=palette.color(state.build.equippedMaterial,10,x,y);
      const heldX=swimming?x+facing*3-(facing<0?1:0):x+facing*2-(facing<0?1:0);
      const heldY=swimming?visualTop+1:y-3;
      context.fillStyle=`rgb(${Math.round(heldColor[0])},${Math.round(heldColor[1])},${Math.round(heldColor[2])})`;
      context.fillRect(heldX,heldY,2,2);
      drawPixelBox(heldX,heldY,2,2,'rgba(245,248,255,.8)');
    }else if(state.seedMode.active&&Number.isInteger(state.seedMode.cropId)){
      const facing=swimming?swimFacing:(state.input.pointerX>=x?1:-1);
      const heldColor=palette.cropColor(state.seedMode.cropId,'seed',8);
      const heldX=swimming?x+facing*3:x+facing*2;
      const heldY=swimming?visualTop+1:y-3;
      context.fillStyle=`rgb(${Math.round(heldColor[0])},${Math.round(heldColor[1])},${Math.round(heldColor[2])})`;
      context.fillRect(heldX,heldY,1,1);
      context.fillRect(heldX+facing,heldY+1,1,1);
    }
  }

  function drawDottedBeam(startX,startY,endX,endY,color){
    const dx=endX-startX;
    const dy=endY-startY;
    const distance=Math.hypot(dx,dy)||1;
    context.fillStyle=color;
    for(let step=1;step<distance;step+=2){
      const t=step/distance;
      context.fillRect(Math.round(startX+dx*t),Math.round(startY+dy*t),1,1);
    }
  }

  function drawRects(rects,color){
    context.fillStyle=color;
    for(const [x,y,width,height] of rects)context.fillRect(x,y,width,height);
  }

  function drawTargetCorners(x,y,color,size=5){
    drawRects(targetCornerRects(x,y,size),color);
  }

  function drawInvalidCross(x,y,color){
    drawRects(invalidCrossRects(x,y),color);
  }

  function drawPointerCursor(){
    if(!state.input.pointerInside)return;
    const color=state.build.active
      ?'rgba(180,248,255,.98)'
      :state.seedMode.active
        ?'rgba(210,242,150,.98)'
        :state.weaponId===WeaponId.DESTRUCULATOR
          ?'rgba(248,238,255,.98)'
          :state.weaponId===WeaponId.DRONE_STRIKE
            ?'rgba(255,246,220,.98)'
            :state.weaponId===WeaponId.LASER_RIFLE
              ?(state.laser.overheated?'rgba(255,104,92,.98)':'rgba(255,229,170,.98)')
              :state.weaponId===WeaponId.REALITY_ZIPPER
                ?(state.frame%6<3?'rgba(255,77,225,.98)':'rgba(67,244,255,.98)')
                :'rgba(238,244,255,.98)';
    drawRects(pointerCrosshairRects(state.input.pointerX,state.input.pointerY),color);
  }

  function drawDestruculator(originX,originY){
    if(!state.input.pointerInside)return;

    const preview=weapons.getDestruculatorPreview();
    const startX=state.player.x-originX;
    const startY=state.player.y-2-originY;
    const targetX=preview.beamX-originX;
    const targetY=preview.beamY-originY;
    const validColor='rgb(224,105,255)';
    const invalidColor='rgb(255,104,112)';
    const color=preview.valid?validColor:invalidColor;

    drawPixelCircle(startX,startY,preview.range,'rgba(224,105,255,.28)',1);

    drawDottedBeam(startX,startY,targetX,targetY,color);

    const cellX=preview.x-originX;
    const cellY=preview.y-originY;
    if(preview.valid){
      drawTargetCorners(cellX,cellY,color,7);
      context.fillStyle=color;
      if(state.frame%12<6)context.fillRect(Math.round(cellX),Math.round(cellY),1,1);
    }else{
      drawInvalidCross(cellX,cellY,color);
    }

    if(state.toolEffect.frames>0&&state.toolEffect.kind==='destroy'){
      const effectX=state.toolEffect.x-originX;
      const effectY=state.toolEffect.y-originY;
      drawTargetCorners(effectX,effectY,state.toolEffect.valid?'rgb(244,190,255)':invalidColor,9);
    }
  }

  function drawBuildPreview(originX,originY){
    if(!state.input.pointerInside||!state.build.active)return;

    const preview=weapons.getBuildPreview();
    const startX=state.player.x-originX;
    const startY=state.player.y-2-originY;
    const targetX=preview.beamX-originX;
    const targetY=preview.beamY-originY;
    if(preview.isFurniture&&preview.furnitureId){
      drawPixelCircle(startX,startY,preview.range,'rgba(89,225,245,.28)',1);
      drawDottedBeam(startX,startY,targetX,targetY,preview.valid?'rgb(117,232,191)':'rgb(255,104,112)');
      drawFurnitureEntity({furnitureId:preview.furnitureId,x:preview.x,y:preview.y,on:true,open:false},originX,originY,{ghost:true});
      const bounds=preview.bounds;
      if(bounds)drawPixelBox(bounds.left-originX,bounds.top-originY,bounds.w,bounds.h,preview.valid?'rgb(117,232,191)':'rgb(255,104,112)');
      if(!preview.valid)drawInvalidCross(targetX,targetY,'rgb(255,104,112)');
      return;
    }
    const validColor='rgb(89,225,245)';
    const invalidColor='rgb(255,104,112)';
    const color=preview.valid?validColor:invalidColor;

    drawPixelCircle(startX,startY,preview.range,'rgba(89,225,245,.28)',1);
    drawDottedBeam(startX,startY,targetX,targetY,color);

    const cellX=preview.x-originX;
    const cellY=preview.y-originY;
    if(preview.valid){
      const ghost=palette.color(preview.type,8,cellX,cellY);
      context.fillStyle=`rgba(${Math.round(ghost[0])},${Math.round(ghost[1])},${Math.round(ghost[2])},.76)`;
      context.fillRect(Math.round(cellX),Math.round(cellY),1,1);
      drawTargetCorners(cellX,cellY,color,7);
    }else{
      drawInvalidCross(cellX,cellY,color);
    }

    if(state.toolEffect.frames>0&&state.toolEffect.kind==='build'){
      const effectX=state.toolEffect.x-originX;
      const effectY=state.toolEffect.y-originY;
      drawTargetCorners(effectX,effectY,state.toolEffect.valid?'rgb(180,248,255)':invalidColor,9);
    }
  }

  function drawDroneStrikePreview(originX,originY){
    if(!state.input.pointerInside)return;
    const preview=weapons.getDroneStrikePreview();
    const targetX=preview.x-originX;
    const targetY=preview.y-originY;
    const pointerX=(preview.pointerX??preview.x)-originX;
    const pointerY=(preview.pointerY??preview.y)-originY;
    const validColor='rgb(255,178,58)';
    const invalidColor='rgb(255,104,112)';
    const color=preview.valid?validColor:invalidColor;

    if(preview.snapped){
      drawDottedBeam(pointerX,pointerY,targetX,targetY,'rgba(255,214,128,.72)');
    }

    if(preview.valid){
      const entryX=preview.entryX-originX;
      const entryY=preview.entryY-originY;
      drawDottedBeam(entryX,entryY,targetX,entryY,'rgba(132,225,242,.9)');
      drawDottedBeam(targetX,entryY,targetX,targetY,color);

      context.fillStyle='rgb(132,225,242)';
      context.fillRect(Math.round(entryX)-2,Math.round(entryY)-1,5,3);
      context.fillRect(Math.round(entryX)+(preview.flightDirection>0?3:-3),Math.round(entryY),2,1);

      drawPixelCircle(targetX,targetY,15,'rgba(255,178,58,.75)',1);
      drawTargetCorners(targetX,targetY,color,11);
      context.fillStyle=color;
      context.fillRect(Math.round(targetX),Math.round(targetY),1,1);
    }else{
      drawInvalidCross(pointerX,pointerY,color);
      drawPixelCircle(pointerX,pointerY,7,'rgba(255,104,112,.45)',1);
    }
  }

  function drawLaserHeatedPixels(originX,originY){
    for(const pixel of state.laser?.hotPixels??[]){
      const x=Math.round(pixel.x-originX);
      const y=Math.round(pixel.y-originY);
      if(x<0||y<0||x>=WORLD_WIDTH||y>=WORLD_HEIGHT)continue;
      const ratio=Math.max(0,Math.min(1,pixel.heat/112));
      context.fillStyle=ratio>.72?'rgba(255,246,210,.9)':ratio>.34?'rgba(255,142,46,.72)':'rgba(215,57,31,.48)';
      context.fillRect(x,y,1,1);
    }
  }

  function drawLaserRifle(originX,originY){
    const beam=state.laser?.beam;
    if(!state.laser?.active||!beam)return;
    const startX=Math.round(beam.startX-originX);
    const startY=Math.round(beam.startY-originY);
    const endX=Math.round(beam.endX-originX);
    const endY=Math.round(beam.endY-originY);
    drawPixelLine(startX,startY,endX,endY,'rgb(141,26,34)',3);
    drawPixelLine(startX,startY,endX,endY,'rgb(255,82,46)',2);
    drawPixelLine(startX,startY,endX,endY,state.frame%4<2?'rgb(255,250,214)':'rgb(255,208,105)',1);

    const heat=Math.max(0,Math.min(1,(state.laser.contactHeat??0)/112));
    context.fillStyle=heat>.7?'rgb(255,250,224)':heat>.35?'rgb(255,178,62)':'rgb(255,92,42)';
    context.fillRect(endX-1,endY-1,3,3);
    context.fillStyle='rgb(255,248,220)';
    context.fillRect(endX,endY,1,1);
    if(state.frame%3===0){
      context.fillStyle='rgb(255,113,36)';
      context.fillRect(endX-2,endY,1,1);
      context.fillRect(endX+2,endY-1,1,1);
    }
  }


  function drawRealityRifts(originX,originY){
    for(const rift of state.entities.realityRifts??[]){
      const startX=Math.round(rift.startX-originX);
      const startY=Math.round(rift.startY-originY);
      const endX=Math.round(rift.endX-originX);
      const endY=Math.round(rift.endY-originY);
      if(Math.max(startX,endX)<-16||Math.min(startX,endX)>WORLD_WIDTH+16||Math.max(startY,endY)<-16||Math.min(startY,endY)>WORLD_HEIGHT+16)continue;

      const opening=Math.min(1,(rift.age??0)/Math.max(1,REALITY_ZIPPER_CONFIG.openingFrames));
      const closing=rift.phase==='closing'?Math.max(0,(rift.life??0)/Math.max(1,REALITY_ZIPPER_CONFIG.closingFrames)):1;
      const strength=Math.max(.08,opening*closing);
      const wave=Math.sin((rift.pulse??0)+state.frame*.16);
      const spread=Math.max(1,Math.round((REALITY_ZIPPER_CONFIG.splitDistance+1)*strength));
      const normalX=rift.normalX??0;
      const normalY=rift.normalY??1;

      for(let band=-spread;band<=spread;band++){
        if(band===0)continue;
        const wobble=Math.round(Math.sin(state.frame*.21+band*1.7+(rift.age??0)*.09));
        const offset=band+wobble*(Math.abs(band)===spread?1:0);
        const colorIndex=(band+Math.floor(state.frame/3)+(rift.age??0)+REALITY_COLORS.length*4)%REALITY_COLORS.length;
        drawPixelLine(
          startX+normalX*offset,
          startY+normalY*offset,
          endX+normalX*offset,
          endY+normalY*offset,
          REALITY_COLORS[colorIndex],
          Math.abs(band)===1&&state.frame%4<2?2:1,
        );
      }

      drawPixelLine(startX,startY,endX,endY,'rgb(8,3,20)',3);
      drawPixelLine(startX,startY,endX,endY,state.frame%4<2?'rgb(255,255,255)':'rgb(36,10,68)',1);

      const points=rift.points??[];
      const step=Math.max(3,Math.floor(points.length/18));
      for(let index=0;index<points.length;index+=step){
        const point=points[index];
        const localX=Math.round(point.x-originX);
        const localY=Math.round(point.y-originY);
        const oscillation=Math.round(Math.sin(index*.8+state.frame*.28+wave)*2);
        const side=index%2===0?1:-1;
        const ghostX=localX+normalX*(spread+2+oscillation)*side;
        const ghostY=localY+normalY*(spread+2+oscillation)*side;
        context.fillStyle=REALITY_COLORS[(index+Math.floor(state.frame/2))%REALITY_COLORS.length];
        context.fillRect(ghostX-1,ghostY-1,index%3===0?3:2,index%4===0?2:1);
        if(index%4===0){
          context.fillStyle='rgb(255,255,255)';
          context.fillRect(ghostX,ghostY,1,1);
        }
      }

      for(const [x,y] of [[startX,startY],[endX,endY]]){
        const size=3+Math.round(Math.abs(wave)*2);
        for(let ring=0;ring<3;ring++){
          context.fillStyle=REALITY_COLORS[(ring+Math.floor(state.frame/4))%REALITY_COLORS.length];
          context.fillRect(x-size+ring,y-ring,Math.max(1,(size-ring)*2+1),1);
          context.fillRect(x-ring,y-size+ring,1,Math.max(1,(size-ring)*2+1));
        }
        context.fillStyle='rgb(5,1,14)';
        context.fillRect(x-1,y-1,3,3);
        context.fillStyle='rgb(255,255,255)';
        context.fillRect(x,y,1,1);
      }
    }
  }

  function drawWeaponEffects(originX,originY){
    drawRealityRifts(originX,originY);
    drawLaserHeatedPixels(originX,originY);
    if(state.swordTimer>0){
      const angle=state.swordAngle-.9+(1-state.swordTimer/12)*1.8;
      drawPixelLine(
        state.player.x-originX,
        state.player.y-3-originY,
        state.player.x+Math.cos(angle)*8-originX,
        state.player.y-3+Math.sin(angle)*8-originY,
        'rgb(235,240,250)',
        2,
      );
    }

    if(state.build.active)drawBuildPreview(originX,originY);
    else if(state.weaponId===WeaponId.DESTRUCULATOR)drawDestruculator(originX,originY);
    else if(state.weaponId===WeaponId.DRONE_STRIKE)drawDroneStrikePreview(originX,originY);
    else if(state.weaponId===WeaponId.LASER_RIFLE)drawLaserRifle(originX,originY);
  }

  function drawMagnifier(){
    if(!state.input.pointerInside||state.magnifier.zoom<=MAGNIFIER_CONFIG.minZoom)return;

    const radius=Math.max(2,Math.round(state.magnifier.radius));
    const centerX=Math.round(state.input.pointerX);
    const centerY=Math.round(state.input.pointerY);
    const frame=context.getImageData(0,0,WORLD_WIDTH,WORLD_HEIGHT);
    const source=new Uint8ClampedArray(frame.data);
    const outerSquared=radius*radius;
    const whiteRingSquared=(radius-1)*(radius-1);
    const imageSquared=(radius-2)*(radius-2);

    function writePixel(x,y,r,g,b,a=255){
      if(x<0||y<0||x>=WORLD_WIDTH||y>=WORLD_HEIGHT)return;
      const offset=(x+y*WORLD_WIDTH)*4;
      frame.data[offset]=r;
      frame.data[offset+1]=g;
      frame.data[offset+2]=b;
      frame.data[offset+3]=a;
    }

    for(let dy=-radius;dy<=radius;dy++){
      for(let dx=-radius;dx<=radius;dx++){
        const distanceSquared=dx*dx+dy*dy;
        if(distanceSquared>outerSquared)continue;
        const destinationX=centerX+dx;
        const destinationY=centerY+dy;

        if(distanceSquared>whiteRingSquared){
          writePixel(destinationX,destinationY,15,18,26);
          continue;
        }
        if(distanceSquared>imageSquared){
          writePixel(destinationX,destinationY,245,248,255);
          continue;
        }

        const sourceX=Math.max(0,Math.min(WORLD_WIDTH-1,Math.round(state.input.pointerX+dx/state.magnifier.zoom)));
        const sourceY=Math.max(0,Math.min(WORLD_HEIGHT-1,Math.round(state.input.pointerY+dy/state.magnifier.zoom)));
        const sourceOffset=(sourceX+sourceY*WORLD_WIDTH)*4;
        writePixel(
          destinationX,
          destinationY,
          source[sourceOffset],
          source[sourceOffset+1],
          source[sourceOffset+2],
          source[sourceOffset+3],
        );
      }
    }

    context.putImageData(frame,0,0);
  }

  function drawPanel(x,y,width,height,alpha=.78){
    context.fillStyle=`rgba(9,12,18,${alpha})`;
    context.fillRect(Math.round(x),Math.round(y),Math.round(width),Math.round(height));
    context.fillStyle='rgba(225,235,248,.34)';
    context.fillRect(Math.round(x),Math.round(y),Math.round(width),1);
    context.fillRect(Math.round(x),Math.round(y),1,Math.round(height));
    context.fillStyle='rgba(0,0,0,.5)';
    context.fillRect(Math.round(x),Math.round(y+height-1),Math.round(width),1);
    context.fillRect(Math.round(x+width-1),Math.round(y),1,Math.round(height));
  }

  function drawSegmentedBar(x,y,width,height,value,maxValue,colors,critical=false){
    const safeWidth=Math.max(1,Math.round(width));
    const safeHeight=Math.max(1,Math.round(height));
    const ratio=Math.max(0,Math.min(1,value/Math.max(1,maxValue)));
    const fill=Math.round((safeWidth-2)*ratio);
    context.fillStyle='rgb(12,15,20)';
    context.fillRect(x,y,safeWidth,safeHeight);
    context.fillStyle='rgb(48,52,62)';
    context.fillRect(x+1,y+1,safeWidth-2,safeHeight-2);
    if(fill>0){
      context.fillStyle=critical&&state.frame%12<6?colors[2]:colors[0];
      context.fillRect(x+1,y+1,fill,safeHeight-2);
      if(safeHeight>=4){
        context.fillStyle=colors[1];
        context.fillRect(x+1,y+1,Math.max(1,fill-1),1);
      }
    }
    for(let marker=5;marker<safeWidth-2;marker+=5){
      context.fillStyle='rgba(8,10,14,.55)';
      context.fillRect(x+1+marker,y+1,1,safeHeight-2);
    }
  }

  function drawHeartIcon(x,y,color){
    context.fillStyle=color;
    context.fillRect(x+1,y,2,1); context.fillRect(x+4,y,2,1);
    context.fillRect(x,y+1,7,2); context.fillRect(x+1,y+3,5,1);
    context.fillRect(x+2,y+4,3,1); context.fillRect(x+3,y+5,1,1);
  }

  function drawFoodIcon(x,y,color){
    context.fillStyle=color;
    context.fillRect(x+1,y+1,5,4);
    context.fillRect(x+2,y,3,1);
    context.fillRect(x+2,y+5,3,1);
    context.fillStyle='rgb(93,58,34)';
    context.fillRect(x+5,y,1,2);
    context.fillStyle='rgb(76,156,72)';
    context.fillRect(x+4,y,1,1);
  }

  function drawBreathIcon(x,y,color){
    context.fillStyle=color;
    context.fillRect(x+2,y,3,1);
    context.fillRect(x+1,y+1,5,1);
    context.fillRect(x,y+2,7,2);
    context.fillRect(x+1,y+4,5,1);
    context.fillRect(x+2,y+5,3,1);
    context.fillStyle='rgb(232,250,255)';
    context.fillRect(x+2,y+1,1,1);
    context.fillRect(x+4,y+2,1,1);
  }

  function drawCrystalIcon(x,y){
    context.fillStyle='rgb(128,104,231)';
    context.fillRect(x+2,y,2,1); context.fillRect(x+1,y+1,4,1);
    context.fillRect(x,y+2,6,2); context.fillRect(x+1,y+4,4,1);
    context.fillRect(x+2,y+5,2,1);
    context.fillStyle='rgb(226,219,255)';
    context.fillRect(x+2,y+1,1,2);
  }

  function drawPackIcon(x,y,color='rgb(220,230,240)'){
    context.fillStyle=color;
    context.fillRect(x+1,y+2,7,5);
    context.fillRect(x+2,y+1,5,1);
    context.fillRect(x+3,y,3,1);
    context.fillStyle='rgb(76,91,112)';
    context.fillRect(x+3,y+4,3,2);
  }

  function drawWeatherIcon(x,y,type,isDay){
    const pale='rgb(226,235,245)';
    const blue='rgb(112,184,229)';
    const yellow='rgb(255,219,96)';
    if(type===WeatherType.CLEAR||type===WeatherType.BREEZE){
      context.fillStyle=isDay?yellow:pale;
      context.fillRect(x+2,y+1,3,3);
      context.fillRect(x+3,y,1,5);
      context.fillRect(x+1,y+2,5,1);
      if(type===WeatherType.BREEZE){
        context.fillStyle=pale;
        context.fillRect(x+7,y+1,5,1); context.fillRect(x+9,y+3,4,1);
      }
      return;
    }
    context.fillStyle='rgb(135,150,166)';
    context.fillRect(x+1,y+1,7,3); context.fillRect(x+3,y,3,1);
    if([WeatherType.RAIN,WeatherType.THUNDERSTORM,WeatherType.OCEAN_STORM].includes(type)){
      context.fillStyle=blue;
      context.fillRect(x+2,y+5,1,2); context.fillRect(x+5,y+4,1,2); context.fillRect(x+8,y+5,1,2);
      if(type!==WeatherType.RAIN){
        context.fillStyle=yellow;
        context.fillRect(x+6,y+3,2,1); context.fillRect(x+5,y+4,2,1); context.fillRect(x+6,y+5,1,2);
      }
    }else if(type===WeatherType.SNOW||type===WeatherType.BLIZZARD){
      context.fillStyle=pale;
      context.fillRect(x+2,y+5,1,1); context.fillRect(x+5,y+4,1,1); context.fillRect(x+8,y+6,1,1);
    }else if(type===WeatherType.HEATWAVE){
      context.fillStyle='rgb(255,142,58)';
      context.fillRect(x+2,y+4,1,3); context.fillRect(x+5,y+4,1,3); context.fillRect(x+8,y+4,1,3);
    }else{
      context.fillStyle=pale;
      context.fillRect(x+1,y+5,8,1); context.fillRect(x+3,y+6,6,1);
    }
  }

  function drawWeaponIcon(x,y,weaponId){
    context.fillStyle='rgb(220,230,240)';
    switch(weaponId){
      case WeaponId.GUN:
        context.fillRect(x,y+2,8,2); context.fillRect(x+2,y+4,2,2); break;
      case WeaponId.NAPALM_SPRAYER:
        context.fillRect(x,y+2,7,2); context.fillRect(x+1,y+4,3,2);
        context.fillStyle='rgb(255,145,42)'; context.fillRect(x+7,y+1,2,3); break;
      case WeaponId.GLAIVE:
        context.fillRect(x+3,y,2,8); context.fillRect(x,y+3,8,2);
        context.fillStyle='rgb(112,205,232)'; context.fillRect(x+1,y+1,1,1); context.fillRect(x+6,y+6,1,1); break;
      case WeaponId.HOOK:
        drawPixelLine(x,y+6,x+6,y,'rgb(190,198,210)'); context.fillRect(x+5,y,3,2); break;
      case WeaponId.SWORD:
        drawPixelLine(x+1,y+6,x+7,y,'rgb(235,240,250)',2); context.fillRect(x,y+6,4,1); break;
      case WeaponId.GRENADE:
        context.fillRect(x+2,y+2,5,5); context.fillStyle='rgb(255,176,55)'; context.fillRect(x+6,y,1,2); break;
      case WeaponId.DESTRUCULATOR:
        context.fillRect(x,y+3,8,2); context.fillStyle='rgb(224,105,255)'; context.fillRect(x+7,y+2,2,4); break;
      case WeaponId.DRONE_STRIKE:
        context.fillRect(x,y+2,9,3); context.fillRect(x+2,y,2,2); context.fillRect(x+5,y,2,2); break;
      case WeaponId.LASER_RIFLE:
        context.fillRect(x,y+2,8,2); context.fillRect(x+1,y+4,3,2);
        context.fillStyle=state.laser.overheated?'rgb(255,74,58)':'rgb(255,220,124)'; context.fillRect(x+7,y+1,2,4); break;
      case WeaponId.NYAN_CAT_LAUNCHER:
        context.fillStyle='rgb(126,127,145)'; context.fillRect(x+4,y+1,4,4);
        context.fillStyle='rgb(237,181,114)'; context.fillRect(x+1,y+2,4,3);
        context.fillStyle='rgb(255,64,72)'; context.fillRect(x,y+6,2,1);
        context.fillStyle='rgb(62,151,238)'; context.fillRect(x+2,y+6,2,1); break;
      case WeaponId.REALITY_ZIPPER:
        context.fillStyle='rgb(255,45,196)'; context.fillRect(x+1,y,2,2); context.fillRect(x+6,y+5,2,2);
        context.fillStyle='rgb(82,250,244)'; context.fillRect(x+3,y+2,2,4);
        context.fillStyle='rgb(255,238,72)'; context.fillRect(x+5,y+1,1,2); context.fillRect(x+1,y+5,2,1);
        context.fillStyle='rgb(8,3,20)'; context.fillRect(x+4,y+3,1,1); break;
      default:context.fillRect(x+2,y+2,4,4);
    }
  }

  function drawSaveIcon(x,y,color='rgb(220,230,240)'){
    context.fillStyle=color;
    context.fillRect(x+1,y,8,8);
    context.fillStyle='rgb(74,88,108)';
    context.fillRect(x+3,y+1,4,2);
    context.fillStyle='rgb(166,205,224)';
    context.fillRect(x+2,y+5,6,2);
    context.fillStyle='rgb(230,239,246)';
    context.fillRect(x+4,y+5,2,2);
  }

  function drawWorldIcon(x,y,color='rgb(220,230,240)'){
    context.fillStyle=color;
    context.fillRect(x+2,y,5,1);
    context.fillRect(x+1,y+1,7,1);
    context.fillRect(x,y+2,9,5);
    context.fillRect(x+1,y+7,7,1);
    context.fillRect(x+2,y+8,5,1);
    context.fillStyle='rgb(70,126,166)';
    context.fillRect(x+2,y+2,2,2);
    context.fillRect(x+5,y+4,3,2);
    context.fillRect(x+2,y+6,2,1);
  }

  function drawStatusIcons(){
    const statuses=[];
    const bunnyChain=state.player.bunnyHop?.chain??0;
    if(bunnyChain>=2){
      const hot=bunnyChain>=8;
      statuses.push([`BHOP X${bunnyChain}`,hot?'rgb(255,126,232)':'rgb(119,226,255)']);
    }
    if(state.player.status.lava)statuses.push(['LAVA','rgb(255,96,34)']);
    else if(state.player.status.fire)statuses.push(['FIRE','rgb(255,150,44)']);
    if(state.player.status.steam)statuses.push(['STEAM','rgb(194,226,238)']);
    if(state.player.status.noOxygen)statuses.push(['NO AIR','rgb(129,216,246)']);
    else if(state.player.status.headSubmerged)statuses.push(['DIVE','rgb(129,216,246)']);
    if((state.player.attachedParasites?.length??0)>0)statuses.push([`PARASITE X${state.player.attachedParasites.length}`,'rgb(255,91,194)']);
    if(Number.isInteger(state.player.stolenWeaponId))statuses.push(['WEAPON STOLEN','rgb(255,184,72)']);
    if((state.entities.invasionPortals?.length??0)>0)statuses.push(['RIFT RAID','rgb(191,112,255)']);
    if(state.player.status.starving)statuses.push(['STARVE','rgb(255,205,78)']);
    if(state.ui.hud?.lowHunger&&!state.player.status.starving)statuses.push(['HUNGRY','rgb(255,205,78)']);
    let x=3;
    const y=WORLD_HEIGHT-36;
    for(const [label,color] of statuses.slice(0,4)){
      const width=Math.min(42,pixelTextWidth(label)+4);
      drawPanel(x,y,width,7,.76);
      drawPixelText(context,label,x+2,y+1,color,1,1,width-4);
      x+=width+2;
    }
  }

  function drawDamageFeedback(){
    if(state.ui.damageFlash<=0)return;
    const bright=state.ui.damageFlash%4<2?'rgba(255,54,54,.8)':'rgba(148,24,32,.6)';
    context.fillStyle=bright;
    context.fillRect(0,0,WORLD_WIDTH,2); context.fillRect(0,WORLD_HEIGHT-2,WORLD_WIDTH,2);
    context.fillRect(0,0,2,WORLD_HEIGHT); context.fillRect(WORLD_WIDTH-2,0,2,WORLD_HEIGHT);
    const direction=state.ui.damageDirection;
    if(direction!==0){
      const x=direction<0?5:WORLD_WIDTH-6;
      const y=Math.floor(WORLD_HEIGHT*.5);
      context.fillRect(x,y-2,2,5);
      context.fillRect(x+(direction<0?-2:2),y-1,2,3);
    }
  }

  function drawBossRitual(){
    const ritual=state.ui.bossRitual;
    if(!ritual||state.entities.bosses.length>0||state.ui.message||state.ui.inventoryOpen||state.ui.craftingOpen||state.ui.worldMenuOpen||state.paused)return;
    const width=180;
    const x=3;
    const y=state.ui.hud?.breathUsing?36:27;
    drawPanel(x,y,width,18,.82);
    drawPixelText(context,ritual.title??'BOSS RITUAL',x+4,y+2,'rgb(244,219,142)',1,1,width-8);
    drawPixelText(context,ritual.hint??'',x+4,y+8,'rgb(199,214,228)',1,1,width-8);
    const ratio=Math.max(0,Math.min(1,(ritual.progress??0)/Math.max(1,ritual.maxProgress??1)));
    context.fillStyle='rgb(40,47,58)';
    context.fillRect(x+4,y+14,width-8,2);
    context.fillStyle=ratio>=1?'rgb(255,223,118)':'rgb(122,190,218)';
    context.fillRect(x+4,y+14,Math.round((width-8)*ratio),2);
  }

  function drawSaveStatus(){
    const text=state.ui.saveStatus;
    if(!text)return;
    const width=Math.min(94,pixelTextWidth(text)+6);
    const x=WORLD_WIDTH-width-3;
    const y=29;
    drawPanel(x,y,width,8,.88);
    drawPixelText(context,text,x+3,y+2,'rgb(178,235,193)',1,1,width-6);
  }

  function drawPickupFeed(){
    let y=41;
    for(const item of state.ui.pickupFeed){
      const width=Math.min(92,pixelTextWidth(item.text)+4);
      const x=WORLD_WIDTH-width-3;
      drawPanel(x,y,width,7,.65);
      drawPixelText(context,item.text,x+2,y+1,'rgb(218,235,207)',1,1,width-4);
      y+=8;
    }
  }

  function drawMessage(){
    if(!state.ui.message)return;
    const text=state.ui.message.replaceAll('·','-');
    const width=Math.min(150,Math.max(42,pixelTextWidth(text)+6));
    const x=Math.floor((WORLD_WIDTH-width)*.5);
    const y=29;
    drawPanel(x,y,width,9,.88);
    drawPixelText(context,text,x+3,y+2,'rgb(244,246,250)',1,1,width-6);
  }

  function drawToolPrompt(){
    if(state.ui.inventoryOpen||state.ui.craftingOpen||state.ui.worldMenuOpen||state.paused)return;
    const text=state.ui.toolStatus||'Q WEAPON  I PACK  K CRAFT  F USE  O WORLDS';
    const width=Math.min(240,pixelTextWidth(text)+6);
    const x=Math.floor((WORLD_WIDTH-width)*.5);
    const y=WORLD_HEIGHT-27;
    drawPanel(x,y,width,7,.7);
    drawPixelText(context,text,x+3,y+1,'rgb(210,224,240)',1,1,width-6);
  }

  function drawOffscreenBossIndicator(originX,originY){
    const boss=state.entities.bosses[0];
    if(!boss)return;
    const localX=boss.x-originX;
    const localY=boss.y-originY;
    if(localX>=0&&localX<WORLD_WIDTH&&localY>=0&&localY<WORLD_HEIGHT)return;
    const x=Math.max(5,Math.min(WORLD_WIDTH-6,Math.round(localX)));
    const y=Math.max(30,Math.min(WORLD_HEIGHT-30,Math.round(localY)));
    context.fillStyle=boss.barHighlight??'rgb(255,214,164)';
    if(localX<0){ context.fillRect(x,y,4,3); context.fillRect(x-2,y+1,2,1); }
    else if(localX>=WORLD_WIDTH){ context.fillRect(x-3,y,4,3); context.fillRect(x+1,y+1,2,1); }
    else if(localY<0){ context.fillRect(x,y,3,4); context.fillRect(x+1,y-2,1,2); }
    else { context.fillRect(x,y-3,3,4); context.fillRect(x+1,y+1,1,2); }
  }

  function drawTopButtons(){
    const buttonW=18;
    const buttonH=10;
    const firstX=WORLD_WIDTH-41;
    const secondX=WORLD_WIDTH-21;
    const topY=3;
    const bottomY=15;
    const buttons=[
      {kind:'save-current',x:firstX,y:topY,w:buttonW,h:buttonH},
      {kind:'world-toggle',x:secondX,y:topY,w:buttonW,h:buttonH},
      {kind:'inventory-toggle',x:firstX,y:bottomY,w:buttonW,h:buttonH},
      {kind:'pause-toggle',x:secondX,y:bottomY,w:buttonW,h:buttonH},
      {kind:'crafting-toggle',x:secondX,y:27,w:buttonW,h:buttonH},
    ];
    state.ui.inventoryRects.push(...buttons);
    for(const button of buttons)drawPanel(button.x,button.y,button.w,button.h,.84);
    drawSaveIcon(firstX+4,topY+1,state.save.dirty?'rgb(255,221,126)':'rgb(194,231,205)');
    drawWorldIcon(secondX+4,topY+1);
    drawPackIcon(firstX+4,bottomY+1);
    context.fillStyle='rgb(226,190,104)';
    context.fillRect(secondX+5,29,7,2);
    context.fillRect(secondX+8,31,2,4);
    context.fillRect(secondX+6,34,6,1);
    const count=state.ui.hud?.inventoryCount??0;
    drawPixelText(context,String(Math.min(99,count)),firstX+13-(count>9?3:0),bottomY+3,'rgb(244,228,157)',1,0,4);
    context.fillStyle='rgb(220,230,240)';
    if(state.paused){
      context.fillRect(secondX+5,bottomY+2,2,6);
      context.fillRect(secondX+8,bottomY+3,2,4);
      context.fillRect(secondX+11,bottomY+4,1,2);
    }else{
      context.fillRect(secondX+5,bottomY+2,2,6);
      context.fillRect(secondX+10,bottomY+2,2,6);
    }
  }

  function drawInventoryOverlay(){
    if(!state.ui.inventoryOpen)return;
    context.fillStyle='rgba(4,7,12,.58)';
    context.fillRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);
    const x=45,y=22,w=WORLD_WIDTH-90,h=WORLD_HEIGHT-44;
    drawPanel(x,y,w,h,.96);
    drawPixelText(context,'PACK',x+7,y+5,'rgb(238,242,250)',1,1);
    drawPixelText(context,'UP/DOWN ENTER USE  K CRAFT  I CLOSE',x+40,y+5,'rgb(151,174,201)',1,1,w-58);
    const close={kind:'inventory-close',x:x+w-12,y:y+3,w:9,h:9};
    state.ui.inventoryRects.push(close);
    drawPixelText(context,'X',close.x+2,close.y+1,'rgb(255,126,126)',1,1);

    const items=state.ui.hud?.inventory??[];
    if(items.length===0){
      drawPixelText(context,'EMPTY - COLLECT BLOCKS, FOOD, SEEDS OR LOOT',x+10,y+28,'rgb(167,178,194)',1,1,w-20);
      return;
    }

    const visibleRows=Math.max(8,Math.floor((h-30)/8));
    const selected=Math.max(0,Math.min(items.length-1,state.ui.inventoryIndex));
    const start=Math.max(0,Math.min(items.length-visibleRows,selected-Math.floor(visibleRows/2)));
    for(let row=0;row<visibleRows;row++){
      const index=start+row;
      if(index>=items.length)break;
      const item=items[index];
      const rowY=y+16+row*8;
      const rect={kind:'inventory-item',index,x:x+7,y:rowY,w:w-14,h:7};
      state.ui.inventoryRects.push(rect);
      if(index===selected){
        context.fillStyle='rgba(78,139,169,.7)';
        context.fillRect(rect.x,rect.y,rect.w,rect.h);
        context.fillStyle='rgb(174,235,247)';
        context.fillRect(rect.x,rect.y,2,rect.h);
      }else if(item.selected){
        context.fillStyle='rgba(68,111,88,.55)';
        context.fillRect(rect.x,rect.y,rect.w,rect.h);
      }
      const name=String(item.name??item.kind).replaceAll('_',' ');
      drawPixelText(context,name,rect.x+4,rect.y+1,index===selected?'rgb(246,250,255)':'rgb(196,207,221)',1,1,w-92);
      const countText=`X${item.count}`;
      drawPixelText(context,countText,rect.x+w-76,rect.y+1,'rgb(245,218,139)',1,1,26);
      drawPixelText(context,item.action??'',rect.x+w-47,rect.y+1,'rgb(145,171,194)',1,1,40);
    }

    const item=items[selected];
    const footer=item?`${item.kind.toUpperCase()}  ${item.action??''}`:'EMPTY';
    drawPixelText(context,footer,x+9,y+h-9,'rgb(151,174,201)',1,1,w-18);
  }

  function drawCraftingOverlay(){
    if(!state.ui.craftingOpen)return;
    context.fillStyle='rgba(4,7,12,.64)';
    context.fillRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);
    const x=35,y=14,w=WORLD_WIDTH-70,h=WORLD_HEIGHT-28;
    drawPanel(x,y,w,h,.97);
    drawPixelText(context,'BASE FURNITURE',x+7,y+5,'rgb(244,239,221)',1,1);
    drawPixelText(context,'UP/DOWN ENTER CRAFT  K CLOSE',x+91,y+5,'rgb(151,174,201)',1,1,w-108);
    const close={kind:'crafting-close',x:x+w-12,y:y+3,w:9,h:9};
    state.ui.inventoryRects.push(close);
    drawPixelText(context,'X',close.x+2,close.y+1,'rgb(255,126,126)',1,1);
    const items=state.ui.hud?.crafting??[];
    const selected=Math.max(0,Math.min(items.length-1,state.ui.craftingIndex??0));
    const visibleRows=18;
    const start=Math.max(0,Math.min(Math.max(0,items.length-visibleRows),selected-Math.floor(visibleRows*.5)));
    for(let row=0;row<Math.min(visibleRows,items.length);row++){
      const index=start+row;
      const item=items[index];
      const rect={kind:'crafting-item',index,x:x+7,y:y+16+row*8,w:w-14,h:7};
      state.ui.inventoryRects.push(rect);
      if(index===selected){ context.fillStyle='rgba(92,151,183,.34)'; context.fillRect(rect.x,rect.y,rect.w,rect.h); }
      drawPixelText(context,item.name.toUpperCase(),rect.x+3,rect.y+1,item.affordable?'rgb(236,242,230)':'rgb(150,153,158)',1,1,82);
      drawPixelText(context,item.recipe.toUpperCase(),rect.x+88,rect.y+1,item.affordable?'rgb(224,196,116)':'rgb(128,118,103)',1,1,w-150);
      drawPixelText(context,`OWN ${item.owned}`,rect.x+w-49,rect.y+1,'rgb(151,190,212)',1,1,42);
    }
    const item=items[selected];
    drawPixelText(context,item?`${item.category.toUpperCase()}  ${item.affordable?'READY':'MISSING MATERIALS'}`:'NO RECIPES',x+9,y+h-9,item?.affordable?'rgb(143,224,169)':'rgb(221,133,126)',1,1,w-18);
  }

  function formatSlotTime(timestamp){
    if(!timestamp)return'';
    const date=new Date(timestamp);
    if(!Number.isFinite(date.getTime()))return'';
    return `${date.getMonth()+1}/${date.getDate()} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
  }

  function drawWorldMenuOverlay(){
    if(!state.ui.worldMenuOpen)return;
    context.fillStyle='rgba(4,7,12,.7)';
    context.fillRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);
    const x=32,y=17,w=WORLD_WIDTH-64,h=WORLD_HEIGHT-34;
    drawPanel(x,y,w,h,.97);
    drawPixelText(context,'WORLD SLOTS',x+8,y+5,'rgb(238,242,250)',1,1);
    drawPixelText(context,'F5 SAVE  F9 LOAD  O CLOSE',x+91,y+5,'rgb(151,174,201)',1,1,w-118);
    const close={kind:'world-close',x:x+w-12,y:y+3,w:9,h:9};
    state.ui.inventoryRects.push(close);
    drawPixelText(context,'X',close.x+2,close.y+1,'rgb(255,126,126)',1,1);

    const slots=state.ui.saveSlots.length?state.ui.saveSlots:[1,2,3].map(slot=>({slot,empty:true}));
    const rowH=47;
    for(let index=0;index<3;index++){
      const slot=slots[index]??{slot:index+1,empty:true};
      const rowY=y+17+index*rowH;
      const selected=index===state.ui.worldSlotIndex;
      const rowRect={kind:'world-slot',slot:index+1,x:x+7,y:rowY,w:w-14,h:rowH-4};
      state.ui.inventoryRects.push(rowRect);
      context.fillStyle=selected?'rgba(70,126,166,.36)':'rgba(255,255,255,.035)';
      context.fillRect(rowRect.x,rowRect.y,rowRect.w,rowRect.h);
      if(selected){
        context.fillStyle='rgb(141,211,236)';
        context.fillRect(rowRect.x,rowRect.y,2,rowRect.h);
      }
      const active=state.save.activeSlot===index+1;
      drawPixelText(context,`SLOT ${index+1}${active?' ACTIVE':''}`,rowRect.x+6,rowRect.y+5,active?'rgb(184,235,195)':'rgb(231,236,244)',1,1,92);
      if(slot.empty){
        drawPixelText(context,'EMPTY WORLD SLOT',rowRect.x+6,rowRect.y+16,'rgb(143,158,179)',1,1,126);
      }else{
        drawPixelText(context,`SEED ${slot.seed}  DAY ${slot.day}`,rowRect.x+6,rowRect.y+15,'rgb(197,210,224)',1,1,150);
        drawPixelText(context,`${String(slot.biome).toUpperCase()}  ${formatSlotTime(slot.savedAt)}`,rowRect.x+6,rowRect.y+25,'rgb(143,174,197)',1,1,166);
        drawPixelText(context,`HP ${slot.hp}  FOOD ${slot.hunger}`,rowRect.x+6,rowRect.y+34,'rgb(214,188,137)',1,1,120);
      }

      const buttonY=rowRect.y+6;
      const buttonW=31;
      const buttonH=12;
      const baseX=rowRect.x+rowRect.w-139;
      const actions=slot.empty?['new']:['load','save','new','delete'];
      for(let actionIndex=0;actionIndex<actions.length;actionIndex++){
        const action=actions[actionIndex];
        const bx=slot.empty?rowRect.x+rowRect.w-buttonW-7:baseX+actionIndex*(buttonW+3);
        const button={kind:`world-${action}`,slot:index+1,x:bx,y:buttonY,w:buttonW,h:buttonH};
        state.ui.inventoryRects.push(button);
        const confirming=state.ui.confirmWorldAction===action&&state.ui.confirmWorldSlot===index+1;
        drawPanel(button.x,button.y,button.w,button.h,confirming?.95:.82);
        const label=confirming?'SURE?':action.toUpperCase();
        drawPixelText(context,label,button.x+3,button.y+3,action==='delete'?'rgb(255,134,134)':action==='new'?'rgb(245,210,128)':'rgb(205,229,241)',1,1,button.w-6);
      }
    }
    drawPixelText(context,'NEW AND DELETE REQUIRE A SECOND PRESS',x+8,y+h-10,'rgb(143,158,179)',1,1,w-16);
  }

  function drawPauseOverlay(){
    if(!state.paused||state.ui.worldMenuOpen||state.ui.inventoryOpen||state.ui.craftingOpen)return;
    context.fillStyle='rgba(5,7,12,.72)';
    context.fillRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);
    const dead=state.player.hp<=0;
    const title=dead?'YOU DIED':'PAUSED';
    const width=pixelTextWidth(title,2,2);
    drawPixelText(context,title,Math.floor((WORLD_WIDTH-width)*.5),75,dead?'rgb(255,100,100)':'rgb(240,244,250)',2,2);
    const hint=dead?'O WORLD SLOTS':'P RESUME  I PACK  O WORLDS  F5 SAVE';
    const hintWidth=pixelTextWidth(hint);
    drawPixelText(context,hint,Math.floor((WORLD_WIDTH-hintWidth)*.5),98,'rgb(176,194,218)',1,1);
    const button={kind:'new-world',x:Math.floor(WORLD_WIDTH*.5)-28,y:112,w:56,h:12};
    state.ui.inventoryRects.push(button);
    drawPanel(button.x,button.y,button.w,button.h,.92);
    drawPixelText(context,'WORLD SLOTS',button.x+5,button.y+3,'rgb(238,242,250)',1,1,button.w-10);
  }

  function drawGameHud(originX,originY){
    const hud=state.ui.hud??{};
    state.ui.inventoryRects.length=0;

    const breathVisible=Boolean(hud.breathUsing);
    drawPanel(3,3,88,breathVisible?29:20,.76);
    drawHeartIcon(6,6,hud.hp<=25&&state.frame%12<6?'rgb(255,230,230)':'rgb(235,73,78)');
    drawPixelText(context,'HP',15,5,'rgb(240,213,216)',1,1,12);
    drawSegmentedBar(28,5,59,7,state.player.hp,100,['rgb(208,54,66)','rgb(255,126,124)','rgb(255,230,230)'],state.player.hp<=25);
    drawFoodIcon(6,14,hud.criticalHunger&&state.frame%12<6?'rgb(255,245,190)':'rgb(231,169,61)');
    drawPixelText(context,'FOOD',15,14,'rgb(240,217,169)',1,1,22);
    drawSegmentedBar(38,14,49,6,state.player.hunger,100,['rgb(216,152,54)','rgb(255,222,115)','rgb(255,246,205)'],hud.criticalHunger);
    if(breathVisible){
      const breathColor=hud.criticalBreath&&state.frame%12<6?'rgb(244,252,255)':'rgb(101,197,235)';
      drawBreathIcon(6,23,breathColor);
      drawPixelText(context,'AIR',15,23,'rgb(184,224,242)',1,1,18);
      drawSegmentedBar(38,23,49,6,state.player.breath,hud.maxBreath??100,['rgb(65,157,211)','rgb(150,225,250)','rgb(244,252,255)'],hud.criticalBreath);
    }

    const infoX=WORLD_WIDTH-121;
    drawPanel(infoX,3,77,22,.72);
    drawWeatherIcon(infoX+4,7,hud.weatherType,hud.timePhase==='day');
    drawPixelText(context,hud.time??'',infoX+18,6,'rgb(231,236,244)',1,1,54);
    drawPixelText(context,hud.weather??'',infoX+18,13,'rgb(170,194,216)',1,1,54);
    drawPixelText(context,`SLOT ${hud.activeSlot??1}`,infoX+4,19,state.save.dirty?'rgb(245,210,128)':'rgb(184,235,195)',1,1,67);
    drawTopButtons();

    const bottomY=WORLD_HEIGHT-17;
    drawPanel(3,bottomY,94,14,.68);
    drawPixelText(context,hud.biome??'',7,bottomY+3,'rgb(211,224,235)',1,1,84);
    drawPixelText(context,`REGION ${hud.region??''}`,7,bottomY+9,'rgb(144,166,188)',1,1,84);

    const weaponW=104;
    const weaponX=Math.floor((WORLD_WIDTH-weaponW)*.5);
    drawPanel(weaponX,bottomY,weaponW,14,.8);
    drawWeaponIcon(weaponX+4,bottomY+2,hud.weaponId);
    drawPixelText(context,hud.weapon??'',weaponX+17,bottomY+3,'rgb(235,239,245)',1,1,78);
    context.fillStyle='rgb(38,43,52)'; context.fillRect(weaponX+17,bottomY+10,78,2);
    if(hud.weaponId===WeaponId.LASER_RIFLE){
      const heatRatio=Math.max(0,Math.min(1,(state.laser?.heat??0)/100));
      context.fillStyle=state.laser?.overheated?'rgb(255,58,52)':heatRatio>.7?'rgb(255,132,48)':'rgb(255,214,95)';
      context.fillRect(weaponX+17,bottomY+10,Math.round(78*heatRatio),2);
      if(state.laser?.overheated)drawPixelText(context,'HOT',weaponX+82,bottomY+3,'rgb(255,112,92)',1,1,14);
    }else{
      const maxCooldown=WEAPON_DB[hud.weaponId]?.cooldown??1;
      const readyRatio=1-Math.max(0,Math.min(1,state.cooldown/Math.max(1,maxCooldown)));
      context.fillStyle=state.cooldown>0?'rgb(113,180,219)':'rgb(116,220,158)';
      context.fillRect(weaponX+17,bottomY+10,Math.round(78*readyRatio),2);
    }

    const resourceW=100;
    const resourceX=WORLD_WIDTH-resourceW-3;
    const resourcePulse=(state.juice?.hudPulse??0)>0&&state.frame%4<2;
    drawPanel(resourceX,bottomY,resourceW,14,resourcePulse?.9:.72);
    drawCrystalIcon(resourceX+4,bottomY+3);
    drawPixelText(context,String(hud.crystals??0),resourceX+13,bottomY+4,'rgb(225,214,255)',1,1,22);
    drawPixelText(context,`PACK ${hud.inventoryCount??0}`,resourceX+39,bottomY+4,'rgb(213,220,232)',1,1,54);
    drawPixelText(context,`ZOOM ${hud.zoom??'OFF'}`,resourceX+39,bottomY+10,'rgb(163,184,208)',1,1,54);

    drawStatusIcons();
    drawBossRitual();
    drawSaveStatus();
    drawPickupFeed();
    drawMessage();
    drawOffscreenBossIndicator(originX,originY);
    drawToolPrompt();
    drawDamageFeedback();
    drawPauseOverlay();
    drawInventoryOverlay();
    drawCraftingOverlay();
    drawWorldMenuOverlay();
  }

  function render(){
    context.imageSmoothingEnabled=false;
    const camera=state.world.camera;
    const current=chunks.getChunk(camera.chunkX,camera.chunkY,true);
    refreshTerrainCache(current);
    const shake=juiceSystem?.cameraOffset?.()??{x:0,y:0};
    context.fillStyle='rgb(5,7,11)';
    context.fillRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);
    context.putImageData(terrainImage,shake.x,shake.y);

    const baseOriginX=camera.chunkX*WORLD_WIDTH;
    const baseOriginY=camera.chunkY*WORLD_HEIGHT;
    const originX=baseOriginX-shake.x;
    const originY=baseOriginY-shake.y;
    drawSkyDetails(current,baseOriginX-shake.x,baseOriginY);
    drawAmbientJuice(current,originX,originY);
    drawFurnitureLights(originX,originY);
    drawProjectiles(originX,originY);
    drawExplosionEffects(originX,originY);
    drawHook(originX,originY);
    drawMoonPortal(originX,originY);
    drawFurniture(originX,originY);
    drawEnemyBehaviorWorld(originX,originY);
    drawEnemies(originX,originY);
    drawBosses(originX,originY);
    drawPlayer(originX,originY);
    drawAttachedParasites(originX,originY);
    drawWeaponEffects(originX,originY);
    drawJuiceWorld(originX,originY);
    drawWeather(originX,originY);
    drawMagnifier();
    drawJuiceScreen();
    drawBossHud();
    drawGameHud(originX,originY);
    drawPointerCursor();

    if(canvas.style)canvas.style.cursor='none';
  }

  function invalidateTerrainCache(){
    cachedTerrainChunk=null;
    lastFullTerrainFrame=-TERRAIN_FULL_REFRESH_FRAMES;
  }

  function getPerformanceStats(){
    return{
      terrainPixelsUpdated:lastTerrainPixelsUpdated,
      fullTerrainRefreshFrames:TERRAIN_FULL_REFRESH_FRAMES,
    };
  }

  return { render, context, getPerformanceStats, invalidateTerrainCache };
}
