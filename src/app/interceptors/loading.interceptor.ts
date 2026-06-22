import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoadingService } from '../services/loading.service';
import { finalize } from 'rxjs';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);
  
  // Skip showing the loader for background polling requests
  const skipUrls = [
    '/analytics',
    '/notifications',
    '/edit-requests',
    '/broadcast-history'
  ];
  
  const shouldSkipLoader = skipUrls.some(url => req.url.includes(url));
  
  if (!shouldSkipLoader) {
    loadingService.show();
  }

  return next(req).pipe(
    finalize(() => {
      if (!shouldSkipLoader) {
        loadingService.hide();
      }
    })
  );
};
