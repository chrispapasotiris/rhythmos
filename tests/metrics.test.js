import { describe, it, expect } from 'vitest';
import { budgetSnapshot, plannedWeeklyMin, dailyFreeMin, totalMin, occurrences } from '../src/core/metrics.js';

const d0=new Date(2026,0,5,0,0,0,0).getTime();   // Δευτέρα 5/1/2026 μεσάνυχτα
const day=d0+86400000;
const now=d0+12*3600000;                          // 12:00 την ίδια μέρα

const logs=[
  {type:'course',id:'phys1',start:d0+9*3600000,end:d0+11*3600000,dur:120},
  {type:'course',id:'phys1',start:d0+14*3600000,end:d0+16*3600000,dur:120},
  {type:'fixed',id:'gym',start:d0+18*3600000,end:d0+19*3600000,dur:60},
  {type:'course',id:'phys1',start:d0+2*86400000+9*3600000,end:d0+2*86400000+10*3600000,dur:60},
];

describe('totalMin', () => {
  it('sums two segments same day', () =>
    expect(totalMin(logs,null,'course','phys1',d0,day,now)).toBe(240));
  it('fixed type isolated', () =>
    expect(totalMin(logs,null,'fixed','gym',d0,day,now)).toBe(60));
  it('excludes other id', () =>
    expect(totalMin(logs,null,'course','math',d0,day,now)).toBe(0));
  it('adds active session', () => {
    const active={type:'course',id:'phys1',start:d0+16*3600000};
    expect(totalMin(logs,active,'course','phys1',d0,day,now)).toBe(240+0);
    // active 16:00->12:00(now) = 0, because now<start -> overlap 0
  });
  it('active fully inside window', () => {
    const active={type:'course',id:'phys1',start:d0+10*3600000};
    // 10:00->12:00 = 120 extra
    expect(totalMin(logs,active,'course','phys1',d0,day,now)).toBe(240+120);
  });
});

describe('occurrences', () => {
  it('one day', () =>
    expect(occurrences(logs,null,'course','phys1',d0,day,now)).toBe(1));
  it('two days across week', () =>
    expect(occurrences(logs,null,'course','phys1',d0,d0+7*86400000,now)).toBe(2));
  it('active counts as occurrence', () => {
    const active={type:'fixed',id:'gym',start:d0+20*3600000};
    expect(occurrences(logs,active,'fixed','gym',d0,day,now)).toBe(1);
  });
});

describe('budgetSnapshot', () => {
  const courses=[{id:'c1',active:true,hours:20,off:[0,6]},{id:'c2',active:true,hours:10,off:[]}];
  const fixedDefs=[{id:'gym',weekly:300},{id:'food',weekly:140}];
  const snap=budgetSnapshot(courses,fixedDefs,8);
  it('weekRem = 10080 - sleep - fixed - course', () =>
    expect(snap.weekRem).toBe(10080-3360-440-1800));
  it('off days carry only c2 load', () => {
    // d0: 1440-480-62.857-85.714 = 811.428
    expect(snap.days[0]).toBeCloseTo(811.428,2);
    expect(snap.days[6]).toBeCloseTo(811.428,2);
  });
  it('active days carry both', () => {
    // d1: 1440-480-62.857-325.714 = 571.428
    expect(snap.days[1]).toBeCloseTo(571.428,2);
  });
  it('inactive course ignored', () => {
    const s2=budgetSnapshot([{id:'x',active:false,hours:50,off:[]}],[],8);
    expect(s2.weekRem).toBe(10080-3360);
  });
});

describe('plannedWeeklyMin', () => {
  it('fixed + active courses', () =>
    expect(plannedWeeklyMin([{weekly:300},{weekly:140}],[{active:true,hours:20},{active:false,hours:50}])).toBe(440+1200));
});

describe('dailyFreeMin', () => {
  it('equals weekRem/7 when no rounding drift', () => {
    const courses=[{id:'c1',active:true,hours:20,off:[0,6]},{id:'c2',active:true,hours:10,off:[]}];
    const fixedDefs=[{id:'gym',weekly:300},{id:'food',weekly:140}];
    const snap=budgetSnapshot(courses,fixedDefs,8);
    expect(dailyFreeMin(courses,fixedDefs,8)).toBeCloseTo(snap.weekRem/7,6);
  });
});
