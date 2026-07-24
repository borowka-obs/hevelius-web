import { Component, OnInit, inject } from '@angular/core';
import {
    AbstractControl,
    UntypedFormGroup,
    ValidationErrors,
    Validators,
    UntypedFormBuilder,
    ReactiveFormsModule
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { LoginService, StatusMsgResponse } from '../services/login.service';
import { Hevelius } from '../../hevelius';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';

/** Requires confirm_password to equal new_password. */
function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const newPassword = group.get('new_password')?.value;
    const confirm = group.get('confirm_password')?.value;
    return newPassword && confirm && newPassword !== confirm ? { passwordMismatch: true } : null;
}

@Component({
    selector: 'app-reset-password',
    templateUrl: './reset-password.component.html',
    styleUrls: ['./reset-password.component.css'],
    standalone: true,
    imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatToolbarModule,
        MatCardModule
    ]
})
export class ResetPasswordComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private loginService = inject(LoginService);
    private snackBar = inject(MatSnackBar);
    private formBuilder = inject(UntypedFormBuilder);

    title: string;
    token: string | null = null;
    submitting = false;
    hide = true;
    form: UntypedFormGroup;

    constructor() {
        this.title = Hevelius.title;
    }

    ngOnInit(): void {
        this.token = this.route.snapshot.queryParamMap.get('token');

        this.form = this.formBuilder.group(
            {
                new_password: ['', [Validators.required, Validators.minLength(8)]],
                confirm_password: ['', Validators.required]
            },
            { validators: passwordsMatchValidator }
        );
    }

    onSubmit(): void {
        if (!this.token) {
            this.showMessage('Missing or invalid reset link.');
            return;
        }
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.submitting = true;
        this.loginService
            .resetPassword(this.token, this.form.controls.new_password.value)
            .pipe(first())
            .subscribe({
                next: (data: StatusMsgResponse) => {
                    this.submitting = false;
                    if (data.status) {
                        this.showMessage('Password updated. Please sign in with your new password.');
                        this.router.navigateByUrl('/login');
                    } else {
                        this.showMessage(data.msg || 'Invalid or expired reset link.');
                    }
                },
                error: (error: HttpErrorResponse) => {
                    this.submitting = false;
                    if (error.status === 0) {
                        this.showMessage('Backend is unresponsive. Please check the server.');
                    } else {
                        this.showMessage(`Request failed with error code: ${error.status}`);
                    }
                }
            });
    }

    goToLogin(): void {
        this.router.navigateByUrl('/login');
    }

    goToForgotPassword(): void {
        this.router.navigateByUrl('/forgot-password');
    }

    showMessage(text: string): void {
        this.snackBar.open(text, 'Close', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
        });
    }
}
