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
}
