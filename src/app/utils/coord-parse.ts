/**
 * Parse RA (decimal hours 0–24) and Dec (decimal degrees −90…90) from user input:
 * plain floats or sexagesimal (H:M:S, Hh Mm Ss, D°M′S″, etc.).
 */

function finiteInRange(v: number, min: number, max: number): number | null {
  if (!Number.isFinite(v)) {
    return null;
  }
  if (v < min || v > max) {
    return null;
  }
  return v;
}

/** Normalize HMS-style separators to colons for splitting. */
function normalizeRaSeparators(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/[hH]/g, ':')
    .replace(/[mM]/g, ':')
    .replace(/[sS]/g, '');
}

function parseHmsToUnit(h: number, m: number, sec: number, maxUnit: number): number | null {
  if (![h, m, sec].every(Number.isFinite)) {
    return null;
  }
  if (m < 0 || m >= 60 || sec < 0 || sec >= 60) {
    return null;
  }
  const v = h + m / 60 + sec / 3600;
  return finiteInRange(v, 0, maxUnit);
}

/**
 * Parse right ascension to decimal hours (0–24).
 */
export function parseRAHours(raw: string): number | null {
  const s = raw.trim();
  if (!s) {
    return null;
  }

  const strictDec = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
  if (strictDec.test(s)) {
    const v = parseFloat(s);
    return finiteInRange(v, 0, 24);
  }

  const norm = normalizeRaSeparators(s).replace(/\s+/g, ':');
  const parts = norm
    .split(':')
    .map(p => p.trim())
    .filter(p => p.length > 0);
  if (parts.length === 0) {
    return null;
  }
  const h = parseFloat(parts[0]);
  const m = parts.length >= 2 ? parseFloat(parts[1]) : 0;
  const sec = parts.length >= 3 ? parseFloat(parts[2]) : 0;
  if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(sec)) {
    return null;
  }
  return parseHmsToUnit(h, m, sec, 24);
}

function normalizeDecSeparators(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/°|deg/gi, ':')
    .replace(/['′]/g, ':')
    .replace(/["″]/g, '');
}

/**
 * Parse declination to decimal degrees (−90…90).
 */
export function parseDecDegrees(raw: string): number | null {
  let s = raw.trim();
  if (!s) {
    return null;
  }

  let sign = 1;
  if (s[0] === '+' || s[0] === '-') {
    sign = s[0] === '-' ? -1 : 1;
    s = s.slice(1).trim();
  }

  const strictDec = /^(?:\d+(?:\.\d*)?|\.\d+)$/;
  if (strictDec.test(s)) {
    const v = sign * parseFloat(s);
    return finiteInRange(v, -90, 90);
  }

  const norm = normalizeDecSeparators(s).replace(/\s+/g, ':');
  const parts = norm
    .split(':')
    .map(p => p.trim())
    .filter(p => p.length > 0);
  if (parts.length === 0) {
    return null;
  }
  const deg = parseFloat(parts[0]);
  const m = parts.length >= 2 ? parseFloat(parts[1]) : 0;
  const sec = parts.length >= 3 ? parseFloat(parts[2]) : 0;
  if (!Number.isFinite(deg) || !Number.isFinite(m) || !Number.isFinite(sec)) {
    return null;
  }
  if (m < 0 || m >= 60 || sec < 0 || sec >= 60) {
    return null;
  }
  const v = sign * (Math.abs(deg) + m / 60 + sec / 3600);
  return finiteInRange(v, -90, 90);
}
