// src/app/core/layout/layout/layout.component.ts

import { Component }            from '@angular/core';
import { CommonModule }         from '@angular/common';
import { RouterOutlet }         from '@angular/router';

import { HeaderComponent }      from '../header/header.component';
import { SidebarComponent }     from '../sidebar/sidebar.component';
import { FooterComponent }      from '../footer/footer.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,     // *ngIf, *ngFor…
    RouterOutlet,     // <router-outlet>
    HeaderComponent,  // <app-header>
    SidebarComponent, // <app-sidebar>
    FooterComponent   // <app-footer>
  ],
  templateUrl: './layout.component.html'
})
export class LayoutComponent {}
