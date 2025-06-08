// src/app/core/services/documents/document.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, delay } from 'rxjs/operators';
import { Document } from '../../models/documents/document.model';

interface MockDocumentsResponse {
  documents: Document[];
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private mockUrl = 'assets/mock-documents.json';
  private documentsCache: Document[] = [];

  constructor(private http: HttpClient) {}

  private loadDocuments(): Observable<Document[]> {
    if (this.documentsCache.length) {
      return of(this.documentsCache);
    }
    return this.http.get<MockDocumentsResponse>(this.mockUrl).pipe(
      delay(500),
      map(res => {
        this.documentsCache = res.documents.map(doc => ({
          ...doc,
          creationDate: new Date(doc.creationDate),
          registerDate: doc.registerDate ? new Date(doc.registerDate) : undefined,
          updateDate: doc.updateDate ? new Date(doc.updateDate) : undefined
        }));
        return this.documentsCache;
      })
    );
  }

  /** Obtener todos los documentos */
  getAllDocuments(): Observable<Document[]> {
    return this.loadDocuments();
  }

  /** Obtener un documento por ID */
  getDocumentById(id: string): Observable<Document> {
    return this.loadDocuments().pipe(
      map(docs => {
        const found = docs.find(d => d.id === id);
        if (!found) {
          throw new Error('Documento no encontrado');
        }
        return found;
      }),
      catchError(err => throwError(() => new Error(err.message)))
    );
  }

  /** Crear un nuevo documento */
  createDocument(doc: Document): Observable<Document> {
    const newDoc: Document = {
      ...doc,
      id: (Math.random() * 1e6).toFixed(0),
      creationDate: new Date(),
      registerDate: new Date(),
      updatedBy: doc.createdBy,
      updateDate: new Date()
    };
    this.documentsCache.push(newDoc);
    return of(newDoc).pipe(delay(500));
  }

  /** Actualizar un documento existente */
  updateDocument(doc: Document): Observable<Document> {
    return this.loadDocuments().pipe(
      map(docs => {
        const idx = docs.findIndex(d => d.id === doc.id);
        if (idx < 0) {
          throw new Error('Documento no encontrado');
        }
        const updated = { ...docs[idx], ...doc, updateDate: new Date() };
        docs[idx] = updated;
        return updated;
      }),
      catchError(err => throwError(() => new Error(err.message)))
    );
  }

  /** Eliminar un documento por ID */
  deleteDocument(id: string): Observable<void> {
    return this.loadDocuments().pipe(
      map(docs => {
        const idx = docs.findIndex(d => d.id === id);
        if (idx < 0) {
          throw new Error('Documento no encontrado');
        }
        docs.splice(idx, 1);
      }),
      delay(500)
    );
  }
}
