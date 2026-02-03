import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Guard that detects Wompi payment redirect parameters and redirects to the payment status page.
 * Wompi redirects with ?id=xxx&env=xxx parameters to the root URL.
 */
export const paymentRedirectGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const queryParams = route.queryParamMap;

  // Detect Wompi redirect parameters
  const wompiId = queryParams.get('id');
  const wompiEnv = queryParams.get('env');

  // If we have a Wompi transaction ID, redirect to payment status page
  if (wompiId) {
    const params: Record<string, string> = { id: wompiId };
    if (wompiEnv && wompiEnv !== 'undefined') {
      params['env'] = wompiEnv;
    }

    // Redirect to payment return page with the parameters
    router.navigate(['/billing/payment/return'], { queryParams: params });
    return false;
  }

  return true;
};
