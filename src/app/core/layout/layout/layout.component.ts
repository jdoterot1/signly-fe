import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, take } from 'rxjs/operators';

import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { PricingModalComponent } from '../../../shared/components/pricing-modal/pricing-modal.component';
import { PricingService } from '../../services/pricing/pricing.service';
import { WalletService } from '../../services/wallet/wallet.service';
import { PricingMeter } from '../../models/pricing/pricing.model';
import { WalletInfo } from '../../models/wallet/wallet.model';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, FooterComponent, PricingModalComponent],
  templateUrl: './layout.component.html'
})
export class LayoutComponent {
  showPricingModal = false
  isPreparingPricingModal = false
  prefetchedMeters: PricingMeter[] | null = null
  prefetchedWallet: WalletInfo | null = null

  constructor(
    private pricingService: PricingService,
    private walletService: WalletService
  ) {}

  openPricingModal(): void {
    if (this.isPreparingPricingModal) {
      return
    }

    this.isPreparingPricingModal = true
    forkJoin({
      meters: this.pricingService.listPricingMeters().pipe(catchError(() => of([] as PricingMeter[]))),
      wallet: this.walletService.getWallet().pipe(catchError(() => of(null)))
    })
      .pipe(
        take(1),
        finalize(() => (this.isPreparingPricingModal = false))
      )
      .subscribe(({ meters, wallet }) => {
        this.prefetchedMeters = meters
        this.prefetchedWallet = wallet
        this.showPricingModal = true
      })
  }

  closePricingModal(): void {
    this.showPricingModal = false
    this.prefetchedMeters = null
    this.prefetchedWallet = null
  }
}
