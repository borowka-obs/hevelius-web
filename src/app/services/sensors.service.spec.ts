import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SensorsService } from './sensors.service';
import { Hevelius } from 'src/hevelius';

describe('SensorsService', () => {
  let service: SensorsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SensorsService]
    });
    service = TestBed.inject(SensorsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch all sensors when active filter is omitted', () => {
    service.getSensors({ sort_by: 'sensor_id', sort_order: 'asc' }).subscribe(sensors => {
      expect(sensors.length).toBe(2);
    });

    const req = httpMock.expectOne(`${Hevelius.apiUrl}/sensors?sort_by=sensor_id&sort_order=asc`);
    expect(req.request.method).toBe('GET');
    req.flush({
      sensors: [
        { sensor_id: 1, name: 'S1', resx: 100, resy: 100, pixel_x: 5, pixel_y: 5, active: true },
        { sensor_id: 2, name: 'S2', resx: 100, resy: 100, pixel_x: 5, pixel_y: 5, active: false }
      ]
    });
  });

  it('should create sensor (POST)', () => {
    service.createSensor({
      name: 'New Sensor',
      resx: 1200,
      resy: 800,
      pixel_x: 4.8,
      pixel_y: 4.8,
      active: true
    }).subscribe(sensor => {
      expect(sensor.name).toBe('New Sensor');
      expect(sensor.sensor_id).toBe(9);
    });

    const req = httpMock.expectOne(`${Hevelius.apiUrl}/sensors`);
    expect(req.request.method).toBe('POST');
    req.flush({
      status: true,
      sensor_id: 9,
      sensor: {
        sensor_id: 9,
        name: 'New Sensor',
        resx: 1200,
        resy: 800,
        pixel_x: 4.8,
        pixel_y: 4.8,
        active: true
      }
    });
  });

  it('should update sensor (PATCH)', () => {
    service.updateSensor(3, { vendor: 'ZWO', active: true }).subscribe(sensor => {
      expect(sensor.sensor_id).toBe(3);
      expect(sensor.vendor).toBe('ZWO');
    });

    const req = httpMock.expectOne(`${Hevelius.apiUrl}/sensors/3`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ vendor: 'ZWO', active: true });
    req.flush({
      status: true,
      sensor: {
        sensor_id: 3,
        name: 'ASI',
        resx: 2000,
        resy: 1500,
        pixel_x: 3.8,
        pixel_y: 3.8,
        vendor: 'ZWO',
        active: true
      }
    });
  });
});
