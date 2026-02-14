import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';

import { AuthService } from '../services/auth/auth.service';

@Injectable()
export class AuthRefreshInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshDone$ = new Subject<void>();
  private readonly retryHeader = 'X-Refresh-Retry';
  private readonly skipRefreshPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/logout',
    '/auth/password/forgot',
    '/auth/password/confirm',
    '/auth/password/complete',
    '/auth/token/refresh'
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error: unknown) => {
        if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
          return throwError(() => error);
        }

        if (this.shouldSkipRefresh(req.url) || this.hasRetried(req)) {
          return throwError(() => error);
        }

        return this.handleUnauthorized(req, next);
      })
    );
  }

  private handleUnauthorized(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.isRefreshing) {
      return this.refreshDone$.pipe(
        take(1),
        switchMap(() => next.handle(this.withLatestToken(this.markRetried(req))))
      );
    }

    this.isRefreshing = true;
    this.refreshDone$ = new Subject<void>();

    return this.authService.refreshToken().pipe(
      switchMap(() => {
        this.isRefreshing = false;
        this.refreshDone$.next();
        this.refreshDone$.complete();
        return next.handle(this.withLatestToken(this.markRetried(req)));
      }),
      catchError(refreshError => {
        this.isRefreshing = false;
        this.refreshDone$.error(refreshError);
        this.router.navigate(['/login']);
        return throwError(() => refreshError);
      })
    );
  }

  private markRetried(req: HttpRequest<unknown>): HttpRequest<unknown> {
    return req.clone({ setHeaders: { [this.retryHeader]: '1' } });
  }

  private hasRetried(req: HttpRequest<unknown>): boolean {
    return req.headers.get(this.retryHeader) === '1';
  }

  private withLatestToken(req: HttpRequest<unknown>): HttpRequest<unknown> {
    const token = this.authService.getAccessToken();
    if (!token) {
      return req;
    }

    let headers = req.headers;
    if (headers.has('X-Auth-Signly')) {
      headers = headers.set('X-Auth-Signly', `Bearer ${token}`);
    }
    if (headers.has('Authorization')) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return req.clone({ headers });
  }

  private shouldSkipRefresh(url: string): boolean {
    return this.skipRefreshPaths.some(path => url.includes(path));
  }
}
