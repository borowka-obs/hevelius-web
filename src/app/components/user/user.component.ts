import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { first } from 'rxjs/operators';
import { LoginService } from '../../services/login.service';
import { UserService, UserProfile, UserProfileUpdate } from '../../services/user.service';
import { GravatarService } from '../../services/gravatar.service';
import { TopBarService } from '../../services/top-bar.service';
import { User } from '../../models/user';

/** Requires the confirm_password field to equal new_password. */
function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('new_password')?.value;
  const confirm = group.get('confirm_password')?.value;
  return newPassword && confirm && newPassword !== confirm ? { passwordMismatch: true } : null;
}

@Component({
    selector: 'app-user',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule
    ],
    templateUrl: './user.component.html',
    styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit {
    private loginService = inject(LoginService);
    private userService = inject(UserService);
    private gravatarService = inject(GravatarService);
    private topBarService = inject(TopBarService);
    private formBuilder = inject(FormBuilder);
    private snackBar = inject(MatSnackBar);

    user: User | null = null;
    profile: UserProfile | null = null;
    avatarUrl = '';
    savingProfile = false;
    changingPassword = false;
    hideCurrentPassword = true;
    hideNewPassword = true;

    profileForm: FormGroup = this.formBuilder.group({
        firstname: [''],
        lastname: [''],
        phone: [''],
        email: [''],
        aavso_id: ['', Validators.maxLength(5)]
    });

    passwordForm: FormGroup = this.formBuilder.group(
        {
            current_password: ['', Validators.required],
            new_password: ['', [Validators.required, Validators.minLength(8)]],
            confirm_password: ['', Validators.required]
        },
        { validators: passwordsMatchValidator }
    );

    ngOnInit(): void {
        this.topBarService.updateState({
            title: 'User',
            showFilter: false,
            filterVisible: false,
            showAdd: false
        });

        this.user = this.loginService.getUser();
        this.updateAvatar(this.user?.email, this.user?.user_id);
        // Pre-fill from the cached login response so the form isn't empty while
        // /users/me loads (or if it's unreachable).
        this.profileForm.patchValue({
            firstname: this.user?.firstname ?? '',
            lastname: this.user?.lastname ?? '',
            phone: this.user?.phone ?? '',
            email: this.user?.email ?? '',
            aavso_id: this.user?.aavso_id ?? ''
        });

        this.userService.getProfile().pipe(first()).subscribe({
            next: profile => this.applyProfile(profile),
            error: () => {
                // Keep showing the cached login response; /users/me is unreachable.
            }
        });
    }

    private applyProfile(profile: UserProfile): void {
        this.profile = profile;
        this.profileForm.patchValue({
            firstname: profile.firstname ?? '',
            lastname: profile.lastname ?? '',
            phone: profile.phone ?? '',
            email: profile.email ?? '',
            aavso_id: profile.aavso_id ?? ''
        });
        this.updateAvatar(profile.email, profile.user_id);
    }

    private updateAvatar(email: string | null | undefined, userId: number | undefined | null): void {
        const fallbackId = userId?.toString() ?? this.user?.firstname ?? 'hevelius-user';
        this.avatarUrl = this.gravatarService.getAvatarUrl(email, fallbackId, 96);
    }

    saveProfile(): void {
        if (this.profileForm.invalid) {
            this.profileForm.markAllAsTouched();
            return;
        }
        this.savingProfile = true;
        const v = this.profileForm.getRawValue();
        const body: UserProfileUpdate = {
            firstname: v.firstname?.trim() || null,
            lastname: v.lastname?.trim() || null,
            phone: v.phone?.trim() || null,
            email: v.email?.trim() || null,
            aavso_id: v.aavso_id?.trim() || null
        };
        this.userService.updateProfile(body).pipe(first()).subscribe({
            next: profile => {
                this.savingProfile = false;
                this.applyProfile(profile);
                this.mergeIntoStoredUser(profile);
                this.showMessage('Profile updated.');
            },
            error: (err: HttpErrorResponse) => {
                this.savingProfile = false;
                this.showMessage(err?.error?.msg || 'Failed to update profile.');
            }
        });
    }

    // Keep the locally cached login data (used elsewhere, e.g. the top bar avatar) in sync.
    private mergeIntoStoredUser(profile: UserProfile): void {
        const stored = this.loginService.getUser();
        if (!stored) {
            return;
        }
        this.loginService.loggedIn({
            ...(stored as unknown as Record<string, unknown>),
            firstname: profile.firstname ?? undefined,
            lastname: profile.lastname ?? undefined,
            phone: profile.phone ?? undefined,
            email: profile.email ?? undefined,
            aavso_id: profile.aavso_id ?? undefined,
            permissions: stored.permissions != null ? String(stored.permissions) : undefined
        });
    }

    changePassword(): void {
        if (this.passwordForm.invalid) {
            this.passwordForm.markAllAsTouched();
            return;
        }
        this.changingPassword = true;
        const v = this.passwordForm.getRawValue();
        this.userService
            .changePassword({ current_password: v.current_password, new_password: v.new_password })
            .pipe(first())
            .subscribe({
                next: () => {
                    this.changingPassword = false;
                    this.passwordForm.reset();
                    this.showMessage('Password changed.');
                },
                error: (err: HttpErrorResponse) => {
                    this.changingPassword = false;
                    this.showMessage(err?.error?.msg || 'Failed to change password.');
                }
            });
    }

    showMessage(text: string): void {
        this.snackBar.open(text, 'Close', {
            duration: 4000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
        });
    }
}
