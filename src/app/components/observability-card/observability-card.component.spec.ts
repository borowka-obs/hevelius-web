import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ObservabilityCardComponent } from './observability-card.component';
import { Telescope } from '../../services/telescope.service';
import { AltAzSample } from '../../models/observability';

function makeTelescope(overrides: Partial<Telescope> = {}): Telescope {
  return {
    scope_id: 1,
    name: 'Hevelius',
    descr: '',
    min_dec: -30,
    max_dec: 90,
    focal: 2541,
    aperture: 250,
    lon: 21.0,
    lat: 52.2,
    alt: 130,
    sensor: null,
    active: true,
    default_rotation: null,
    ...overrides
  };
}

function sample(minutes: number, altitudeDeg: number): AltAzSample {
  return {
    time: new Date(Date.UTC(2026, 8, 20, 20, 0, 0) + minutes * 60_000),
    altitudeDeg,
    azimuthDeg: 180
  };
}

describe('ObservabilityCardComponent', () => {
  let fixture: ComponentFixture<ObservabilityCardComponent>;
  let component: ObservabilityCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObservabilityCardComponent],
      providers: [provideNoopAnimations()]
    }).compileComponents();

    fixture = TestBed.createComponent(ObservabilityCardComponent);
    component = fixture.componentInstance;
  });

  /**
   * Drive inputs the way a parent template would, then wait for the curve.
   *
   * `setInput` is what makes OnPush views dirty and fires ngOnChanges;
   * `whenSettled()` covers the dynamic import that zone.js cannot see.
   */
  async function setInputs(inputs: Record<string, unknown>): Promise<void> {
    Object.entries(inputs).forEach(([key, value]) => fixture.componentRef.setInput(key, value));
    fixture.detectChanges();
    await component.whenSettled();
    fixture.detectChanges();
  }

  const fixedTarget = {
    source: 'fixed' as const,
    targetName: 'M31',
    raHours: 0.712,
    decDeg: 41.27,
    telescopes: [makeTelescope()],
    scopeId: 1,
    date: new Date(2026, 8, 20)
  };

  it('computes a curve for a fixed target in the browser', async () => {
    await setInputs(fixedTarget);
    expect(component.curve).not.toBeNull();
    expect(component.curve!.targetName).toBe('M31');
    expect(component.curve!.target.length).toBeGreaterThan(10);
  });

  it('renders the chart once a curve exists', async () => {
    await setInputs(fixedTarget);
    expect(fixture.nativeElement.querySelector('app-elevation-chart')).not.toBeNull();
  });

  it('explains itself when the telescope has no coordinates', async () => {
    await setInputs({ ...fixedTarget, telescopes: [makeTelescope({ lat: null, lon: null })] });
    expect(component.curve).toBeNull();
    expect(component.hasSiteCoordinates).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('no latitude and longitude');
  });

  it('explains itself when the target has no coordinates', async () => {
    await setInputs({ ...fixedTarget, raHours: null, decDeg: null });
    expect(component.curve).toBeNull();
    expect(fixture.nativeElement.textContent).toContain("has no coordinates");
  });

  it('hides the telescope picker when there is only one telescope', async () => {
    await setInputs(fixedTarget);
    expect(component.showScopePicker).toBe(false);
    expect(fixture.nativeElement.querySelector('mat-select')).toBeNull();
  });

  it('shows the telescope picker when there is a choice', async () => {
    await setInputs({
      ...fixedTarget,
      telescopes: [makeTelescope(), makeTelescope({ scope_id: 2, name: 'Second' })]
    });
    expect(component.showScopePicker).toBe(true);
  });

  it('emits and recomputes when the telescope changes', async () => {
    const second = makeTelescope({ scope_id: 2, name: 'Second', lat: -33.9, lon: 18.4 });
    await setInputs({ ...fixedTarget, telescopes: [makeTelescope(), second] });

    let emitted: number | null = null;
    component.scopeIdChange.subscribe(value => (emitted = value));
    component.onScopeChange(2);
    await component.whenSettled();
    fixture.detectChanges();

    expect(emitted).toBe(2);
    expect(component.curve!.site.latDeg).toBe(-33.9);
  });

  it('emits and recomputes when the night changes', async () => {
    await setInputs(fixedTarget);
    const firstNight = component.curve!.nightStart.getTime();

    let emitted: Date | null = null;
    component.dateChange.subscribe(value => (emitted = value));
    component.onDateChange(new Date(2026, 11, 20));
    await component.whenSettled();
    fixture.detectChanges();

    expect(emitted).not.toBeNull();
    expect(component.curve!.nightStart.getTime()).not.toBe(firstNight);
  });

  it('steps the night backwards and forwards by a day', async () => {
    await setInputs(fixedTarget);
    component.shiftNight(1);
    expect(component.date.getDate()).toBe(21);
    component.shiftNight(-1);
    expect(component.date.getDate()).toBe(20);
  });

  it('ignores a cleared date rather than computing a broken night', async () => {
    await setInputs(fixedTarget);
    const before = component.date;
    component.onDateChange(null);
    expect(component.date).toBe(before);
  });

  it('wraps a precomputed track when the source is samples', async () => {
    const samples = [sample(0, -3), sample(60, 25), sample(120, 48), sample(180, 20)];
    await setInputs({
      source: 'samples',
      targetName: '(433) Eros',
      samples,
      telescopes: [makeTelescope()],
      scopeId: 1,
      date: new Date(2026, 8, 20)
    });

    expect(component.curve!.target).toHaveLength(4);
    // Sun, Moon and twilight are derived locally even for a backend-sourced track.
    expect(component.curve!.sun).toHaveLength(4);
    expect(component.curve!.twilight.length).toBeGreaterThan(0);
  });

  it('carries an extra series through to the curve', async () => {
    await setInputs({
      source: 'samples',
      targetName: '(433) Eros',
      samples: [sample(0, 10), sample(60, 20)],
      extraSeries: { label: 'Apparent magnitude', values: [14.2, 14.1], unit: 'mag' },
      telescopes: [makeTelescope()],
      scopeId: 1
    });
    expect(component.curve!.extraSeries!.label).toBe('Apparent magnitude');
  });

  it('surfaces a parent-supplied error instead of a chart', async () => {
    await setInputs({
      source: 'samples',
      samples: [sample(0, 10), sample(60, 20)],
      telescopes: [makeTelescope()],
      scopeId: 1,
      externalError: 'Could not compute visibility.'
    });
    expect(fixture.nativeElement.textContent).toContain('Could not compute visibility.');
    expect(fixture.nativeElement.querySelector('app-elevation-chart')).toBeNull();
  });

  it('shows a spinner while the parent is fetching', async () => {
    await setInputs({
      source: 'samples',
      samples: [sample(0, 10), sample(60, 20)],
      telescopes: [makeTelescope()],
      scopeId: 1,
      externalLoading: true
    });
    expect(component.loading).toBe(true);
    expect(fixture.nativeElement.querySelector('mat-spinner')).not.toBeNull();
  });

  it('merges parent warnings into the curve', async () => {
    await setInputs({
      ...fixedTarget,
      warnings: ['Declination is outside this mount’s range.']
    });
    expect(component.curve!.warnings.join(' ')).toContain('outside this mount');
  });

  it('narrows the observable window when constraints are applied', async () => {
    await setInputs(fixedTarget);
    const unconstrained = component.curve!.observableWindows.length;

    await setInputs({ ...fixedTarget, constraints: { minAltDeg: 85 } });
    expect(component.curve!.observableWindows.length).toBeLessThanOrEqual(unconstrained);
  });

  it('summarises the transit and the observable window', async () => {
    await setInputs(fixedTarget);
    expect(component.transitSummary).toMatch(/^\d+° at \d{2}:\d{2} UTC$/);
    if (component.curve!.observableWindows.length > 0) {
      expect(component.observableSummary).toMatch(/\d{2}:\d{2}–\d{2}:\d{2}/);
    }
  });

  it('reports no summary for a target that is never observable', async () => {
    // Dec −80° never rises at +52° latitude.
    await setInputs({ ...fixedTarget, decDeg: -80, constraints: { minAltDeg: 20 } });
    expect(component.observableSummary).toBeNull();
  });
});
