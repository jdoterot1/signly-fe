import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, delay } from 'rxjs/operators';
import { Role } from '../../models/roles/roles.model';

interface MockRolesResponse {
  roles: Role[];
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private mockUrl = 'assets/mock-roles.json';
  private cache: Role[] = [];

  constructor(private http: HttpClient) {}

  private loadRoles(): Observable<Role[]> {
    if (this.cache.length) {
      return of(this.cache);
    }
    return this.http.get<MockRolesResponse>(this.mockUrl).pipe(
      delay(500),
      map(res => {
        this.cache = res.roles.map(r => ({ ...r }));
        return this.cache;
      })
    );
  }

  /** Obtener todos los roles */
  getAllRoles(): Observable<Role[]> {
    return this.loadRoles();
  }

  /** Obtener un rol por ID */
  getRoleById(id: string): Observable<Role> {
    return this.loadRoles().pipe(
      map(list => {
        const found = list.find(r => r.id === id);
        if (!found) throw new Error('Rol no encontrado');
        return found;
      }),
      catchError(err => throwError(() => new Error(err.message)))
    );
  }

  /** Crear nuevo rol */
  createRole(role: Role): Observable<Role> {
    const newRole: Role = {
      ...role,
      id: (Math.random() * 1e6).toFixed(0)
    };
    this.cache.push(newRole);
    return of(newRole).pipe(delay(500));
  }

  /** Actualizar rol existente */
  updateRole(updatedRole: Role): Observable<Role> {
    return this.loadRoles().pipe(
      map(list => {
        const idx = list.findIndex(r => r.id === updatedRole.id);
        if (idx < 0) throw new Error('Rol no encontrado');
        const updated = { ...list[idx], ...updatedRole };
        list[idx] = updated;
        return updated;
      }),
      catchError(err => throwError(() => new Error(err.message)))
    );
  }

  /** Eliminar rol por ID */
  deleteRole(id: string): Observable<void> {
    return this.loadRoles().pipe(
      map(list => {
        const idx = list.findIndex(r => r.id === id);
        if (idx < 0) throw new Error('Rol no encontrado');
        list.splice(idx, 1);
      }),
      delay(500)
    );
  }
}
