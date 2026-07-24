import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme_preference';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private preference = new BehaviorSubject<ThemePreference>(this.loadPreference());
  preference$ = this.preference.asObservable();

  constructor() {
    this.applyPreference(this.preference.value);
  }

  get current(): ThemePreference {
    return this.preference.value;
  }

  setPreference(preference: ThemePreference) {
    localStorage.setItem(STORAGE_KEY, preference);
    this.preference.next(preference);
    this.applyPreference(preference);
  }

  private loadPreference(): ThemePreference {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  }

  private applyPreference(preference: ThemePreference) {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark');
    if (preference === 'light') {
      root.classList.add('theme-light');
    } else if (preference === 'dark') {
      root.classList.add('theme-dark');
    }
  }
}
