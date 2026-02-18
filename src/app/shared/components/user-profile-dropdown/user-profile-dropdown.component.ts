import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-user-profile-dropdown',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './user-profile-dropdown.component.html'
})
export class UserProfileDropdownComponent {
  @Input() userName = 'Juan Otero';
  @Input() userEmail = 'juanoterot@outlook.com';
  @Input() accountInfo = 'Account #224168021';
  @Input() displayName = 'Juan Otero';

  @Output() logOut = new EventEmitter<void>();
  @Output() manageProfile = new EventEmitter<void>();

  onLogOut(): void {
    this.logOut.emit();
  }

  onManageProfile(): void {
    this.manageProfile.emit();
  }
}
