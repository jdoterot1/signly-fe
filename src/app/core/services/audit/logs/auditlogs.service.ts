// src/app/core/services/audit/audit.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, delay } from 'rxjs/operators';
import { AuditLog } from '../../../models/audit/auditlogs.model';

interface MockAuditLogsResponse {
  auditLogs: AuditLog[];
}

@Injectable({
  providedIn: 'root'
})
export class AuditlogService {
  private mockUrl = 'assets/mock-documentlogs.json';
  private cache: AuditLog[] = [];

  constructor(private http: HttpClient) {}

  private loadAuditLogs(): Observable<AuditLog[]> {
    if (this.cache.length) {
      return of(this.cache);
    }
    return this.http.get<MockAuditLogsResponse>(this.mockUrl).pipe(
      delay(500),
      map(res => {
        this.cache = res.auditLogs;
        return this.cache;
      })
    );
  }

  /** Obtener todos los registros por ID de documento */
  getLogsByDocumentId(idDocument: string): Observable<AuditLog[]> {
    return this.loadAuditLogs().pipe(
      map(logs => logs.filter(log => log.id_document === idDocument))
    );
  }
}
