import { DAY_NIGHT_CONFIG } from '../config.js';

export function createTimeSystem(state){
  const cycleFrames=DAY_NIGHT_CONFIG.dayFrames+DAY_NIGHT_CONFIG.nightFrames;
  const clamp=value=>Math.max(0,Math.min(1,value));
  const smooth=t=>{
    const x=clamp(t);
    return x*x*(3-2*x);
  };

  function getTime(){
    const cycleFrame=((state.frame%cycleFrames)+cycleFrames)%cycleFrames;
    const dayNumber=Math.floor(state.frame/cycleFrames)+1;
    const isDay=cycleFrame<DAY_NIGHT_CONFIG.dayFrames;
    const phaseFrame=isDay?cycleFrame:cycleFrame-DAY_NIGHT_CONFIG.dayFrames;
    const phaseProgress=phaseFrame/(isDay?DAY_NIGHT_CONFIG.dayFrames:DAY_NIGHT_CONFIG.nightFrames);

    let daylight;
    let dawn=0;
    let dusk=0;
    let nightStrength=0;

    if(isDay){
      const dawnEnd=DAY_NIGHT_CONFIG.dawnFraction;
      const duskStart=1-DAY_NIGHT_CONFIG.duskFraction;
      if(phaseProgress<dawnEnd){
        dawn=1-phaseProgress/dawnEnd;
        daylight=.16+.84*smooth(phaseProgress/dawnEnd);
      }else if(phaseProgress>duskStart){
        dusk=(phaseProgress-duskStart)/(1-duskStart);
        daylight=.16+.84*(1-smooth(dusk));
      }else{
        daylight=1;
      }
    }else{
      const edge=Math.min(phaseProgress,1-phaseProgress)*5;
      nightStrength=.55+.45*smooth(clamp(edge));
      daylight=.08*(1-nightStrength);
    }

    // Daytime maps 06:00–18:00; night maps 18:00–06:00.
    const clockHours=isDay?6+phaseProgress*12:18+phaseProgress*12;
    const normalizedHours=clockHours%24;
    const hours=Math.floor(normalizedHours);
    const minutes=Math.floor((normalizedHours-hours)*60);

    return{
      cycleFrame,
      cycleFrames,
      dayNumber,
      isDay,
      phase:isDay?'day':'night',
      phaseProgress,
      daylight:clamp(daylight),
      nightStrength:clamp(isDay?1-daylight:nightStrength),
      dawn:clamp(dawn),
      dusk:clamp(dusk),
      hours,
      minutes,
      label:`Day ${dayNumber} · ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`,
    };
  }

  return { getTime, cycleFrames };
}
