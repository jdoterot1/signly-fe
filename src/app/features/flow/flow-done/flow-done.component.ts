import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-flow-done',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './flow-done.component.html'
})
export class FlowDoneComponent implements OnInit {
  processId = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.processId = this.route.snapshot.paramMap.get('processId') ?? '';
  }

  tryCloseWindow(): void {
    window.close();
  }
}
