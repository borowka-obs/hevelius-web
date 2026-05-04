import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { CatalogsService } from '../../services/catalogs.service';
import { CoordsFormatterService } from '../../services/coords-formatter.service';
import { ProjectsService } from '../../services/projects.service';
import { ProjectFormDialogComponent } from './project-form-dialog.component';

describe('ProjectFormDialogComponent', () => {
  let component: ProjectFormDialogComponent;
  let fixture: ComponentFixture<ProjectFormDialogComponent>;
  let projectsService: { createProject: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    projectsService = {
      createProject: vi.fn().mockReturnValue(of({
        project_id: 1,
        project: { project_id: 1, name: 'M31', scope_id: 2, active: true }
      }))
    };

    await TestBed.configureTestingModule({
      imports: [ProjectFormDialogComponent],
      providers: [
        { provide: ProjectsService, useValue: projectsService },
        { provide: CatalogsService, useValue: { searchObjects: vi.fn().mockReturnValue(of([])) } },
        CoordsFormatterService,
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
        { provide: MAT_DIALOG_DATA, useValue: { scopes: [{ scope_id: 2, name: 'Test' }] } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('sends empty regexps string when not provided', () => {
    component.form.patchValue({
      name: 'M31',
      scope_id: 2,
      description: 'Andromeda',
      ra: '0.7',
      decl: '41.2',
      active: true,
      regexps: null
    });

    component.save();

    expect(projectsService.createProject).toHaveBeenCalledWith({
      name: 'M31',
      scope_id: 2,
      description: 'Andromeda',
      regexps: '',
      active: true,
      ra: 0.7,
      decl: 41.2
    });
  });

  it('includes optional start_date and end_date when set', () => {
    component.form.patchValue({
      name: 'M42',
      scope_id: 2,
      ra: '1',
      decl: '10',
      active: true,
      regexps: '',
      start_date: '2026-01-10',
      end_date: '2026-12-31'
    });

    component.save();

    expect(projectsService.createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'M42',
        start_date: '2026-01-10',
        end_date: '2026-12-31'
      })
    );
  });
});
