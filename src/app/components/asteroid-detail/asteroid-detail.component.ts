import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AsteroidsService, Asteroid } from '../../services/asteroids.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-asteroid-detail',
  templateUrl: './asteroid-detail.component.html',
  styleUrls: ['./asteroid-detail.component.css'],
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class AsteroidDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private asteroidsService = inject(AsteroidsService);
  private snackBar = inject(MatSnackBar);

  asteroid: Asteroid | null = null;
  notFound = false;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadAsteroid(Number(id));
    } else {
      this.notFound = true;
    }
  }

  loadAsteroid(asteroidId: number): void {
    this.asteroidsService.getAsteroid(asteroidId).subscribe({
      next: response => {
        this.asteroid = response.asteroid;
      },
      error: () => {
        this.notFound = true;
        this.snackBar.open('Asteroid not found', 'Close', { duration: 3000 });
      }
    });
  }

  backToList(): void {
    this.router.navigate(['/asteroids']);
  }

  /** MPC designations that don't have an assigned number are provisional. */
  isProvisional(): boolean {
    return this.asteroid?.number == null;
  }
}
