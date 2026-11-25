import { describe, it, expect } from 'vitest';
import { courseInfo } from '../src/core/courses.js';

const d0=new Date(2026,0,5,0,0,0,0).getTime(); // Δευτέρα
const day=86400000, H=3600000, M=60000;
const now=d0+2*day+12*H; // Τετάρτη 12:00

const logs=[
  {type:'course',id:'phys1',start:d0+9*H,end:d0+11*H,dur:120},
  {type:'course',id:'phys1',start:d0+14*H,end:d0+16*H,dur:120},
  {type:'course',id:'phys1',start:d0+day+10*H,end:d0+day+12*H,dur:120},
  {type:'course',id:'phys1',start:d0+2*day+9*H,end:d0+2*day+11*H,dur:120},
];

const ctxBase={logs,active:null,now,schedulePlacedDays:null};

describe('courseInfo basic', () => {
  it('no off days, no placed', () => {
    const c={id:'phys1',hours:10,off:[]};
    const r=courseInfo(ctxBase,c);
    expect(r.dayMin).toBe(120); // Δευτέρα 240
    expect(r.weekMin).toBe(480); // 240+120
    expect(r.targetMin).toBe(600);
    expect(r.activeDays).toBe(7);
    expect(r.dailyTarget).toBeCloseTo(600/7,6);
    expect(r.todayTarget).toBeGreaterThan(0);
    expect(r.isOff).toBe(false);
    expect(r.remaining).toBe(120);
  });
  it('with off days', () => {
    const c={id:'phys1',hours:10,off:[0,6]}; // Δευτέρα, Κυριακή off
    const r=courseInfo(ctxBase,c);
    expect(r.activeDays).toBe(5);
    expect(r.dailyTarget).toBe(120);
    expect(r.isOff).toBe(false); // Τετάρτη δεν είναι off
  });
  it('today is off', () => {
    const c={id:'phys1',hours:10,off:[2]}; // Τετάρτη off
    const r=courseInfo(ctxBase,c);
    expect(r.isOff).toBe(true);
    expect(r.todayTarget).toBe(0);
  });
  it('with schedulePlacedDays', () => {
    const c={id:'phys1',hours:10,off:[]};
    const ctx={...ctxBase,schedulePlacedDays:(id)=>id==='phys1'?[1,2,3,4,5]:[]};
    const r=courseInfo(ctx,c);
    expect(r.placed).toBe(5);
    expect(r.off).toEqual([0,6]);
    expect(r.activeDays).toBe(5);
  });
  it('remaining clamped to 0', () => {
    const c={id:'phys1',hours:1,off:[]}; // 60 min target, already 360 logged
    const r=courseInfo(ctxBase,c);
    expect(r.remaining).toBe(0);
    expect(r.todayTarget).toBe(0);
  });
});
