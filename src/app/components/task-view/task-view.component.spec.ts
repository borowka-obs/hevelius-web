import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskViewComponent } from './task-view.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TaskService } from '../../services/task.service';
import { LoginService } from '../../services/login.service';
import { TelescopeService } from '../../services/telescope.service';
import { CatalogsService } from '../../services/catalogs.service';
import { ProjectsService } from '../../services/projects.service';
import { Overlay } from '@angular/cdk/overlay';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

describe('TaskViewComponent', () => {
  let component: TaskViewComponent;
  let fixture: ComponentFixture<TaskViewComponent>;
  let catalogsService: { searchObjects: ReturnType<typeof vi.fn> };

  const mockCatalogObject = {
    object_id: 1,
    name: 'NGC7000',
    ra: 315.7,
    decl: 44.3,
    descr: 'North America Nebula',
    comment: '',
    type: 'Nebula',
    epoch: 'J2000',
    const: 'Cyg',
    magn: 4,
    x: 0,
    y: 0,
    altname: '',
    distance: 0,
    catalog: 'NGC'
  };

  const mockTelescope = {
    scope_id: 1,
    name: 'Test Telescope',
    active: true
  };

  const mockScopeDetail = {
    scope_id: 1,
    name: 'Test Telescope',
    descr: '',
    min_dec: -90,
    max_dec: 90,
    focal: null as number | null,
    aperture: null as number | null,
    lon: null as number | null,
    lat: null as number | null,
    alt: null as number | null,
    sensor: null,
    active: true,
    filters: [{ filter_id: 1, short_name: 'L', full_name: 'Lum', active: true }],
    default_rotation: null
  };

  beforeEach(async () => {
    console.log('Setting up test environment');
    const catalogsServiceSpy = {
      searchObjects: vi.fn().mockReturnValue(of([mockCatalogObject])),
    };

    await TestBed.configureTestingModule({
      imports: [
        TaskViewComponent,
        ReactiveFormsModule,
        NoopAnimationsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatDialogModule
      ],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: { mode: 'add' } },
        { provide: MatSnackBar, useValue: { open: () => {} } },
        {
          provide: TaskService,
          useValue: {
            addTask: vi.fn().mockReturnValue(of({ status: true, task_id: 1 })),
            updateTask: vi.fn().mockReturnValue(of({ status: true })),
            getTask: vi.fn().mockReturnValue(of({ status: true, task: { task_id: 1, user_id: 1, scope_id: 1, object: 'X', ra: 1, decl: 1, exposure: 1, state: 1, aavso_id: '' } }))
          }
        },
        { provide: LoginService, useValue: { getUser: () => ({ user_id: 1 }), getAuthHeaders: () => ({}) } },
        {
          provide: TelescopeService,
          useValue: {
            getTelescopes: () => of([mockTelescope]),
            getTelescope: () => of(mockScopeDetail)
          }
        },
        {
          provide: ProjectsService,
          useValue: {
            getProjects: () =>
              of({ projects: [], total: 0, page: 1, per_page: 500, pages: 0 }),
            addTaskToProject: vi.fn().mockReturnValue(of({ status: true })),
            removeTaskFromProject: vi.fn().mockReturnValue(of({ status: true }))
          }
        },
        { provide: CatalogsService, useValue: catalogsServiceSpy },
        Overlay
      ]
    }).compileComponents();

    console.log('Creating component');
    fixture = TestBed.createComponent(TaskViewComponent);
    component = fixture.componentInstance;
    catalogsService = TestBed.inject(CatalogsService) as unknown as { searchObjects: ReturnType<typeof vi.fn> };

    console.log('Detecting changes');
    fixture.detectChanges();
    await fixture.whenStable();

    console.log('Component initialized');
  });

  afterEach(() => {
    try {
      if (component?.taskForm) {
        component.taskForm.reset();
      }
      component?.ngOnDestroy();
      fixture?.destroy();
    } catch (e) {
      console.error('Error during cleanup:', e);
    }
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.taskForm).toBeDefined();
  });

  describe('Object Search', () => {
    beforeEach(() => {
      catalogsService.searchObjects.mockClear();
    });

    it('should not search when input is less than 3 characters', async () => {
      component.onObjectSearch('ng');
      await new Promise((r) => setTimeout(r, 350));
      expect(catalogsService.searchObjects).not.toHaveBeenCalled();
    });

    it('should search when input is 3 or more characters', async () => {
      component.onObjectSearch('ngc');
      await new Promise((r) => setTimeout(r, 350));
      expect(catalogsService.searchObjects).toHaveBeenCalledWith('ngc');
    });

    it('should update form values when object is selected', () => {
      component.selectObject(mockCatalogObject);
      const formValue = component.taskForm.value;
      expect(formValue.object).toBe('NGC7000');
      expect(formValue.ra).toBe(315.7);
      expect(formValue.decl).toBe(44.3);
    });

    it('should debounce search requests', async () => {
      component.onObjectSearch('n');
      component.onObjectSearch('ng');
      component.onObjectSearch('ngc');
      component.onObjectSearch('ngc7');

      await new Promise((r) => setTimeout(r, 100));
      expect(catalogsService.searchObjects).not.toHaveBeenCalled();

      await new Promise((r) => setTimeout(r, 250));
      expect(catalogsService.searchObjects).toHaveBeenCalledWith('ngc7');
      expect(catalogsService.searchObjects).toHaveBeenCalledTimes(1);
    });

    it('should not make duplicate searches for the same term', async () => {
      component.onObjectSearch('ngc7');
      await new Promise((r) => setTimeout(r, 350));
      component.onObjectSearch('ngc7');
      await new Promise((r) => setTimeout(r, 350));

      expect(catalogsService.searchObjects).toHaveBeenCalledTimes(1);
    });
  });
});