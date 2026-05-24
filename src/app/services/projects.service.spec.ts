import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProjectsService } from './projects.service';
import { Hevelius } from 'src/hevelius';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProjectsService]
    });
    service = TestBed.inject(ProjectsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch projects with params', () => {
    service.getProjects({ page: 2, per_page: 25, scope_id: 7 }).subscribe(response => {
      expect(response.projects.length).toBe(1);
      expect(response.page).toBe(2);
    });

    const req = httpMock.expectOne(`${Hevelius.apiUrl}/projects?page=2&per_page=25&scope_id=7`);
    expect(req.request.method).toBe('GET');
    req.flush({
      projects: [{ project_id: 1, name: 'M31', scope_id: 7, active: true }],
      total: 1,
      page: 2,
      per_page: 25,
      pages: 1
    });
  });

  it('should pass sort_by and sort_order when provided', () => {
    service.getProjects({ sort_by: 'last_updated', sort_order: 'desc', per_page: 100 }).subscribe();
    const req = httpMock.expectOne(r => r.url.startsWith(`${Hevelius.apiUrl}/projects`));
    expect(req.request.params.get('sort_by')).toBe('last_updated');
    expect(req.request.params.get('sort_order')).toBe('desc');
    expect(req.request.params.get('per_page')).toBe('100');
    req.flush({ projects: [], total: 0, page: 1, per_page: 100, pages: 0 });
  });

  it('should create project with regexps', () => {
    service.createProject({ name: 'M42', scope_id: 3, active: true, regexps: 'M.* NGC.*' }).subscribe(result => {
      expect(result.project_id).toBe(11);
      expect(result.project.name).toBe('M42');
    });

    const req = httpMock.expectOne(`${Hevelius.apiUrl}/projects`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'M42', scope_id: 3, active: true, regexps: 'M.* NGC.*' });
    req.flush({
      status: true,
      project_id: 11,
      project: { project_id: 11, name: 'M42', scope_id: 3, active: true }
    });
  });

  it('should add task to project', () => {
    service.addTaskToProject(5, 99).subscribe(res => {
      expect(res.status).toBe(true);
    });
    const req = httpMock.expectOne(`${Hevelius.apiUrl}/projects/5/tasks/99`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ status: true });
  });

  it('should remove task from project', () => {
    service.removeTaskFromProject(5, 99).subscribe(res => {
      expect(res.status).toBe(true);
    });
    const req = httpMock.expectOne(`${Hevelius.apiUrl}/projects/5/tasks/99`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ status: true });
  });

  it('should delete a project', () => {
    let completed = false;
    service.deleteProject(7).subscribe(() => { completed = true; });
    const req = httpMock.expectOne(`${Hevelius.apiUrl}/projects/7`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ status: true, msg: 'Project 7 deleted' });
    expect(completed).toBe(true);
  });

  it('should add subframe and map subframe_id', () => {
    service.addSubframe(11, { filter_id: 2, exposure_time: 120, count: 0 }).subscribe(result => {
      expect(result.subframe_id).toBe(44);
    });

    const req = httpMock.expectOne(`${Hevelius.apiUrl}/projects/11/subframes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ filter_id: 2, exposure_time: 120, count: 0 });
    req.flush({ status: true, subframe_id: 44 });
  });
});
