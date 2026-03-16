/**
 * Sensor (camera) as returned by GET /api/sensors.
 * See openapi.yaml in api/.
 */
export interface Sensor {
  sensor_id: number;
  name: string;
  resx: number;
  resy: number;
  pixel_x: number;
  pixel_y: number;
  bits?: number;
  width?: number;
  height?: number;
  vendor?: string;
  url?: string;
  active: boolean;
}

export interface SensorsListParams {
  /** When set, filter by active status. Omit to return all sensors. */
  active?: boolean;
  sort_by?: 'pixel_x' | 'pixel_y' | 'name' | 'vendor' | 'width' | 'height' | 'resx' | 'resy' | 'sensor_id';
  sort_order?: 'asc' | 'desc';
}
