import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { PricingModalComponent } from '../../../shared/components/pricing-modal/pricing-modal.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, FooterComponent, PricingModalComponent],
  templateUrl: './layout.component.html'
})
export class LayoutComponent {
  showPricingModal = false

  openPricingModal(): void {
    this.showPricingModal = true
  }

  closePricingModal(): void {
    this.showPricingModal = false
  }
}
