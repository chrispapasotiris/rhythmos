import { mondayIndex } from './time.js';
import { slotEff, slotStatusGet } from './schedule.js';

export function budgetSnapshotExact(slots, slotStatus, courses, fixedDefs, sleepHours, now, actualSleepToday){
  slots=slots||[];
  const scheduledFixed={}, scheduledCourse={};
  slots.forEach(s=>{
    if(!s||!s.activityId)return;
    const p=String(s.activityId).split(':');
    if(p[0]==='fixed')scheduledFixed[p.slice(1).join(':')]=1;
    else if(p[0]==='course')scheduledCourse[p.slice(1).join(':')]=1;
  });
  let unscheduledFixedW=0;
  fixedDefs.forEach(d=>{ if(!scheduledFixed[d.id]) unscheduledFixedW+=(d.weekly||0); });
  const unscheduledCourses=[];
  courses.forEach(c=>{
    if(c&&c.active&&c.hours>0&&!scheduledCourse[c.id]){
      const off=Array.isArray(c.off)?c.off:[];
      const activeDays=Math.max(1,7-off.length);
      unscheduledCourses.push({id:c.id,hoursMin:c.hours*60,off,per:c.hours*60/activeDays});
    }
  });
  const todayIdx=mondayIndex(now);
  let scheduledW=0;
  const daysSlot=[0,0,0,0,0,0,0];
  slots.forEach(s=>{
    if(!s)return;
    let st,en;
    if(s.day===todayIdx){ st=slotEff(s,slotStatusGet(slotStatus,s.id,now)).start; en=slotEff(s,slotStatusGet(slotStatus,s.id,now)).end; }
    else { st=s.start; en=s.end; }
    const t=String(st||'0:0').split(':').map(Number);
    const e=String(en||'0:0').split(':').map(Number);
    const m=(e[0]*60+(e[1]||0))-(t[0]*60+(t[1]||0));
    if(m>0){ scheduledW+=m; if(s.day>=0&&s.day<7)daysSlot[s.day]+=m; }
  });
  let unscheduledCourseW=0;
  const unscheduledCourseDay=[0,0,0,0,0,0,0];
  unscheduledCourses.forEach(c=>{
    unscheduledCourseW+=c.hoursMin;
    for(let d=0;d<7;d++) if(c.off.indexOf(d)<0) unscheduledCourseDay[d]+=c.per;
  });
  const plannedW=scheduledW+unscheduledFixedW+unscheduledCourseW;
  const weeklySleep=sleepHours*7*60+(actualSleepToday-sleepHours*60);
  const weekRem=10080-weeklySleep-plannedW;
  const days=[];
  for(let d=0;d<7;d++){
    const sleepD=(d===todayIdx?actualSleepToday:sleepHours*60);
    const loadD=daysSlot[d]+unscheduledFixedW/7+unscheduledCourseDay[d];
    days.push(1440-sleepD-loadD);
  }
  return {weekRem,days,sleepW:weeklySleep,plannedW};
}
