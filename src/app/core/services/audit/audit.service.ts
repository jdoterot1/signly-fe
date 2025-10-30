import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, delay } from 'rxjs/operators';
import { Document } from '../../models/documents/document.model';

interface MockAuditsResponse {
  documents: Document[];
}

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private mockUrl = 'assets/mock-documents.json';
  private cache: Document[] = [];

  constructor(private http: HttpClient) {}

  private loadAudits(): Observable<Document[]> {
    if (this.cache.length) {
      return of(this.cache);
    }
    return this.http.get<MockAuditsResponse>(this.mockUrl).pipe(
      delay(500),
      map(res => {
        this.cache = res.documents.map(audit => ({
          ...audit,
          creationDate: new Date(audit.creationDate),
          registerDate: audit.registerDate ? new Date(audit.registerDate) : undefined,
          updateDate: audit.updateDate ? new Date(audit.updateDate) : undefined
        }));
        return this.cache;
      })
    );
  }

  /** Obtener todos los audits */
  getAllAudits(): Observable<Document[]> {
    return this.loadAudits();
  }

  /** Obtener un audit por ID */
  getAuditById(id: string): Observable<Document> {
    return this.loadAudits().pipe(
      map(list => {
        const found = list.find(a => a.id === id);
        if (!found) {
          throw new Error('Auditoría no encontrada');
        }
        return found;
      }),
      catchError(err => throwError(() => new Error(err.message)))
    );
  }

}
