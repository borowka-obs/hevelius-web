import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { NightPlanComponent } from './night-plan.component';
import { NightPlanService } from '../../services/night-plan.service';
import { TelescopeService, Telescope } from '../../services/telescope.service';
import { UserService, UserPreferences } from '../../services/user.service';
import { CoordsFormatterService } from '../../services/coords-formatter.service';
import { NightPlanResponse } from '../../models/night-plan';

function makeTelescope(scopeId: number, name: string, active = true): Telescope {
  return {
    scope_id: scopeId,
    name,
    descr: '',
    min_dec: -90,
    max_dec: 90,
    focal: null,
    aperture: null,
    lon: null,
    lat: null,
    alt: null,
    sensor: null,
    active,
    default_rotation: null
  };
}

const PLAN: NightPlanResponse = {
  status: true,
  scope_id: 7,
  scope_name: 'Scope 7',
  date: '2026-08-06',
  night_start: '2026-08-06 20:11:00',
  night_end: '2026-08-07 03:02:00',
  moon_phase: 0.42,
  items: [
    {
      kind: 'task',
      task_id: 1,
      object: 'M31',
      ra: 0.712,
      decl: 41.27,
      exposure: 300,
      state: 1,
      max_altitude_deg: 62.3,
      best_time: '2026-08-07 01:20:00',
      moon_separation_deg: 88.1
    },
    {
      kind: 'project',
      project_id: 4,
      object: 'Veil Nebula',
      ra: 20.85,
      decl: 31.0,
      max_altitude_deg: 71.0,
      best_time: '2026-08-07 00:05:00',
      moon_separation_deg: 61.4
    }
  ],
  excluded: [
    {
      kind: 'task',
      task_id: 9,
      object: 'M42',
      reasons: ['max altitude 4° below min_alt 30°']
    }
  ]
};

describe('NightPlanComponent', () => {
  let component: NightPlanComponent;
  let fixture: ComponentFixture<NightPlanComponent>;
  let nightPlanService: { getNightPlan: ReturnType<typeof vi.fn> };
  let telescopeService: { getTelescopes: ReturnType<typeof vi.fn> };
  let userService: { getPreferences: ReturnType<typeof vi.fn> };

  const preferences = { default_scope: 7 } as UserPreferences;

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [NightPlanComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: NightPlanService, useValue: nightPlanService },
        { provide: TelescopeService, useValue: telescopeService },
        { provide: UserService, useValue: userService },
        CoordsFormatterService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NightPlanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    nightPlanService = { getNightPlan: vi.fn().mockReturnValue(of(PLAN)) };
    telescopeService = {
      getTelescopes: vi.fn().mockReturnValue(of([
        makeTelescope(3, 'Scope 3'),
        makeTelescope(7, 'Scope 7'),
        makeTelescope(8, 'Retired scope', false)
      ]))
    };
    userService = { getPreferences: vi.fn().mockReturnValue(of(preferences)) };
  });

  it('should create', async () => {
    await setup();
    expect(component).toBeTruthy();
  });

  it('should default the telescope to the user preference and load the plan', async () => {
    await setup();

    expect(component.scopeControl.value).toBe(7);
    expect(nightPlanService.getNightPlan).toHaveBeenCalledTimes(1);
    const params = nightPlanService.getNightPlan.mock.calls[0][0];
    expect(params.scope_id).toBe(7);
    expect(params.explain).toBe(false);
    expect(params.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(component.items.length).toBe(2);
  });

  it('should only offer active telescopes', async () => {
    await setup();
    expect(component.activeTelescopes.map(t => t.scope_id)).toEqual([3, 7]);
  });

  it('should fall back to the first active telescope when the preference is not usable', async () => {
    userService.getPreferences.mockReturnValue(of({ default_scope: 42 } as UserPreferences));
    await setup();

    expect(component.scopeControl.value).toBe(3);
    expect(nightPlanService.getNightPlan.mock.calls[0][0].scope_id).toBe(3);
  });

  it('should still work when the preferences call fails', async () => {
    userService.getPreferences.mockReturnValue(throwError(() => new Error('nope')));
    await setup();

    expect(component.scopeControl.value).toBe(3);
    expect(nightPlanService.getNightPlan).toHaveBeenCalled();
  });

  it('should report when there is no active telescope to plan for', async () => {
    telescopeService.getTelescopes.mockReturnValue(of([makeTelescope(8, 'Retired', false)]));
    await setup();

    expect(component.scopeControl.value).toBeNull();
    expect(component.error).toBeTruthy();
    expect(nightPlanService.getNightPlan).not.toHaveBeenCalled();
  });

  it('should reload with the new telescope on change', async () => {
    await setup();
    component.onScopeChange(3);

    expect(nightPlanService.getNightPlan).toHaveBeenCalledTimes(2);
    expect(nightPlanService.getNightPlan.mock.calls[1][0].scope_id).toBe(3);
  });

  it('should reload with the picked night', async () => {
    await setup();
    component.onDateChange(new Date(2026, 0, 15));

    expect(nightPlanService.getNightPlan.mock.calls[1][0].date).toBe('2026-01-15');
  });

  it('should request the excluded items when explain is turned on', async () => {
    await setup();
    component.onExplainChange(true);

    expect(nightPlanService.getNightPlan.mock.calls[1][0].explain).toBe(true);
    expect(component.excluded.length).toBe(1);
    expect(component.excluded[0].reasons[0]).toContain('min_alt');
  });

  it('should show an error message when the plan cannot be loaded', async () => {
    await setup();
    nightPlanService.getNightPlan.mockReturnValue(
      throwError(() => ({ error: { msg: 'scope_id is required' } }))
    );
    component.loadNightPlan();

    expect(component.error).toBe('scope_id is required');
    expect(component.items).toEqual([]);
    expect(component.excluded).toEqual([]);
  });

  it('should format visibility metadata for display', async () => {
    await setup();

    expect(component.formatDegrees(62.34)).toBe('62.3°');
    expect(component.formatDegrees(null)).toBe('—');
    expect(component.formatTimeLabel('2026-08-07 01:20:00')).toBe('01:20');
    expect(component.formatTimeLabel(null)).toBe('—');
  });

  it('should link projects to their detail page and leave tasks unlinked', async () => {
    await setup();

    expect(component.getItemLink(PLAN.items[1])).toEqual(['/projects', 4]);
    expect(component.getItemLink(PLAN.items[0])).toBeNull();
  });

  it('should format coordinates through the shared formatter', async () => {
    await setup();
    const formatter = TestBed.inject(CoordsFormatterService);

    expect(component.formatRA(12.345)).toBe(formatter.formatRA(12.345));
    expect(component.formatDec(45.678)).toBe(formatter.formatDec(45.678));
    expect(component.formatRA(null)).toBe('');
    expect(component.formatDec(null)).toBe('');
  });
});
