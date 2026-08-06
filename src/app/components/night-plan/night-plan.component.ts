import { Component, OnInit, OnDestroy, HostListener, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
    NightPlanResponse
} from '../../models/night-plan';

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

        this.loading = true;
        // Telescope list and the user's default_scope are both needed before the
        // first plan request; a missing preferences call must not block the page.
        forkJoin({
            telescopes: this.telescopeService.getTelescopes().pipe(
                catchError(() => of([] as Telescope[]))
            ),
            preferences: this.userService.getPreferences().pipe(
                catchError(() => of(null as UserPreferences | null))
            )
        }).subscribe(({ telescopes, preferences }) => {
            this.telescopes = telescopes;
            this.loading = false;

            const scopeId = this.pickInitialScope(preferences?.default_scope ?? null);
            if (scopeId === null) {
                this.error = 'No active telescope available to plan for.';
                return;
            }
            this.scopeControl.setValue(scopeId);
            this.loadNightPlan();
        });
    }

    /**
     * The user's `default_scope` wins when it names an active telescope;
     * otherwise fall back to the first active one so the page shows something.
     */
    private pickInitialScope(defaultScope: number | null): number | null {
        const active = this.activeTelescopes;
        if (defaultScope !== null && active.some(t => t.scope_id === defaultScope)) {
            return defaultScope;
        }
        return active.length > 0 ? active[0].scope_id : null;
    }

    onScopeChange(scopeId: number | null): void {
        this.scopeControl.setValue(scopeId);
        this.loadNightPlan();
    }

    onDateChange(newDate: Date | null): void {
        this.dateControl.setValue(newDate ?? new Date());
        this.loadNightPlan();
    }

    onExplainChange(explain: boolean): void {
        this.explainControl.setValue(explain);
        this.loadNightPlan();
    }

    /** Jump to tonight; the backend decides which night "tonight" is. */
    resetToTonight(): void {
        this.dateControl.setValue(new Date());
        this.loadNightPlan();
    }

    loadNightPlan(): void {
        const scopeId = this.scopeControl.value;
        if (scopeId === null || scopeId === undefined) {
            return;
        }

        this.loading = true;
        this.error = null;

        this.nightPlanService.getNightPlan({
            scope_id: scopeId,
            date: this.formatDateForApi(this.dateControl.value ?? new Date()),
            explain: this.explainControl.value
        }).subscribe({
            next: response => {
                this.loading = false;
                this.plan = response;
                this.items = response?.items ?? [];
                this.excluded = response?.excluded ?? [];
                this.updateTitle();
            },
            error: err => {
                this.loading = false;
                this.plan = null;
                this.items = [];
                this.excluded = [];
                this.error = err?.error?.msg || err?.error?.message || 'Could not load the night plan.';
                this.updateTitle();
            }
        });
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

    /** HH:MM extracted from a "YYYY-MM-DD HH:MM:SS.sss" UTC timestamp. */
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

    /** Router link to the task's project or the project itself; null for tasks. */
    getItemLink(item: NightPlanItem | NightPlanExcludedItem): unknown[] | null {
        if (item.kind === 'project' && item.project_id != null) {
            return ['/projects', item.project_id];
        }
        return null;
    }

    trackItem = (_index: number, item: NightPlanItem | NightPlanExcludedItem): string =>
        `${item.kind}-${item.task_id ?? item.project_id ?? item.object}`;

    ngOnDestroy(): void {
        this.topBarService.resetState();
    }
}
