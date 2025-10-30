import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  isCollapsed = false;
  isLoggingOut = false;

  constructor(private authService: AuthService, private router: Router) {}

  toggle(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  logout(): void {
    if (this.isLoggingOut) {
      return;
    }
    this.isLoggingOut = true;
    this.authService
      .logout()
      .pipe(finalize(() => (this.isLoggingOut = false)))
      .subscribe({
        next: () => {
          this.router.navigate(['/login']);
        },
        error: () => {
          // Even if logout fails, clear session and redirect
          this.router.navigate(['/login']);
        }
      });
  }
}
