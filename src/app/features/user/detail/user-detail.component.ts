import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { UserService } from '../../../core/services/user/user.service';
import { UserSummary } from '../../../core/models/auth/user.model';
import { AlertService } from '../../../shared/alert/alert.service';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-detail.component.html'
})
export class UserDetailComponent implements OnInit {
  user: UserSummary | null = null;
  loading = false;

  private userId!: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.userId) {
      this.alertService.showError('Identificador de usuario inválido.', 'Error');
      this.goBack();
      return;
    }
    this.loadUser();
  }

  private loadUser(): void {
    this.loading = true;
    this.userService.getUserById(this.userId).subscribe({
      next: user => {
        this.user = user;
        this.loading = false;
      },
      error: err => {
        this.alertService.showError('No se pudo cargar la información del usuario.', 'Error');
        console.error('Error al cargar usuario', err);
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/users']);
  }

  goToEdit(): void {
    this.router.navigate(['/users', this.userId, 'update']);
  }

  getDisplayName(user: UserSummary): string {
    if (user.name) {
      return user.name;
    }
    const given = user.attributes?.given_name;
    const family = user.attributes?.family_name;
    return [given, family].filter(Boolean).join(' ') || user.email;
  }
}
