import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TelescopeListComponent } from './telescope-list.component';
import { TelescopeService } from '../../services/telescope.service';
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
      providers: [TelescopeService]
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

  it('should display telescopes in the table', async () => {
    vi.spyOn(telescopeService, 'getTelescopes').mockReturnValue(of(mockTelescopes));

    // Initial change detection
    fixture.detectChanges();
    await fixture.whenStable();

    // Verify data is loaded
    expect(component.dataSource.data).toEqual(mockTelescopes);

    // Update view
    fixture.detectChanges();

    // Find the table
    const table = fixture.nativeElement.querySelector('table.mat-mdc-table');
    expect(table).toBeTruthy();

    // Find the rows using MDC class names
    const tableRows = fixture.nativeElement.querySelectorAll('tr.mat-mdc-row');

    // Verify row count
    expect(tableRows.length).toBe(2);

    // Only proceed with cell checks if we found the rows
    if (tableRows.length > 0) {
      const firstRowCells = tableRows[0].querySelectorAll('td.mat-mdc-cell');

      expect(firstRowCells[0].textContent.trim()).toBe('Test Telescope 1');
      expect(firstRowCells[1].textContent.trim()).toBe('Test Description 1');
      expect(firstRowCells[2].textContent.trim()).toBe('1000');
      expect(firstRowCells[3].textContent.trim()).toBe('200');
      expect(firstRowCells[4].textContent.trim()).toBe('-30');
      expect(firstRowCells[5].textContent.trim()).toBe('90');
      expect(firstRowCells[6].textContent.trim()).toBe('Test Sensor 1');
      expect(firstRowCells[7].querySelector('mat-icon').textContent.trim()).toBe('check_circle');

      const secondRowCells = tableRows[1].querySelectorAll('td.mat-mdc-cell');
      expect(secondRowCells[0].textContent.trim()).toBe('Test Telescope 2');
      expect(secondRowCells[1].textContent.trim()).toBe('Test Description 2');
      expect(secondRowCells[2].textContent.trim()).toBe('-');
      expect(secondRowCells[3].textContent.trim()).toBe('-');
      expect(secondRowCells[4].textContent.trim()).toBe('-20');
      expect(secondRowCells[5].textContent.trim()).toBe('90');
      expect(secondRowCells[6].textContent.trim()).toBe('-');
      expect(secondRowCells[7].querySelector('mat-icon').textContent.trim()).toBe('cancel');
    }
  });

  it('should have correct column definitions', () => {
    expect(component.displayedColumns).toEqual([
      'name',
      'descr',
      'focal',
      'aperture',
      'min_dec',
      'max_dec',
      'sensor',
      'active'
    ]);
  });
});