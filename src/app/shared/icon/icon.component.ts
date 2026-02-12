import { NgClass, NgSwitch, NgSwitchCase } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-icon',
  imports: [NgSwitchCase, NgClass, NgSwitch],
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.css',
})
export class IconComponent {
  @Input() name!: string;
  @Input() class = '';
}
