import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd, NavigationError, NavigationCancel } from '@angular/router';
import { filter, firstValueFrom, timer, race } from 'rxjs';
import { map } from 'rxjs/operators';
import { VerificationResult } from './toast-observer.service';

@Injectable({
  providedIn: 'root'
})
export class RouterObserver {
  private router = inject(Router);

  async waitForNavigation(timeoutMs: number = 5000): Promise<VerificationResult> {
    const navPromise = firstValueFrom(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd || event instanceof NavigationError || event instanceof NavigationCancel),
        map(event => {
          if (event instanceof NavigationEnd) {
            return { success: true, message: 'Navigation successful' };
          }
          return { success: false, message: 'Navigation failed or cancelled' };
        })
      )
    );

    const timeoutPromise = firstValueFrom(timer(timeoutMs).pipe(
        map(() => ({ success: false, message: 'Timeout waiting for navigation' }))
    ));

    return Promise.race([navPromise, timeoutPromise]);
  }
}
