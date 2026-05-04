import { Project, ProjectSubframe } from '../models/project';
import {
  formatIntegrationDuration,
  projectTotalCapturedSeconds,
  subframeCapturedSeconds,
  subframeProgressPercent
} from './project-integration';

describe('project-integration', () => {
  it('subframeCapturedSeconds multiplies count by exposure', () => {
    const sub: ProjectSubframe = {
      id: 1,
      project_id: 1,
      filter_id: 1,
      exposure_time: 120,
      count: 10,
      goal_count: 20,
      active: true
    };
    expect(subframeCapturedSeconds(sub)).toBe(1200);
  });

  it('projectTotalCapturedSeconds sums subframes', () => {
    const project: Project = {
      project_id: 1,
      name: 'P',
      scope_id: 1,
      active: true,
      subframes: [
        {
          id: 1,
          project_id: 1,
          filter_id: 1,
          exposure_time: 60,
          count: 2,
          goal_count: 10,
          active: true
        },
        {
          id: 2,
          project_id: 1,
          filter_id: 2,
          exposure_time: 30,
          count: 1,
          goal_count: 5,
          active: true
        }
      ]
    };
    expect(projectTotalCapturedSeconds(project)).toBe(60 * 2 + 30);
  });

  it('formatIntegrationDuration formats seconds', () => {
    expect(formatIntegrationDuration(3600)).toContain('1h');
    expect(formatIntegrationDuration(2700)).toContain('45min');
  });

  it('subframeProgressPercent uses count and goal_count', () => {
    const sub: ProjectSubframe = {
      id: 1,
      project_id: 1,
      filter_id: 1,
      exposure_time: 10,
      count: 5,
      goal_count: 10,
      active: true
    };
    expect(subframeProgressPercent(sub)).toBe(50);
    expect(subframeProgressPercent({ ...sub, goal_count: 0 })).toBeNull();
  });
});
