import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Hevelius } from 'src/hevelius';
import { StatusMsgResponse } from './login.service';

// See UsersMeResource / UsersMePasswordResource in hevelius-backend's
// hevelius/api/routes/auth_users.py for the source of truth.
export interface UserProfile {
  user_id: number;
  login: string | null;
  firstname: string | null;
  lastname: string | null;
  share: number | null;
  phone: string | null;
  email: string | null;
  permissions: number;
  aavso_id: string | null;
  login_enabled: boolean;
}

export interface UserProfileUpdate {
  firstname?: string | null;
  lastname?: string | null;
  phone?: string | null;
  email?: string | null;
  aavso_id?: string | null;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

// See UsersMePreferencesResource in hevelius-backend's
// hevelius/api/routes/auth_users.py for the source of truth.
export interface UserPreferences {
  default_exposure: number | null;
  default_filter: number | null;
  default_scope: number | null;
  task_binning: number | null;
  task_guiding: number | null;
  task_dither: number | null;
  min_alt: number | null;
  limit_min_moon_dist: number | null;
  limit_max_sun_alt: number | null;
  limit_max_moon_phase: number | null;
}

export interface UserPreferencesUpdate {
  default_exposure?: number | null;
  default_filter?: number | null;
  default_scope?: number | null;
  task_binning?: number | null;
  task_guiding?: number | null;
  task_dither?: number | null;
  min_alt?: number | null;
  limit_min_moon_dist?: number | null;
  limit_max_sun_alt?: number | null;
  limit_max_moon_phase?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = `${Hevelius.apiUrl}/users/me`;

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(this.apiUrl);
  }

  updateProfile(body: UserProfileUpdate): Observable<UserProfile> {
    return this.http.patch<UserProfile>(this.apiUrl, body);
  }

  changePassword(body: PasswordChangeRequest): Observable<StatusMsgResponse> {
    return this.http.post<StatusMsgResponse>(`${this.apiUrl}/password`, body);
  }

  getPreferences(): Observable<UserPreferences> {
    return this.http.get<UserPreferences>(`${this.apiUrl}/preferences`);
  }

  updatePreferences(body: UserPreferencesUpdate): Observable<UserPreferences> {
    return this.http.patch<UserPreferences>(`${this.apiUrl}/preferences`, body);
  }
}
