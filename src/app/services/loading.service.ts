import { Injectable } from '@angular/core';
import { BehaviorSubject, delay } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private activeRequests = 0;
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  
  isLoading$ = this.isLoadingSubject.asObservable().pipe(delay(0));

  show() {
    this.activeRequests++;
    this.isLoadingSubject.next(true);
  }

  hide() {
    this.activeRequests--;
    if (this.activeRequests <= 0) {
      this.activeRequests = 0;
      this.isLoadingSubject.next(false);
    }
  }
}
