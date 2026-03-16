import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface TopBarState {
  title: string;
  showFilter: boolean;
  filterVisible: boolean;
  onFilterToggle?: () => void;
  /** Show add (plus) button in toolbar; when set, onAddClick is invoked on plus click */
  showAdd?: boolean;
  onAddClick?: () => void;
  /** Tooltip for the add button (e.g. "Add task", "Add project") */
  addTooltip?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TopBarService {
  private state = new BehaviorSubject<TopBarState>({
    title: '',
    showFilter: false,
    filterVisible: false
  });

  state$ = this.state.asObservable();

  updateState(newState: Partial<TopBarState>) {
    this.state.next({
      ...this.state.value,
      ...newState
    });
  }

  resetState() {
    this.state.next({
      title: '',
      showFilter: false,
      filterVisible: false,
      showAdd: false,
      onAddClick: undefined,
      addTooltip: undefined
    });
  }
}