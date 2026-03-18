import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TelescopeListComponent } from './telescope-list.component';
import { TelescopeService } from '../../services/telescope.service';
import { TopBarService } from '../../services/top-bar.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

describe('TelescopeListComponent', () => {
  let component: TelescopeListComponent;
  let fixture: ComponentFixture<TelescopeListComponent>;
  let telescopeService: TelescopeService;

  const mockTelescopes = [
    {
      scope_id: 1,
      name: 'Test Telescope 1',
      descr: 'Test Description 1',
      min_dec: -30,
      max_dec: 90,
      focal: 1000,
      aperture: 200,
      lon: 0,
      lat: 0,
      alt: 0,
      sensor: {
        sensor_id: 1,
        name: 'Test Sensor 1',
        resx: 1000,
        resy: 1000,
        pixel_x: 5,
        pixel_y: 5,
        bits: 16,
        width: 20,
        height: 20
      },
      active: true
    },
    {
      scope_id: 2,
      name: 'Test Telescope 2',
      descr: 'Test Description 2',
      min_dec: -20,
      max_dec: 90,
      focal: null,
      aperture: null,
      lon: null,
      lat: null,
      alt: null,
      sensor: null,
      active: false
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        MatTableModule,
        MatIconModule,
        NoopAnimationsModule,
        TelescopeListComponent
      ],
      providers: [TelescopeService, TopBarService, provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TelescopeListComponent);
    component = fixture.componentInstance;
    telescopeService = TestBed.inject(TelescopeService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display only active telescopes by default', async () => {
    vi.spyOn(telescopeService, 'getTelescopes').mockReturnValue(of(mockTelescopes));

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.dataSource.data).toEqual([mockTelescopes[0]]);

    const tableRows = fixture.nativeElement.querySelectorAll('tr.mat-mdc-row');
    expect(tableRows.length).toBe(1);

    const firstRowCells = tableRows[0].querySelectorAll('td.mat-mdc-cell');
    expect(firstRowCells[0].textContent.trim()).toBe('1');
    expect(firstRowCells[2].textContent.trim()).toBe('Test Description 1');
    expect(firstRowCells[7].textContent.trim()).toBe('Test Sensor 1');
    expect(firstRowCells[8].querySelector('mat-icon').textContent.trim()).toBe('check_circle');
  });

  it('should have correct column definitions', () => {
    expect(component.displayedColumns).toEqual([
      'scope_id',
      'name',
      'descr',
      'focal',
      'aperture',
      'min_dec',
      'max_dec',
      'sensor',
      'active',
      'actions'
    ]);
  });
});
