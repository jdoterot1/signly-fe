import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { ApiResponse } from '../../models/auth/auth-session.model';
import { Role } from '../../models/roles/roles.model';

interface CreateRoleRequest {
  roleId: string;
  roleName: string;
  description?: string;
  permissions: string[];
}

interface UpdateRoleRequest {
  roleName?: string;
  description?: string;
  permissions?: string[];
}

interface RolePermissionsResponse {
  roleId: string;
  permissions: string[];
}

interface RoleUserResponse {
  userSub: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

interface AssignRoleRequest {
  userSub: string;
}

interface PatchPermissionsRequest {
  add?: string[];
  remove?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private readonly baseUrl = `${environment.apiBaseUrl}/roles`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  getRoles(limit = 20, nextToken?: string): Observable<Role[]> {
    let params = new HttpParams().set('limit', String(limit));
    if (nextToken) {
      params = params.set('nextToken', nextToken);
    }

    return this.executeWithHeaders(headers =>
      this.http
        .get<ApiResponse<Role[]>>(this.baseUrl, {
          headers,
          params
        })
      .pipe(
        map(res => res.data ?? []),
        catchError(err => this.handleError(err))
      )
    );
  }

  getRoleById(roleId: string): Observable<Role> {
    return this.executeWithHeaders(headers =>
      this.http
        .get<ApiResponse<Role>>(`${this.baseUrl}/${roleId}`, {
          headers
        })
      .pipe(
        map(res => res.data),
        catchError(err => this.handleError(err))
      )
    );
  }

  createRole(payload: CreateRoleRequest): Observable<Role> {
    return this.executeWithHeaders(headers =>
      this.http
        .post<ApiResponse<Role>>(this.baseUrl, payload, {
          headers
        })
      .pipe(
        map(res => res.data),
        catchError(err => this.handleError(err))
      ),
      true
    );
  }

  updateRole(roleId: string, payload: UpdateRoleRequest): Observable<Role> {
    return this.executeWithHeaders(headers =>
      this.http
        .put<ApiResponse<Role>>(`${this.baseUrl}/${roleId}`, payload, {
          headers
        })
      .pipe(
        map(res => res.data),
        catchError(err => this.handleError(err))
      ),
      true
    );
  }

  deleteRole(roleId: string): Observable<void> {
    return this.executeWithHeaders(headers =>
      this.http
        .delete<ApiResponse<{ roleId: string }>>(`${this.baseUrl}/${roleId}`, {
          headers
        })
      .pipe(
        map(() => void 0),
        catchError(err => this.handleError(err))
      )
    );
  }

  getRolePermissions(roleId: string): Observable<RolePermissionsResponse> {
    return this.executeWithHeaders(headers =>
      this.http
        .get<ApiResponse<RolePermissionsResponse>>(`${this.baseUrl}/${roleId}/permissions`, {
          headers
        })
      .pipe(
        map(res => res.data),
        catchError(err => this.handleError(err))
      )
    );
  }

  putRolePermissions(roleId: string, permissions: string[]): Observable<Role> {
    return this.executeWithHeaders(headers =>
      this.http
        .put<ApiResponse<Role>>(
          `${this.baseUrl}/${roleId}/permissions`,
          { permissions },
          { headers }
        )
      .pipe(
        map(res => res.data),
        catchError(err => this.handleError(err))
      ),
      true
    );
  }

  patchRolePermissions(roleId: string, payload: PatchPermissionsRequest): Observable<Role> {
    return this.executeWithHeaders(headers =>
      this.http
        .patch<ApiResponse<Role>>(`${this.baseUrl}/${roleId}/permissions`, payload, {
          headers
        })
      .pipe(
        map(res => res.data),
        catchError(err => this.handleError(err))
      ),
      true
    );
  }

  getRoleUsers(roleId: string, limit = 50): Observable<RoleUserResponse[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.executeWithHeaders(headers =>
      this.http
        .get<ApiResponse<RoleUserResponse[]>>(`${this.baseUrl}/${roleId}/users`, {
          headers,
          params
        })
      .pipe(
        map(res => res.data ?? []),
        catchError(err => this.handleError(err))
      )
    );
  }

  assignRoleToUser(roleId: string, payload: AssignRoleRequest): Observable<RoleUserResponse> {
    return this.executeWithHeaders(headers =>
      this.http
        .put<ApiResponse<RoleUserResponse>>(`${this.baseUrl}/${roleId}/users`, payload, {
          headers
        })
      .pipe(
        map(res => res.data),
        catchError(err => this.handleError(err))
      ),
      true
    );
  }

  removeRoleFromUser(roleId: string, userSub: string): Observable<void> {
    return this.executeWithHeaders(headers =>
      this.http
        .delete<ApiResponse<{ userSub: string }>>(`${this.baseUrl}/${roleId}/users/${userSub}`, {
          headers
        })
      .pipe(
        map(() => void 0),
        catchError(err => this.handleError(err))
      )
    );
  }

  private getSignlyHeaders(includeJson = false): HttpHeaders {
    const token = this.authService.getAccessToken();
    let headers = new HttpHeaders();
    if (!token) {
      throw new Error('No existe una sesión activa para ejecutar esta operación.');
    }
    headers = headers.set('X-Auth-Signly', `Bearer ${token}`);
    if (includeJson) {
      headers = headers.set('Content-Type', 'application/json');
    }
    return headers;
  }

  private executeWithHeaders<T>(fn: (headers: HttpHeaders) => Observable<T>, includeJson = false): Observable<T> {
    try {
      const headers = this.getSignlyHeaders(includeJson);
      return fn(headers);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo obtener la sesión activa.';
      return throwError(() => new Error(message));
    }
  }

  private handleError(error: any) {
    const message =
      error?.error?.message ||
      error?.message ||
      'Ocurrió un error al procesar la solicitud.';
    return throwError(() => new Error(message));
  }
}
