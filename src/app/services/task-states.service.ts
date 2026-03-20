import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TaskStatesService {

	private readonly states: Record<number, string> = {
		0: 'templ',
		1: 'new',
		2: 'active',
		3: 'queued',
		4: "exec'd",
		5: 'done(prv)',
		6: 'done'
	};

	public getState(state: number): string {
		if (state === undefined || state === null || Number.isNaN(Number(state))) {
			return 'Unknown';
		}
		const n = Number(state);
		const label = this.states[n];
		return label !== undefined ? label : `state ${n}`;
	}

	/** For filter dropdowns and any UI that needs the full list. */
	public getStateFilterOptions(): { value: number; label: string }[] {
		return Object.keys(this.states)
			.map(k => Number(k))
			.sort((a, b) => a - b)
			.map(value => ({ value, label: this.states[value] }));
	}
}
