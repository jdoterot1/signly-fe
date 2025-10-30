import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, delay } from 'rxjs/operators';
import { User } from '../../models/auth/user.model';

interface MockUsersResponse {
  users: User[];
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private mockUrl = 'assets/mock-users.json';
  private cache: User[] = [];

  constructor(private http: HttpClient) {}

  private loadUsers(): Observable<User[]> {
    if (this.cache.length) {
      return of(this.cache);
    }
    return this.http.get<MockUsersResponse>(this.mockUrl).pipe(
      delay(500),
      map(res => {
        // Asegurar que todos tengan ID
        this.cache = res.users.map((u, index) => ({
          id: u.id || (index + 1).toString(),
          ...u
        }));
        return this.cache;
      })
    );
  }

  /** Obtener todos los usuarios */
  getAllUsers(): Observable<User[]> {
    return this.loadUsers();
  }

  /** Obtener un usuario por ID */
  getUserById(id: string): Observable<User> {
    return this.loadUsers().pipe(
      map(list => {
        const found = list.find(u => u.id === id);
        if (!found) throw new Error('Usuario no encontrado');
        return found;
      }),
      catchError(err => throwError(() => new Error(err.message)))
    );
  }

  /** Crear nuevo usuario */
  createUser(user: User): Observable<User> {
    const newUser: User = {
      ...user,
      id: (Math.random() * 1e6).toFixed(0) // Generar ID falso
    };
    this.cache.push(newUser);
    return of(newUser).pipe(delay(500));
  }

  /** Actualizar usuario existente por ID */
  updateUser(updatedUser: User): Observable<User> {
    return this.loadUsers().pipe(
      map(list => {
        const idx = list.findIndex(u => u.id === updatedUser.id);
        if (idx < 0) throw new Error('Usuario no encontrado');
        const updated = { ...list[idx], ...updatedUser };
        list[idx] = updated;
        return updated;
      }),
      catchError(err => throwError(() => new Error(err.message)))
    );
  }

  /** Eliminar usuario por ID */
  deleteUser(id: string): Observable<void> {
    return this.loadUsers().pipe(
      map(list => {
        const idx = list.findIndex(u => u.id === id);
        if (idx < 0) throw new Error('Usuario no encontrado');
        list.splice(idx, 1);
      }),
      delay(500)
    );
  }
}
