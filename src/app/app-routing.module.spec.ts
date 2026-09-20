import { routes } from './app-routing.module';

describe('app routes', () => {
  it('redirects empty authenticated path to projects', () => {
    const layout = routes.find(r => r.path === '');
    const children = layout?.children ?? [];
    const defaultChild = children.find(c => c.path === '');
    expect(defaultChild?.redirectTo).toBe('projects');
    expect(defaultChild?.pathMatch).toBe('full');
  });

  it('redirects unknown paths to /projects', () => {
    const fallback = routes.find(r => r.path === '**');
    expect(fallback?.redirectTo).toBe('/projects');
  });

  it('registers projects and tasks child routes', () => {
    const layout = routes.find(r => r.path === '');
    const paths = (layout?.children ?? []).map(c => c.path);
    expect(paths).toContain('projects');
    expect(paths).toContain('tasks');
  });

  it('registers detail routes for a single task and project', () => {
    const layout = routes.find(r => r.path === '');
    const paths = (layout?.children ?? []).map(c => c.path);
    expect(paths).toContain('tasks/:id');
    expect(paths).toContain('projects/:id');
  });

  it('keeps the tasks list route ahead of the task detail route', () => {
    // 'tasks' must match before 'tasks/:id', or /tasks would resolve to a
    // detail page for a task with no id.
    const children = routes.find(r => r.path === '')?.children ?? [];
    const listIndex = children.findIndex(c => c.path === 'tasks');
    const detailIndex = children.findIndex(c => c.path === 'tasks/:id');
    expect(listIndex).toBeLessThan(detailIndex);
  });
});
