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
export class AuthService {
  private mockUrl = 'assets/mock-users.json';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<User> {
    return this.http.get<MockUsersResponse>(this.mockUrl).pipe(
      delay(500),
      map(res => {
        const user = res.users.find(u => u.email === email && u.password === password);
        if (!user) {
          throw new Error('Credenciales inválidas');
        }
        return user;
      }),
      catchError(err => {
        return throwError(() => new Error(err.message || 'Email o contraseña incorrectos'));
      })
    );
  }


  forgotPassword(email: string): Observable<void> {
    // Aquí podrías hacer una llamada real al backend que envíe un correo.
    // Para mock, validamos que exista el usuario en mock-users.json:
    return this.http.get<MockUsersResponse>(this.mockUrl).pipe(
      delay(500),
      map(res => {
        const found = res.users.some(u => u.email === email);
        if (!found) {
          throw new Error('Ese correo no está registrado');
        }
        // Si existe, simulamos que se envía el correo
        return;
      }),
      catchError(err => {
        // Propagamos el error al componente
        return throwError(() => new Error(err.message || 'Error al procesar Forgot Password'));
      })
    );
  }

  verifyOtp(otp: string): Observable<void> {
    // Simulamos una llamada al backend que siempre responde OK tras 500 ms.
    return of(void 0).pipe(delay(500));
  }
}
