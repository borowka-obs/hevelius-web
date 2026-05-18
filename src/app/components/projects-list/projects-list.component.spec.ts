import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ProjectsListComponent } from './projects-list.component';
import { ProjectsService } from '../../services/projects.service';
import { Telescope, TelescopeService } from '../../services/telescope.service';
import { TopBarService } from '../../services/top-bar.service';
import { Project } from '../../models/project';

function minimalTelescope(partial: Partial<Telescope> & Pick<Telescope, 'scope_id' | 'name' | 'active'>): Telescope {
  return {
    descr: '',
    min_dec: 0,
    max_dec: 90,
    focal: null,
    aperture: null,
    lon: null,
    lat: null,
    alt: null,
    sensor: null,
    ...partial
  };
}

describe('ProjectsListComponent', () => {
  let fixture: ComponentFixture<ProjectsListComponent>;
  let component: ProjectsListComponent;
  let projectsService: { getProjects: ReturnType<typeof vi.fn> };
  let telescopeService: { getTelescopes: ReturnType<typeof vi.fn> };

  const mockProjects: Project[] = [
    {
      project_id: 1,
      name: 'Alpha',
      scope_id: 1,
      active: true,
      total_integration_time: 3600,
      publications: 'https://www.astrobin.com/x/1 https://facebook.com/p/1',
      last_updated: '2026-05-01T12:00:00.000Z'
    },
    {
      project_id: 2,
      name: 'Beta',
      scope_id: 2,
      active: false,
      total_integration_time: 0,
      last_updated: '2026-04-01T08:00:00.000Z'
    }
  ];

  beforeEach(async () => {
    projectsService = {
      getProjects: vi.fn().mockReturnValue(
        of({
          projects: mockProjects,
          total: 2,
          page: 1,
          per_page: 500,
          pages: 1
        })
      ),
    };
    telescopeService = {
      getTelescopes: vi.fn().mockReturnValue(
        of([
          minimalTelescope({ scope_id: 1, name: 'T-One', active: true }),
          minimalTelescope({ scope_id: 2, name: 'T-Two', active: false })
        ])
      )
    };

    await TestBed.configureTestingModule({
      imports: [ProjectsListComponent, NoopAnimationsModule],
      providers: [
        TopBarService,
        provideRouter([]),
        { provide: ProjectsService, useValue: projectsService },
        { provide: TelescopeService, useValue: telescopeService },
        { provide: MatDialog, useValue: { open: vi.fn().mockReturnValue({ afterClosed: () => of(false) }) } },
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProjectsListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('requests default server sort last_updated desc on load', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(projectsService.getProjects).toHaveBeenCalledWith(
      expect.objectContaining({
        per_page: 500,
        sort_by: 'last_updated',
        sort_order: 'desc'
      })
    );
  });

  it('embedded mode loads projects for fixed scope_id', async () => {
    fixture.componentRef.setInput('embedded', true);
    fixture.componentRef.setInput('scopeId', 1);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(projectsService.getProjects).toHaveBeenCalledWith(
      expect.objectContaining({
        per_page: 500,
        scope_id: 1
      })
    );
  });

  it('filters to active projects by default', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.dataSource.data.length).toBe(1);
    expect(component.dataSource.data[0].project_id).toBe(1);
  });

  it('shows integration from total_integration_time and scope name', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('1h');
    expect(text).toContain('T-One');
    const scopeLink = fixture.nativeElement.querySelector('a.scope-link') as HTMLAnchorElement | null;
    expect(scopeLink?.textContent?.trim()).toBe('T-One');
  });

  it('openProject navigates to project detail', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const router = TestBed.inject(Router);
    const spy = vi.spyOn(router, 'navigate');
    component.openProject(mockProjects[0]);
    expect(spy).toHaveBeenCalledWith(['/projects', 1]);
  });

  it('reloads with sort_by name when sorting by name', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    projectsService.getProjects.mockClear();
    component.onSortChange({ active: 'name', direction: 'asc' });
    await fixture.whenStable();
    expect(projectsService.getProjects).toHaveBeenCalledWith(
      expect.objectContaining({
        sort_by: 'name',
        sort_order: 'asc'
      })
    );
  });

  it('does not show start or end date columns', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const headers = fixture.nativeElement.textContent as string;
    expect(headers).not.toMatch(/\bStart\b/);
    expect(headers).not.toMatch(/\bEnd\b/);
    expect(headers).toContain('Publications');
  });

  it('shows publication icons in publications column', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const icons = fixture.nativeElement.querySelectorAll('a.publication-icon-link');
    expect(icons.length).toBeGreaterThanOrEqual(2);
  });

  it('formatCalendarDate returns dash for empty', () => {
    expect(component.formatCalendarDate(null)).toBe('—');
    expect(component.formatCalendarDate('')).toBe('—');
    expect(component.formatCalendarDate('2026-03-20')).toBe('2026-03-20');
  });

  it('formatDescription returns dash for empty and trims text', () => {
    expect(component.formatDescription(null)).toBe('—');
    expect(component.formatDescription('')).toBe('—');
    expect(component.formatDescription('   ')).toBe('—');
    expect(component.formatDescription('  Notes  ')).toBe('Notes');
  });

  it('projectTotalIntegrationLabel uses API field', () => {
    expect(component.projectTotalIntegrationLabel(mockProjects[0])).toContain('h');
    expect(component.projectTotalIntegrationLabel({ ...mockProjects[0], total_integration_time: null })).toBe('—');
  });
});
