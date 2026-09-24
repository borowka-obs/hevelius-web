import { currentNightDate } from './night-date';

describe('currentNightDate', () => {
  it('returns today from local noon onwards', () => {
    expect(currentNightDate(new Date(2026, 8, 25, 12, 0))).toEqual(new Date(2026, 8, 25));
    expect(currentNightDate(new Date(2026, 8, 25, 23, 30))).toEqual(new Date(2026, 8, 25));
  });

  it('returns yesterday before local noon, while last night is still in progress', () => {
    expect(currentNightDate(new Date(2026, 8, 25, 1, 15))).toEqual(new Date(2026, 8, 24));
    expect(currentNightDate(new Date(2026, 8, 25, 11, 59))).toEqual(new Date(2026, 8, 24));
  });

  it('crosses month and year boundaries', () => {
    expect(currentNightDate(new Date(2026, 0, 1, 3, 0))).toEqual(new Date(2025, 11, 31));
  });
});
