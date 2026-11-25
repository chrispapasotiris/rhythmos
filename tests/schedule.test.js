import { describe, it, expect } from 'vitest';
import { timeToMinutes, slotParseHM, slotActivityParts, schedulePlacedDays, scheduleGetDay, scheduleFind, slotStatusGet, slotEff } from '../src/core/schedule.js';

describe('timeToMinutes', () => {
  it('normal', () => expect(timeToMinutes('9:30')).toBe(570));
  it('midnight', () => expect(timeToMinutes('0:0')).toBe(0));
  it('empty', () => expect(timeToMinutes('')).toBe(0));
});

describe('slotParseHM', () => {
  it('parses', () => expect(slotParseHM('14:25')).toEqual({h:14,m:25}));
  it('fallback', () => expect(slotParseHM(null)).toEqual({h:0,m:0}));
});

describe('slotActivityParts', () => {
  it('course', () => expect(slotActivityParts('course:phys1')).toEqual({type:'course',id:'phys1'}));
  it('fixed with colon in id', () => expect(slotActivityParts('fixed:relax')).toEqual({type:'fixed',id:'relax'}));
});

describe('schedulePlacedDays', () => {
  const slots=[{activityId:'course:phys1',day:1},{activityId:'course:phys1',day:3},{activityId:'course:math',day:2},{activityId:'course:phys1',day:1}];
  it('deduplicates', () => expect(schedulePlacedDays(slots,'phys1')).toEqual([1,3]));
  it('other course', () => expect(schedulePlacedDays(slots,'math')).toEqual([2]));
  it('none', () => expect(schedulePlacedDays(slots,'nope')).toEqual([]));
});

describe('scheduleGetDay', () => {
  const slots=[{day:1,start:'10:00'},{day:1,start:'08:00'},{day:2,start:'09:00'}];
  it('filters and sorts by start', () => {
    const r=scheduleGetDay(slots,1);
    expect(r.length).toBe(2);
    expect(r[0].start).toBe('08:00');
  });
  it('empty day', () => expect(scheduleGetDay(slots,3).length).toBe(0));
});

describe('scheduleFind', () => {
  const slots=[{id:'a',day:1},{id:'b',day:2}];
  it('found', () => expect(scheduleFind(slots,'b').day).toBe(2));
  it('not found', () => expect(scheduleFind(slots,'z')).toBeNull());
});

describe('slotStatusGet', () => {
  const now=new Date(2026,0,5,12,0,0,0).getTime();
  const ss={'2026-01-05':{x:{status:'done'}}};
  it('returns status for matching key', () => expect(slotStatusGet(ss,'x',now)).toEqual({status:'done'}));
  it('missing slot', () => expect(slotStatusGet(ss,'y',now)).toBeNull());
  it('missing day', () => expect(slotStatusGet({},'x',now)).toBeNull());
});

describe('slotEff', () => {
  const s={id:'x',start:'09:00',end:'10:00'};
  it('no status = defaults', () => {
    const e=slotEff(s,null);
    expect(e.start).toBe('09:00');
    expect(e.status).toBe('pending');
    expect(e.count).toBe(0);
  });
  it('with status overrides', () => {
    const e=slotEff(s,{start:'09:30',status:'done',postponeCount:2,overtime:true});
    expect(e.start).toBe('09:30');
    expect(e.status).toBe('done');
    expect(e.count).toBe(2);
    expect(e.overtime).toBe(true);
  });
});
