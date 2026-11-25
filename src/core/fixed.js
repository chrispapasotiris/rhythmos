import { startOfDay, startOfNextDay, startOfWeek, startOfNextWeek } from './time.js';
import { totalMin, occurrences } from './metrics.js';

export function relaxBaseDaily(fixedDefs, relaxWeek){
  const d=fixedDefs.find(x=>x.id==='relax');
  return d?d.weekly/7:(relaxWeek||0)/7;
}

export function relaxOversUsed(ctx, includeToday){
  const base=relaxBaseDaily(ctx.fixedDefs, ctx.relaxWeek);
  const ws=startOfWeek(ctx.now);
  const today=startOfDay(ctx.now);
  let count=0;
  for(let i=0;i<7;i++){
    const d=new Date(ws);d.setDate(d.getDate()+i);const ds=d.getTime();
    if(ds>today)continue;
    if(includeToday===false&&ds>=today)continue;
    const m=totalMin(ctx.logs,ctx.active,'fixed','relax',ds,startOfNextDay(ds),ctx.now);
    if(m>base+0.5)count++;
  }
  return count;
}

export function fixedInfo(ctx, id){
  const def=ctx.fixedDefs.find(d=>d.id===id);
  if(!def)return null;
  const now=ctx.now;
  const dayMin=totalMin(ctx.logs,ctx.active,'fixed',id,startOfDay(now),startOfNextDay(now),now);
  const weekMin=totalMin(ctx.logs,ctx.active,'fixed',id,startOfWeek(now),startOfNextWeek(now),now);
  const occ=occurrences(ctx.logs,ctx.active,'fixed',id,startOfWeek(now),startOfNextWeek(now),now);
  let dailyCap=def.daily,weeklyCap=def.weekly,hardLimit=Infinity,extra={};
  if(id==='relax'){
    const base=relaxBaseDaily(ctx.fixedDefs,ctx.relaxWeek);
    const allowed=ctx.settings.relaxOvers;
    const oversBefore=relaxOversUsed(ctx,false);
    const oversDisplay=relaxOversUsed(ctx,true);
    const canOver=oversBefore<allowed;
    dailyCap=base;weeklyCap=def.weekly;hardLimit=canOver?base*2:base;
    extra={base,double:base*2,overs:oversDisplay,oversBefore,allowed,canOver,weeklyMax:def.weekly+allowed*base};
  }else if(def.hard){hardLimit=dailyCap;}
  return {def,dayMin,weekMin,occ,dailyCap,weeklyCap,hardLimit,
    dayRemaining:dailyCap-dayMin,dayOver:Math.max(0,dayMin-dailyCap),
    weekRemaining:weeklyCap-weekMin,weekOver:Math.max(0,weekMin-weeklyCap),
    target:def.target,...extra};
}
