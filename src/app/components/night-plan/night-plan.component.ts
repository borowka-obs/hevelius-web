import { Component, OnInit, OnDestroy, HostListener, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EMPTY, Subject, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';

import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { NightPlanService } from '../../services/night-plan.service';
import { CoordsFormatterService } from '../../services/coords-formatter.service';
import { TaskStatesService } from '../../services/task-states.service';
import { TelescopeService, Telescope } from '../../services/telescope.service';
import { UserService, UserPreferences } from '../../services/user.service';
import { TopBarService } from '../../services/top-bar.service';
import {
    NightPlanExcludedItem,
    NightPlanItem,
    NightPlanParams,
    NightPlanResponse
} from '../../models/night-plan';

/** Human-readable labels for scheduler exclusion reason codes. */
const EXCLUSION_REASON_LABELS: Record<string, string> = {
    wrong_state: 'Wrong state',
    outside_date_window: 'Outside date window',
    outside_mount_dec_range: 'Outside mount Dec range',
    filter_not_on_scope: 'Filter not on this telescope',
    already_complete: 'Already complete',
    missing_coordinates: 'Missing coordinates',
    below_min_altitude: 'Below minimum altitude',
    sun_too_high: 'Sun too high',
    moon_too_close: 'Moon too close',
    moon_phase_too_bright: 'Moon phase too bright'
};

@Component({
    selector: 'app-night-plan',
    templateUrl: './night-plan.component.html',
    styleUrls: ['./night-plan.component.css'],
    standalone: true,
    imports: [
    ReactiveFormsModule,
    RouterModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
    ]
})
export class NightPlanComponent implements OnInit, OnDestroy {
    private nightPlanService = inject(NightPlanService);
    private coordFormatter = inject(CoordsFormatterService);
    private taskStates = inject(TaskStatesService);
    private telescopeService = inject(TelescopeService);
    private userService = inject(UserService);
    private topBarService = inject(TopBarService);

    scopeControl = new FormControl<number | null>(null);
    dateControl = new FormControl<Date>(new Date());
    explainControl = new FormControl<boolean>(false, { nonNullable: true });

    telescopes: Telescope[] = [];
    plan: NightPlanResponse | null = null;
    items: NightPlanItem[] = [];
    excluded: NightPlanExcludedItem[] = [];

    loading = false;
    error: string | null = null;

    /**
     * When set, sent as the `date` query param. When null, the param is omitted
     * so the backend picks the observing night in progress at the telescope.
     */
    private explicitNightDate: string | null = null;

    private readonly loadTrigger$ = new Subject<void>();
    private readonly destroy$ = new Subject<void>();

    private readonly MOBILE_BREAKPOINT = 640;
    isMobile = typeof window !== 'undefined' && window.innerWidth <= this.MOBILE_BREAKPOINT;

    @HostListener('window:resize')
    onResize(): void {
        this.isMobile = window.innerWidth <= this.MOBILE_BREAKPOINT;
    }

    get displayedColumns(): string[] {
        if (this.isMobile) {
            return ['kind', 'object', 'max_altitude', 'best_time'];
        }
        return [
            'kind',
            'object',
            'ra',
            'decl',
            'max_altitude',
            'moon_separation',
            'best_time',
            'exposure',
            'state'
        ];
    }

    get activeTelescopes(): Telescope[] {
        return this.telescopes.filter(t => t.active);
    }

    ngOnInit(): void {
        setTimeout(() => {
            this.topBarService.updateState({ title: 'Night plan' });
        });

        this.loadTrigger$.pipe(
            switchMap(() => this.fetchNightPlan()),
            takeUntil(this.destroy$)
        ).subscribe(response => {
            this.loading = false;
            this.plan = response;
            this.items = response?.items ?? [];
            this.excluded = response?.excluded ?? [];
            this.syncDateControlFromPlan(response);
            this.ensureScopeLabel(response);
            this.updateTitle();
        });

        this.loading = true;
        // Telescope list and the user's default_scope are both needed before the
        // first plan request; a missing preferences call must not block the page.
        forkJoin({
            telescopes: this.telescopeService.getTelescopes().pipe(
                map(list => ({ ok: true as const, list })),
                catchError(() => of({ ok: false as const, list: [] as Telescope[] }))
            ),
            preferences: this.userService.getPreferences().pipe(
                catchError(() => of(null as UserPreferences | null))
            )
        }).pipe(
            takeUntil(this.destroy$)
        ).subscribe(({ telescopes, preferences }) => {
            this.telescopes = telescopes.list;
            this.loading = false;

            const defaultScope = preferences?.default_scope ?? null;
            const scopeId = this.pickInitialScope(defaultScope, telescopes.ok);
            if (scopeId === null) {
                this.error = telescopes.ok
                    ? 'No active telescope available to plan for.'
                    : 'Could not load telescopes.';
                return;
            }

            if (!telescopes.ok) {
                // List failed, but default_scope is still usable for the plan request.
                this.telescopes = [this.makeScopePlaceholder(scopeId)];
            }

            this.scopeControl.setValue(scopeId);
            this.loadNightPlan();
        });
    }

    /**
     * Prefer the user's `default_scope` when it names an active telescope;
     * otherwise the first active scope. If the telescope list itself failed,
     * still trust a saved `default_scope` so the page can load a plan.
     */
    private pickInitialScope(defaultScope: number | null, telescopesLoaded: boolean): number | null {
        const active = this.activeTelescopes;
        if (defaultScope !== null && active.some(t => t.scope_id === defaultScope)) {
            return defaultScope;
        }
        if (active.length > 0) {
            return active[0].scope_id;
        }
        if (!telescopesLoaded && defaultScope !== null) {
            return defaultScope;
        }
        return null;
    }

    private makeScopePlaceholder(scopeId: number): Telescope {
        return {
            scope_id: scopeId,
            name: `Scope ${scopeId}`,
            descr: '',
            min_dec: -90,
            max_dec: 90,
            focal: null,
            aperture: null,
            lon: null,
            lat: null,
            alt: null,
            sensor: null,
            active: true,
            default_rotation: null
        };
    }

    onScopeChange(scopeId: number | null): void {
        this.scopeControl.setValue(scopeId);
        this.loadNightPlan();
    }

    onDateChange(newDate: Date | null): void {
        const date = newDate ?? new Date();
        this.dateControl.setValue(date);
        this.explicitNightDate = this.formatDateForApi(date);
        this.loadNightPlan();
    }

    onExplainChange(explain: boolean): void {
        this.explainControl.setValue(explain);
        this.loadNightPlan();
    }

    /** Jump to tonight; omit `date` so the backend picks the current night. */
    resetToTonight(): void {
        this.explicitNightDate = null;
        this.loadNightPlan();
    }

    loadNightPlan(): void {
        if (this.scopeControl.value === null || this.scopeControl.value === undefined) {
            return;
        }
        this.loadTrigger$.next();
    }

    private fetchNightPlan() {
        const scopeId = this.scopeControl.value;
        if (scopeId === null || scopeId === undefined) {
            return EMPTY;
        }

        this.loading = true;
        this.error = null;

        const params: NightPlanParams = {
            scope_id: scopeId,
            explain: this.explainControl.value
        };
        if (this.explicitNightDate) {
            params.date = this.explicitNightDate;
        }

        return this.nightPlanService.getNightPlan(params).pipe(
            catchError(err => {
                this.loading = false;
                this.plan = null;
                this.items = [];
                this.excluded = [];
                this.error = err?.error?.msg || err?.error?.message || 'Could not load the night plan.';
                this.updateTitle();
                return EMPTY;
            })
        );
    }

    /** Keep the date picker in sync when the backend chose the night. */
    private syncDateControlFromPlan(response: NightPlanResponse): void {
        if (this.explicitNightDate || !response?.night_date) {
            return;
        }
        this.dateControl.setValue(this.parseNightDate(response.night_date), { emitEvent: false });
    }

    /** Replace a placeholder scope label with the name from the plan response. */
    private ensureScopeLabel(response: NightPlanResponse): void {
        if (!response?.scope_name) {
            return;
        }
        const scope = this.telescopes.find(t => t.scope_id === response.scope_id);
        if (scope && scope.name === `Scope ${response.scope_id}`) {
            scope.name = response.scope_name;
        }
    }

    private updateTitle(): void {
        this.topBarService.updateState({
            title: `Night plan: ${this.items.length} items`
        });
    }

    private formatDateForApi(d: Date): string {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /** Parse YYYY-MM-DD as a local calendar date (avoids UTC midnight shifts). */
    private parseNightDate(yyyyMmDd: string): Date {
        const [year, month, day] = yyyyMmDd.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    /** Target name: task object or project name. */
    getItemName(item: NightPlanItem | NightPlanExcludedItem): string {
        if ('name' in item && item.name) {
            return item.name;
        }
        const planItem = item as NightPlanItem;
        return planItem.task?.object || planItem.project?.name || '—';
    }

    getItemRa(item: NightPlanItem): number | null | undefined {
        return item.task?.ra ?? item.project?.ra;
    }

    getItemDec(item: NightPlanItem): number | null | undefined {
        return item.task?.decl ?? item.project?.decl;
    }

    getItemExposure(item: NightPlanItem): number | string {
        if (item.kind === 'task') {
            return item.task?.exposure ?? '—';
        }
        const pending = item.project?.subframes;
        if (!pending?.length) {
            return '—';
        }
        // Show the first pending subframe's exposure; projects can have several.
        return pending[0].exposure_time ?? '—';
    }

    getItemState(item: NightPlanItem): number | null | undefined {
        return item.kind === 'task' ? item.task?.state : null;
    }

    formatRA(ra: number | null | undefined): string {
        if (ra === null || ra === undefined) {
            return '';
        }
        return this.coordFormatter.formatRA(ra);
    }

    formatDec(dec: number | null | undefined): string {
        if (dec === null || dec === undefined) {
            return '';
        }
        return this.coordFormatter.formatDec(dec);
    }

    /** Degrees with one decimal, or an em dash when the backend had nothing to say. */
    formatDegrees(value: number | null | undefined): string {
        if (value === null || value === undefined) {
            return '—';
        }
        return `${value.toFixed(1)}°`;
    }

    /** HH:MM extracted from a UTC timestamp (ISO-8601 or space-separated). */
    formatTimeLabel(time: string | null | undefined): string {
        if (!time) {
            return '—';
        }
        const match = time.match(/(\d{2}):(\d{2})/);
        return match ? `${match[1]}:${match[2]}` : time;
    }

    getStateLabel(state: number | null | undefined): string {
        if (state === null || state === undefined) {
            return '—';
        }
        return this.taskStates.getState(state);
    }

    formatExclusionReason(reason: string | null | undefined): string {
        if (!reason) {
            return '—';
        }
        return EXCLUSION_REASON_LABELS[reason] ?? reason.replace(/_/g, ' ');
    }

    /** Router link to the project's detail page; null for tasks. */
    getItemLink(item: NightPlanItem | NightPlanExcludedItem): unknown[] | null {
        if (item.kind !== 'project') {
            return null;
        }
        const projectId = (item as NightPlanItem).project?.project_id
            ?? (item as NightPlanExcludedItem).project_id;
        return projectId != null ? ['/projects', projectId] : null;
    }

    trackItem = (_index: number, item: NightPlanItem | NightPlanExcludedItem): string => {
        const planItem = item as NightPlanItem;
        const excluded = item as NightPlanExcludedItem;
        const id = planItem.task?.task_id
            ?? planItem.project?.project_id
            ?? excluded.task_id
            ?? excluded.project_id
            ?? this.getItemName(item);
        return `${item.kind}-${id}`;
    };

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.loadTrigger$.complete();
        this.topBarService.resetState();
    }
}
