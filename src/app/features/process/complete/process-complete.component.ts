import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-process-complete',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './process-complete.component.html'
})
export class ProcessCompleteComponent {}
