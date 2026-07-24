import { Component, OnInit, inject } from '@angular/core';
import { UntypedFormGroup, Validators, UntypedFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { LoginService, StatusMsgResponse } from '../services/login.service';
import { Hevelius } from '../../hevelius';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';

@Component({
    selector: 'app-forgot-password',
    templateUrl: './forgot-password.component.html',
    styleUrls: ['./forgot-password.component.css'],
    standalone: true,
    imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatToolbarModule,
        MatCardModule
    ]
})
export class ForgotPasswordComponent implements OnInit {
    private loginService = inject(LoginService);
    private router = inject(Router);
    private snackBar = inject(MatSnackBar);
    private formBuilder = inject(UntypedFormBuilder);

    title: string;
    submitted = false;
    form: UntypedFormGroup;

    constructor() {
        this.title = Hevelius.title;
    }

    ngOnInit(): void {
        this.form = this.formBuilder.group({
            login_or_email: ['', Validators.required]
        });
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.showMessage('Please enter your username or e-mail.');
            return;
        }

        this.loginService
            .forgotPassword(this.form.controls.login_or_email.value)
            .pipe(first())
            .subscribe({
                next: (data: StatusMsgResponse) => {
                    // The backend always returns a generic message, whether or not the
                    // account exists, so this can't be used to enumerate accounts.
                    this.submitted = true;
                    this.showMessage(data.msg || 'If that account exists, a password reset email has been sent.');
                },
                error: (error: HttpErrorResponse) => {
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

    showMessage(text: string): void {
        this.snackBar.open(text, 'Close', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
        });
    }
}
