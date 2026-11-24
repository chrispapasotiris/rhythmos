import { describe, it, expect } from 'vitest';
import { clamp, overlap, fmtHM, mondayIndex, startOfWeek, startOfNextDay, daysInMonth, formatDate, shortDate } from '../src/core/time.js';

describe('clamp', () => {
  it('in-range', () => expect(clamp(5,0,10)).toBe(5));
  it('low', () => expect(clamp(-1,0,10)).toBe(0));
  it('high', () => expect(clamp(15,0,10)).toBe(10));
});

describe('overlap', () => {
  it('full', () => expect(overlap(0,100,0,100)).toBe(100));
  it('partial', () => expect(overlap(0,100,50,150)).toBe(50));
  it('disjoint', () => expect(overlap(0,100,200,300)).toBe(0));
  it('zero window', () => expect(overlap(0,100,50,50)).toBe(0));
  it('midnight split 23:00->01:00 = 60m each day', () => {
    const d0 = new Date(2026,0,5,0,0,0,0).getTime();
    const d1 = startOfNextDay(d0);
    const ls = new Date(2026,0,5,23,0,0,0).getTime();
    const le = new Date(2026,0,6,1,0,0,0).getTime();
    expect(overlap(ls,le,d0,d1)/60000).toBe(60);
    expect(overlap(ls,le,d1,startOfNextDay(d1))/60000).toBe(60);
  });
});

describe('fmtHM', () => {
  it('0', () => expect(fmtHM(0)).toBe('0λ'));
  it('25', () => expect(fmtHM(25)).toBe('25λ'));
  it('60', () => expect(fmtHM(60)).toBe('1ω'));
  it('90', () => expect(fmtHM(90)).toBe('1ω 30λ'));
  it('-30', () => expect(fmtHM(-30)).toBe('−30λ'));
  it('Inf', () => expect(fmtHM(Infinity)).toBe('—'));
});

describe('mondayIndex', () => {
  it('Mon=0', () => expect(mondayIndex(new Date(2026,0,5).getTime())).toBe(0));
  it('Sun=6', () => expect(mondayIndex(new Date(2026,0,11).getTime())).toBe(6));
  it('Wed=2', () => expect(mondayIndex(new Date(2026,0,7).getTime())).toBe(2));
});

describe('startOfWeek', () => {
  it('Wed->Mon 00:00', () => {
    expect(startOfWeek(new Date(2026,0,7,14,30,0,0).getTime()))
      .toBe(new Date(2026,0,5,0,0,0,0).getTime());
  });
  it('Mon 00:00 stable', () => {
    const mon = new Date(2026,0,5,0,0,0,0).getTime();
    expect(startOfWeek(mon)).toBe(mon);
  });
});

describe('daysInMonth', () => {
  it('Feb 2026 = 28', () => expect(daysInMonth(new Date(2026,1,15).getTime())).toBe(28));
  it('Feb 2024 = 29', () => expect(daysInMonth(new Date(2024,1,15).getTime())).toBe(29));
});

describe('formatDate / shortDate', () => {
  it('greek weekday + genitive', () =>
    expect(formatDate(new Date(2026,0,5,12,0,0,0).getTime())).toBe('Δευτέρα, 5 Ιανουαρίου'));
  it('shortDate', () =>
    expect(shortDate(new Date(2026,0,5).getTime())).toBe('5/1'));
});
