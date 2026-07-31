import { Injectable, inject } from '@angular/core';
import { ToastObserver, VerificationResult } from './toast-observer.service';
import { RouterObserver } from './router-observer.service';

@Injectable({
  providedIn: 'root'
})
export class VerificationLayer {
  private toastObserver = inject(ToastObserver);
  private routerObserver = inject(RouterObserver);

  async verifyAction(action: any, expectedOutcomeType: string): Promise<VerificationResult> {
    if (expectedOutcomeType === 'ROUTE_CHANGED') {
        return await this.routerObserver.waitForNavigation();
    }
    
    if (expectedOutcomeType === 'TOAST_SHOWN') {
        return await this.toastObserver.waitForToast();
    }
    
    if (expectedOutcomeType === 'FORM_VALID') {
        // Form validity check would go here, often tied to a Toast or Route change anyway.
        // For now, delegate to Toast if a validation error toast is shown.
        return await this.toastObserver.waitForToast();
    }

    // Default: assume success if no verification required or unknown type
    return { success: true };
  }
}
