import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface TopBarState {
  title: string;
  showFilter: boolean;
  filterVisible: boolean;
  onFilterToggle?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class TopBarService {
  private state = new BehaviorSubject<TopBarState>({
    title: 'Hevelius',
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
      title: 'Hevelius',
      showFilter: false,
      filterVisible: false
    });
  }
}