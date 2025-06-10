// src/app/core/services/templates/template.service.ts

import { Injectable } from '@angular/core';
import { HttpClient }    from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, delay }     from 'rxjs/operators';
import { Template }                   from '../../models/templates/template.model';

interface MockTemplatesResponse {
  templates: Template[];
}

@Injectable({
  providedIn: 'root'
})
export class TemplateService {
  private mockUrl = 'assets/mock-templates.json';
  private cache: Template[] = [];

  constructor(private http: HttpClient) {}

  private loadTemplates(): Observable<Template[]> {
    if (this.cache.length) {
      return of(this.cache);
    }
    return this.http.get<MockTemplatesResponse>(this.mockUrl).pipe(
      delay(500),
      map(res => {
        this.cache = res.templates.map(t => ({
          ...t,
          creationDate: new Date(t.creationDate),
          registerDate: t.registerDate ? new Date(t.registerDate) : undefined,
          updateDate:   t.updateDate   ? new Date(t.updateDate)   : undefined
        }));
        return this.cache;
      })
    );
  }

  /** Obtener todos los templates */
  getAllTemplates(): Observable<Template[]> {
    return this.loadTemplates();
  }

  /** Obtener un template por ID */
  getTemplateById(id: string): Observable<Template> {
    return this.loadTemplates().pipe(
      map(list => {
        const found = list.find(t => t.id === id);
        if (!found) {
          throw new Error('Template not found');
        }
        return found;
      }),
      catchError(err => throwError(() => new Error(err.message)))
    );
  }

  /** Crear un nuevo template */
  createTemplate(template: Template): Observable<Template> {
    const newTpl: Template = {
      ...template,
      id:           (Math.random() * 1e6).toFixed(0),
      creationDate: new Date(),
      registerDate: new Date(),
      updateDate:   new Date(),
      updatedBy:    template.createdBy
    };
    this.cache.push(newTpl);
    return of(newTpl).pipe(delay(500));
  }

  /** Actualizar un template existente */
  updateTemplate(template: Template): Observable<Template> {
    return this.loadTemplates().pipe(
      map(list => {
        const idx = list.findIndex(t => t.id === template.id);
        if (idx < 0) {
          throw new Error('Template not found');
        }
        const updated = { ...list[idx], ...template, updateDate: new Date() };
        list[idx] = updated;
        return updated;
      }),
      catchError(err => throwError(() => new Error(err.message)))
    );
  }

  /** Eliminar un template por ID */
  deleteTemplate(id: string): Observable<void> {
    return this.loadTemplates().pipe(
      map(list => {
        const idx = list.findIndex(t => t.id === id);
        if (idx < 0) {
          throw new Error('Template not found');
        }
        list.splice(idx, 1);
      }),
      delay(500)
    );
  }
}
