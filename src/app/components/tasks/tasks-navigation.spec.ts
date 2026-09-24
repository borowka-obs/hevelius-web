import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule } from '@angular/material/dialog';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { TasksComponent } from './tasks.component';
import { Task } from '../../models/task';

const TASK: Task = {
  task_id: 4242,
  user_id: 7,
  aavso_id: '',
  object: 'M31',
  ra: 0.712,
  decl: 41.27,
  exposure: 300,
  state: 1,
  scope_id: 3
};

/**
 * Navigation to the task detail page, asserted against the *rendered* table.
 *
 * A column can be defined in the template and still never appear, because
 * `displayedColumns` decides what renders — which is exactly how the first
 * attempt at this link ended up invisible.
 */
describe('TasksComponent navigation to task detail', () => {
  let fixture: ComponentFixture<TasksComponent>;
  let component: TasksComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatTableModule, MatDialogModule, NoopAnimationsModule, TasksComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(TasksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    showTasks([TASK]);
  });

  /** Push rows through the data source the way a real API response does. */
  function showTasks(tasks: Task[]): void {
    component.dataSource.parseTasks({ tasks, total: tasks.length, page: 1, per_page: 50, pages: 1 });
    fixture.detectChanges();
  }

  function detailLinks(): HTMLAnchorElement[] {
    const anchors = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a[href]')
    ) as HTMLAnchorElement[];
    return anchors.filter(a => a.getAttribute('href') === '/tasks/4242');
  }

  it('renders at least one link to the task detail page', () => {
    expect(detailLinks().length).toBeGreaterThan(0);
  });

  it('links the object name, which every column layout shows', () => {
    const objectLink = detailLinks().find(a => a.textContent?.trim() === 'M31');
    expect(objectLink).toBeDefined();
  });

  it('keeps the detail link reachable on the mobile column layout', () => {
    component.isMobile = true;
    fixture.detectChanges();
    // The mobile layout drops several columns; the link must survive that.
    expect(component.displayedColumns).toContain('object');
    expect(detailLinks().length).toBeGreaterThan(0);
  });

  it('offers an explicit details button as well as the linked name', () => {
    const button = detailLinks().find(a => a.getAttribute('aria-label') === 'Task details');
    expect(button).toBeDefined();
  });

  it('falls back to the task id when the object has no name', () => {
    showTasks([{ ...TASK, object: '' }]);
    const link = detailLinks().find(a => a.textContent?.trim() === 'Task 4242');
    expect(link).toBeDefined();
  });
});
