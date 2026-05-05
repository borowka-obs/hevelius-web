import { parseDecDegrees, parseLongitudeDegrees, parseRAHours } from './coord-parse';

describe('coord-parse', () => {
  describe('parseRAHours', () => {
    it('parses decimal hours', () => {
      expect(parseRAHours('0.712')).toBeCloseTo(0.712, 6);
      expect(parseRAHours('12')).toBe(12);
    });

    it('parses colon sexagesimal', () => {
      expect(parseRAHours('12:30:00')).toBeCloseTo(12.5, 6);
      expect(parseRAHours('00:42:43.2')).toBeCloseTo(0.711999, 4);
    });

    it('parses h/m/s suffix form', () => {
      expect(parseRAHours('02h30m00s')).toBeCloseTo(2.5, 6);
    });

    it('rejects out-of-range RA', () => {
      expect(parseRAHours('25')).toBeNull();
      expect(parseRAHours('')).toBeNull();
    });
  });

  describe('parseDecDegrees', () => {
    it('parses decimal degrees with sign', () => {
      expect(parseDecDegrees('+41.27')).toBeCloseTo(41.27, 4);
      expect(parseDecDegrees('-12.5')).toBeCloseTo(-12.5, 4);
    });

    it('parses sexagesimal with sign', () => {
      expect(parseDecDegrees('+41:16:12')).toBeCloseTo(41.27, 2);
    });

    it('rejects out-of-range Dec', () => {
      expect(parseDecDegrees('91')).toBeNull();
      expect(parseDecDegrees('')).toBeNull();
    });
  });

  describe('parseLongitudeDegrees', () => {
    it('parses decimal degrees', () => {
      expect(parseLongitudeDegrees('18.517')).toBeCloseTo(18.517, 4);
      expect(parseLongitudeDegrees('-122.4')).toBeCloseTo(-122.4, 4);
    });

    it('parses sexagesimal', () => {
      expect(parseLongitudeDegrees('18°31\'01.2"')).toBeCloseTo(18.517, 3);
    });

    it('rejects out-of-range longitude', () => {
      expect(parseLongitudeDegrees('181')).toBeNull();
      expect(parseLongitudeDegrees('')).toBeNull();
    });
  });
});
