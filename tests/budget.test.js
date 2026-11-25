import { describe, it, expect } from 'vitest';
import { budgetSnapshotExact } from '../src/core/budget.js';

const d0=new Date(2026,0,5,0,0,0,0).getTime(); // Δευτέρα
const day=86400000, H=3600000;
const now=d0+2*day+12*H; // Τετάρτη 12:00 → todayIdx=2

describe('budgetSnapshotExact', () => {
  const courses=[{id:'phys1',active:true,hours:10,off:[]},{id:'math',active:true,hours:5,off:[0,6]}];
  const fixedDefs=[{id:'gym',weekly:300},{id:'food',weekly:140}];

  it('no slots: everything unscheduled', () => {
    const r=budgetSnapshotExact([],{},courses,fixedDefs,8,now,480);
    // plannedW = 0 + 440 + (600+300) = 1340; sleepW=3360; weekRem=10080-3360-1340=5380
    expect(r.plannedW).toBe(1340);
    expect(r.weekRem).toBe(5380);
    expect(r.days.length).toBe(7);
  });

  it('scheduled course removed from unscheduled', () => {
    const slots=[{activityId:'course:phys1',day:1,start:'09:00',end:'11:00'}];
    const r=budgetSnapshotExact(slots,{},courses,fixedDefs,8,now,480);
    // phys1 now scheduled → unscheduledCourseW = 300 (math only); scheduledW=120
    // plannedW = 120 + 440 + 300 = 860
    expect(r.plannedW).toBe(860);
  });

  it('scheduled fixed removed from unscheduledFixedW', () => {
    const slots=[{activityId:'fixed:gym',day:1,start:'18:00',end:'19:00'}];
    const r=budgetSnapshotExact(slots,{},courses,fixedDefs,8,now,480);
    // gym scheduled → unscheduledFixedW = 140 (food only); scheduledW=60
    // plannedW = 60 + 140 + 900 = 1100
    expect(r.plannedW).toBe(1100);
  });

  it('today uses actualSleepToday, other days use sleepHours', () => {
    const r=budgetSnapshotExact([],{},[],[{id:'gym',weekly:0}],8,now,600); // actualSleep=600 (10h)
    // todayIdx=2 → days[2] sleepD=600, others=480
    // days[2] = 1440-600-0 = 840 ; days[0] = 1440-480-0 = 960
    expect(r.days[2]).toBe(840);
    expect(r.days[0]).toBe(960);
  });

  it('slotEff applies only to today slot', () => {
    const slots=[
      {id:'a',activityId:'course:phys1',day:2,start:'09:00',end:'10:00'}, // today
      {id:'b',activityId:'course:phys1',day:3,start:'09:00',end:'10:00'}  // tomorrow
    ];
    const slotStatus={'2026-01-07':{a:{start:'09:30',end:'10:30'}}}; // today=Wed 7/1
    const r=budgetSnapshotExact(slots,slotStatus,[{id:'phys1',active:false,hours:0,off:[]}],[],8,now,480);
    // today slot a → eff 09:30-10:30 = 60m ; tomorrow slot b → raw 09:00-10:00 = 60m
    // scheduledW = 120, daysSlot[2]=60, daysSlot[3]=60
    expect(r.plannedW).toBe(120);
  });

  it('weeklySleep adjusts by actualSleepToday delta', () => {
    const r=budgetSnapshotExact([],{},[],[],8,now,540); // 9h actual vs 8h setting
    // weeklySleep = 3360 + (540-480) = 3420
    expect(r.sleepW).toBe(3420);
  });
});
