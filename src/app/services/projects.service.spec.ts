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

  it('should create project', () => {
    service.createProject({ name: 'M42', scope_id: 3, active: true }).subscribe(result => {
      expect(result.project_id).toBe(11);
      expect(result.project.name).toBe('M42');
    });

    const req = httpMock.expectOne(`${Hevelius.apiUrl}/projects`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'M42', scope_id: 3, active: true });
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

  it('should add subframe and map subframe_id', () => {
    service.addSubframe(11, { filter_id: 2, exposure_time: 120 }).subscribe(result => {
      expect(result.subframe_id).toBe(44);
    });

    const req = httpMock.expectOne(`${Hevelius.apiUrl}/projects/11/subframes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ filter_id: 2, exposure_time: 120 });
    req.flush({ status: true, subframe_id: 44 });
  });
});
