import { Component, OnInit, inject } from '@angular/core';
import { UntypedFormGroup, Validators, UntypedFormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { LoginService, LoginResponse } from '../services/login.service';
import { Hevelius } from '../../hevelius';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';


@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css'],
    standalone: true,
    imports: [
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatCardModule,
    MatIconModule
]
})
export class LoginComponent implements OnInit {
    private loginService = inject(LoginService);
    private router = inject(Router);
    private snackBar = inject(MatSnackBar);
    private formBuilder = inject(UntypedFormBuilder);


    title: string;
    version: string;
    backendVersion: string = 'Unknown';
    hide: boolean;

    loginForm: UntypedFormGroup;

  constructor() {

        this.hide = true;
        this.version = Hevelius.version;
        this.title = Hevelius.title;
 }

  ngOnInit() {

      this.loginForm = this.formBuilder.group({
          username: ['', Validators.required],
          password: ['', Validators.required]
      });
      this.fetchBackendVersion();
  }

  private fetchBackendVersion() {
      this.loginService.getBackendVersion().pipe(first()).subscribe({
          next: (version: string) => {
              this.backendVersion = version;
          },
          error: (error: HttpErrorResponse) => {
              this.backendVersion = 'Unresponsive';
              if (error.status === 0) {
                  console.warn('Backend is unreachable');
              }
          }
      });
  }

  // This method is called when Login button is clicked.
  onSubmit() {
      if (this.loginForm.invalid) {
          this.showMessage('Please fill in all fields.');
          return;
      }

      this.loginService.login(this.loginForm.controls.username.value,
                              this.loginForm.controls.password.value)
        .pipe(first())
        .subscribe({
            next: (data: LoginResponse) =>  {
                if (data.status === true) {
                    this.showMessage('Login successful! Welcome, ' + data.firstname);
                    this.router.navigateByUrl('/tasks');
                } else {
                    this.showMessage('Login incorrect.');
                }
            },
            error: (error: HttpErrorResponse) => {
                // Check if backend is unresponsive (status === 0), or returns 500 error.
                if (error.status === 0) {
                    this.showMessage('Backend is unresponsive. Please check the server.');
                } else if (error.status === 500) {
                    this.showMessage('Backend Error: 500 Internal Server Error.');
                } else {
                    this.showMessage(`Login failed with error code: ${error.status}`);
                }
            }
        });
  }


  showMessage(text: string) {
    this.snackBar.open(text, 'Close', {
      duration: 3000, // Duration in milliseconds
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });


  }

}
