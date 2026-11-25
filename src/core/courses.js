import { startOfDay, startOfNextDay, startOfWeek, startOfNextWeek, mondayIndex } from './time.js';
import { totalMin } from './metrics.js';

export function courseInfo(ctx, c){
  const now=ctx.now;
  const dayMin=totalMin(ctx.logs,ctx.active,'course',c.id,startOfDay(now),startOfNextDay(now),now);
  const weekMin=totalMin(ctx.logs,ctx.active,'course',c.id,startOfWeek(now),startOfNextWeek(now),now);
  const targetMin=(c.hours||0)*60;
  const placed=ctx.schedulePlacedDays?ctx.schedulePlacedDays(c.id):null;
  const off=(placed&&placed.length>0)?[0,1,2,3,4,5,6].filter(d=>!placed.includes(d)):(Array.isArray(c.off)?c.off:[]);
  const activeDays=Math.max(1,7-off.length);
  const dailyTarget=targetMin/activeDays;
  const today=mondayIndex(now);
  const isOff=off.includes(today);
  let remActive=0;
  for(let i=today;i<7;i++)if(!off.includes(i))remActive++;
  const remaining=Math.max(0,targetMin-weekMin);
  const todayTarget=(!isOff&&remActive>0&&remaining>0)?Math.min(dailyTarget,remaining/remActive):0;
  return {course:c,dayMin,weekMin,targetMin,remaining,dailyTarget,todayTarget,isOff,off,activeDays,remActive,placed:placed?placed.length:0};
}
