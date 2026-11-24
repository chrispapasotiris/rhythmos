import { overlap, startOfDay } from './time.js';

export function budgetSnapshot(courses, fixedDefs, sleepHours){
  const sleepW=sleepHours*7*60;
  const fixedW=fixedDefs.reduce((s,d)=>s+d.weekly,0);
  const courseW=courses.filter(c=>c.active&&c.hours>0).reduce((s,c)=>s+c.hours*60,0);
  const weekRem=10080-sleepW-fixedW-courseW;
  const fixedDay=fixedW/7;
  const loads=[0,0,0,0,0,0,0];
  courses.forEach(c=>{
    if(!c.active||!c.hours)return;
    const off=Array.isArray(c.off)?c.off:[];
    const activeDays=Math.max(1,7-off.length);
    const per=c.hours*60/activeDays;
    for(let d=0;d<7;d++)if(!off.includes(d))loads[d]+=per;
  });
  const days=loads.map(l=>1440-sleepHours*60-fixedDay-l);
  return {weekRem,days};
}

export function plannedWeeklyMin(fixedDefs, courses){
  const fixed=fixedDefs.reduce((s,d)=>s+d.weekly,0);
  const csum=courses.filter(c=>c.active&&c.hours>0).reduce((s,c)=>s+c.hours*60,0);
  return fixed+csum;
}

export function dailyFreeMin(courses, fixedDefs, sleepHours){
  const snap=budgetSnapshot(courses,fixedDefs,sleepHours);
  return snap.days.reduce((a,b)=>a+b,0)/7;
}

export function totalMin(logs, active, type, id, from, to, now){
  let s=logs.reduce((acc,l)=>{
    if(l.type===type&&l.id===id)return acc+overlap(l.start,l.end,from,to)/60000;
    return acc;
  },0);
  if(active&&active.type===type&&active.id===id)s+=overlap(active.start,now,from,to)/60000;
  return s;
}

export function occurrences(logs, active, type, id, from, to, now){
  const days=new Set();
  logs.forEach(l=>{
    if(l.type===type&&l.id===id&&l.dur>0.01&&overlap(l.start,l.end,from,to)>0)days.add(startOfDay(l.start));
  });
  if(active&&active.type===type&&active.id===id){
    const s=Math.max(active.start,from),e=Math.min(now,to);
    if(e>s)days.add(startOfDay(active.start));
  }
  return days.size;
}
