import { Injectable } from '@angular/core';

/// @brief Formats coordinates in RA and Dec
@Injectable({
  providedIn: 'root'
})
export class CoordsFormatterService {

  formatRA(ra: number): string {
    // Convert RA from degrees to hours (divide by 15 since 360° = 24h)
    // @param ra: number - RA in hours (0.0 to 24.0)
    // @return string - RA in sexagesimal format (HHh MMm SS.Ss)
    // Round to tenths of a second first, so 59.96s carries into the minutes instead of showing 60.0s.
    const tenths = Math.round(ra * 36000) % (24 * 36000);

    const hours = Math.floor(tenths / 36000);
    const minutes = Math.floor((tenths % 36000) / 600);
    const seconds = (tenths % 600) / 10;

    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toFixed(1).padStart(4, '0')}s`;
  }

  formatDec(dec: number): string {
    // Format Dec in sexagesimal format (DD° MM' SS.S")
    // @param dec: number - Dec in degrees (-90.0 to 90.0)
    // @return string - Dec in sexagesimal format (DD° MM' SS.S")
    const sign = dec >= 0 ? '+' : '-';
    // Round to tenths of an arcsecond first, so 59.96" carries into the minutes instead of showing 60.0".
    const tenths = Math.round(Math.abs(dec) * 36000);

    const degrees = Math.floor(tenths / 36000);
    const minutes = Math.floor((tenths % 36000) / 600);
    const seconds = (tenths % 600) / 10;

    return `${sign}${degrees.toString().padStart(2, '0')}° ${minutes.toString().padStart(2, '0')}' ${seconds.toFixed(1).padStart(4, '0')}"`;
  }
}
