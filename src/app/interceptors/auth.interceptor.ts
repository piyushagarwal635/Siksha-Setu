import { inject, Injector } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { SecureStorageService } from '../services/secure-storage.service';
import { environment } from '../../environments/environment';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Router } from '@angular/router';
import { ToastService } from '../services/toast.service';
import { UserService } from '../services/user.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isApiRequest = req.url.startsWith(environment.apiUrl);

  if (!isApiRequest) {
    return next(req);
  }

  const secureStorage = inject(SecureStorageService);
  const router = inject(Router);
  const injector = inject(Injector);
  
  const token = secureStorage.getItem('token');
  const authUserStr = secureStorage.getItem('authUser');

  let userId = '';
  if (authUserStr) {
    try {
      const user = JSON.parse(authUserStr);
      userId = user.disabilityId || user.adminId || '';
    } catch (e) {}
  }

  let consent: string | null = null;
  if (typeof window !== 'undefined' && userId) {
    consent = localStorage.getItem(`cookieConsent_${userId}`);
  }

  let headers = req.headers;
  if (consent) {
    headers = headers.set('X-Cookie-Consent', consent);
  }
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  const useCredentials = (consent === 'accepted');

  const clonedReq = req.clone({
    withCredentials: useCredentials,
    headers: headers
  });

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && typeof window !== 'undefined') {
        // Check if this is a silent/background request — if so, ignore it to avoid false logouts
        const isSilent = req.url.includes('?silent=true') || req.url.includes('&silent=true');
        if (isSilent) {
          return throwError(() => error);
        }
        
        // Grace period: Ignore 401s within 5 seconds of login (prevents race conditions after signup)
        const loginTime = parseInt(secureStorage.getItem('session_established_at') || '0', 10);
        const isWithinGracePeriod = loginTime > 0 && (Date.now() - loginTime) < 5000;
        if (isWithinGracePeriod) {
          console.warn('[Auth] 401 within grace period after login, ignoring:', req.url);
          return throwError(() => error);
        }
        
        // Prevent infinite alert loop if already logged out
        if (secureStorage.getItem('token')) {
            // Get services dynamically to avoid circular DI issues
            const toastService = injector.get(ToastService);
            const userService = injector.get(UserService);
            
            // Call the proper logout method to clear Angular state without reloading page
            userService.logout();
            
            // Navigate first, then show the beautiful toast notification
            router.navigate(['/']).then(() => {
                toastService.error(
                    "You have been logged out because your account was accessed from another device.", 
                    "Session Expired", 
                    7000
                );
            });
        }
      }
      return throwError(() => error);
    })
  );
};
