import { describe, it, expect } from 'vitest';
import { relaxBaseDaily, relaxOversUsed, fixedInfo } from '../src/core/fixed.js';

const d0=new Date(2026,0,5,0,0,0,0).getTime(); // Δευτέρα
const day=86400000, H=3600000, M=60000;
const now=d0+2*day+12*H; // Τετάρτη 12:00

const fixedDefs=[{id:'relax',weekly:210,daily:30},{id:'gym',weekly:300,daily:60,hard:true}];
const logs=[
  {type:'fixed',id:'relax',start:d0+10*H,end:d0+10*H+40*M,dur:40},        // Δευτέρα 40 -> over
  {type:'fixed',id:'relax',start:d0+day+10*H,end:d0+day+10*H+30.5*M,dur:30.5}, // Τρίτη 30.5 -> ΟΧΙ over (boundary)
  {type:'fixed',id:'relax',start:d0+2*day+9*H,end:d0+2*day+9*H+45*M,dur:45},   // Τετάρτη 45 -> over
];
const ctx={logs,active:null,fixedDefs,settings:{relaxOvers:2},now,relaxWeek:0};

describe('relaxBaseDaily', () => {
  it('weekly/7', () => expect(relaxBaseDaily(fixedDefs,0)).toBe(30));
  it('missing def, relaxWeek 0', () => expect(relaxBaseDaily([],0)).toBe(0));
  it('missing def, relaxWeek 210', () => expect(relaxBaseDaily([],210)).toBe(30));
});

describe('relaxOversUsed', () => {
  it('exclude today = 1 (Δευτέρα μόνο, Τρίτη boundary)', () =>
    expect(relaxOversUsed(ctx,false)).toBe(1));
  it('include today = 2', () => expect(relaxOversUsed(ctx,true)).toBe(2));
  it('future day ignored', () => {
    const ctx2={...ctx,logs:[...logs,{type:'fixed',id:'relax',start:d0+3*day+10*H,end:d0+3*day+10*H+100*M,dur:100}]};
    expect(relaxOversUsed(ctx2,true)).toBe(2);
  });
});

describe('fixedInfo relax', () => {
  it('canOver true, hardLimit double', () => {
    const r=fixedInfo(ctx,'relax');
    expect(r.dayMin).toBe(45);
    expect(r.weekMin).toBeCloseTo(115.5,6);
    expect(r.occ).toBe(3);
    expect(r.dailyCap).toBe(30);
    expect(r.canOver).toBe(true);
    expect(r.hardLimit).toBe(60);
    expect(r.dayOver).toBe(15);
    expect(r.weekRemaining).toBeCloseTo(94.5,6);
    expect(r.weeklyMax).toBe(270);
  });
  it('allowed=1 -> canOver false, hardLimit base', () => {
    const r=fixedInfo({...ctx,settings:{relaxOvers:1}},'relax');
    expect(r.canOver).toBe(false);
    expect(r.hardLimit).toBe(30);
    expect(r.weeklyMax).toBe(240);
  });
  it('active adds to dayMin', () => {
    const r=fixedInfo({...ctx,active:{type:'fixed',id:'relax',start:d0+2*day+11*H}},'relax');
    expect(r.dayMin).toBe(105);
  });
});

describe('fixedInfo other', () => {
  it('hard def', () => {
    const r=fixedInfo(ctx,'gym');
    expect(r.hardLimit).toBe(60);
    expect(r.dayRemaining).toBe(60);
  });
  it('unknown id null', () => expect(fixedInfo(ctx,'nope')).toBe(null));
});
