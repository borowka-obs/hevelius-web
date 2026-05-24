import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { TelescopeService } from '../../services/telescope.service';
import { ProjectsService } from '../../services/projects.service';
import { CoordsFormatterService } from '../../services/coords-formatter.service';
import { ProjectEditDialogComponent } from './project-edit-dialog.component';

const DEFAULT_DATA = {
  projectId: 42,
  initialScopeId: 2,
  initialDescription: null,
  initialRa: 0.712,
  initialDecl: 41.27,
  initialRegexps: '',
  initialActive: true,
  initialStartDate: null,
  initialEndDate: null,
  initialPublications: null
};

describe('ProjectEditDialogComponent', () => {
  let component: ProjectEditDialogComponent;
  let fixture: ComponentFixture<ProjectEditDialogComponent>;
  let projectsService: { updateProject: ReturnType<typeof vi.fn>; deleteProject: ReturnType<typeof vi.fn> };
  let dialogRefSpy: { close: ReturnType<typeof vi.fn> };
  let snackBarSpy: { open: ReturnType<typeof vi.fn> };
  let dialogOpenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    projectsService = {
      updateProject: vi.fn().mockReturnValue(of({ project_id: 42, name: 'M31', scope_id: 2, active: true })),
      deleteProject: vi.fn().mockReturnValue(of(undefined))
    };
    dialogRefSpy = { close: vi.fn() };
    snackBarSpy = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ProjectEditDialogComponent],
      providers: [
        { provide: ProjectsService, useValue: projectsService },
        { provide: TelescopeService, useValue: { getTelescopes: vi.fn().mockReturnValue(of([])), getTelescope: vi.fn().mockReturnValue(of(null)) } },
        CoordsFormatterService,
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MAT_DIALOG_DATA, useValue: DEFAULT_DATA }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectEditDialogComponent);
    component = fixture.componentInstance;
    // Spy on the injected MatDialog so we intercept open() without needing DI-level override.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dialogOpenSpy = vi.spyOn((component as any).dialog, 'open');
    fixture.detectChanges();
  });

  it('opens a confirmation dialog when deleteProject is called', () => {
    dialogOpenSpy.mockReturnValue({ afterClosed: () => of(false) });
    component.deleteProject();
    expect(dialogOpenSpy).toHaveBeenCalledOnce();
  });

  it('does not delete when confirmation is cancelled', () => {
    dialogOpenSpy.mockReturnValue({ afterClosed: () => of(false) });
    component.deleteProject();
    expect(projectsService.deleteProject).not.toHaveBeenCalled();
  });

  it('does not delete when confirmation dialog is dismissed without a value', () => {
    dialogOpenSpy.mockReturnValue({ afterClosed: () => of(undefined) });
    component.deleteProject();
    expect(projectsService.deleteProject).not.toHaveBeenCalled();
  });

  it('calls deleteProject service and closes with "deleted" on confirmation', () => {
    dialogOpenSpy.mockReturnValue({ afterClosed: () => of(true) });
    component.deleteProject();
    expect(projectsService.deleteProject).toHaveBeenCalledWith(42);
    expect(dialogRefSpy.close).toHaveBeenCalledWith('deleted');
    expect(snackBarSpy.open).toHaveBeenCalledWith('Project deleted', 'Close', { duration: 3000 });
  });

  it('shows error snackbar when delete fails', () => {
    dialogOpenSpy.mockReturnValue({ afterClosed: () => of(true) });
    projectsService.deleteProject.mockReturnValue(throwError(() => ({ error: { msg: 'Delete failed' } })));
    component.deleteProject();
    expect(snackBarSpy.open).toHaveBeenCalledWith('Delete failed', 'Close', { duration: 5000 });
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('save calls updateProject with correct payload', () => {
    component.form.patchValue({ scope_id: 2, ra: '0.712', decl: '41.27', active: true, regexps: '', start_date: '', end_date: '', publications: '' });
    component.save();
    expect(projectsService.updateProject).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ scope_id: 2, ra: 0.712, decl: 41.27, active: true })
    );
  });

  it('save includes description in the update payload', () => {
    component.form.patchValue({ scope_id: 2, ra: '0.712', decl: '41.27', active: true, regexps: '', description: 'A galaxy project', start_date: '', end_date: '', publications: '' });
    component.save();
    expect(projectsService.updateProject).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ description: 'A galaxy project' })
    );
  });

  it('pre-fills description from dialog data', () => {
    expect(component.form.get('description')?.value).toBe('');
  });

  it('cancel closes the dialog with false', () => {
    component.cancel();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(false);
  });
});
