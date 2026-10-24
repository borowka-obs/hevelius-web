import { CoordsFormatterService } from './coords-formatter.service';

describe('CoordsFormatterService', () => {
  const service = new CoordsFormatterService();

  describe('formatDec', () => {
    it('formats positive and negative declinations', () => {
      expect(service.formatDec(41.26875)).toBe('+41° 16\' 07.5"');
      expect(service.formatDec(-29.0)).toBe('-29° 00\' 00.0"');
    });

    it('carries rounded seconds into minutes (IC 2118)', () => {
      expect(service.formatDec(-6.78333)).toBe('-06° 47\' 00.0"');
    });

    it('carries rounded minutes into degrees', () => {
      expect(service.formatDec(9.999999)).toBe('+10° 00\' 00.0"');
    });
  });

  describe('formatRA', () => {
    it('formats RA in hours', () => {
      expect(service.formatRA(5.5)).toBe('05h 30m 00.0s');
    });

    it('carries rounded seconds into minutes', () => {
      expect(service.formatRA(5.11666666)).toBe('05h 07m 00.0s');
    });

    it('wraps 23h59m59.99s to 00h', () => {
      expect(service.formatRA(23.9999999)).toBe('00h 00m 00.0s');
    });
  });
});
