import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { SecureStorageService } from '../services/secure-storage.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isApiRequest = req.url.startsWith(environment.apiUrl);

  if (!isApiRequest) {
    return next(req);
  }

  const secureStorage = inject(SecureStorageService);
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

  return next(clonedReq);
};
