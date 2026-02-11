// src/app/core/guards/auth.guard.ts

import { inject } from '@angular/core';
import {
  CanActivateChildFn,
  CanActivateFn,
  Router,
  UrlTree
} from '@angular/router';

import { AuthService } from '../services/auth/auth.service';

const ensureAuthenticated = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

export const authGuard: CanActivateFn = () => ensureAuthenticated();

export const authChildGuard: CanActivateChildFn = () => ensureAuthenticated();
