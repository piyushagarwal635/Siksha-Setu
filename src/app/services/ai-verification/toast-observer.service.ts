import { Injectable, inject } from '@angular/core';
import { ToastService, ToastEvent } from '../toast.service';
import { filter, firstValueFrom, timer, race } from 'rxjs';
import { map } from 'rxjs/operators';

export interface VerificationResult {
    success: boolean;
    message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastObserver {
  private toastService = inject(ToastService);

  async waitForToast(timeoutMs: number = 5000): Promise<VerificationResult> {
    const toastPromise = firstValueFrom(
        this.toastService.toastEvents$.pipe(
            map((event: ToastEvent) => {
                return {
                    success: event.type === 'success' || event.type === 'info',
                    message: event.message
                };
            })
        )
    );

    const timeoutPromise = firstValueFrom(timer(timeoutMs).pipe(
        map(() => ({ success: false, message: 'Timeout waiting for toast' }))
    ));

    return Promise.race([toastPromise, timeoutPromise]);
  }
}
