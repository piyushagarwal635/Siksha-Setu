import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  provideHttpClient,
  withFetch,
  withInterceptors
} from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { loadingInterceptor } from './interceptors/loading.interceptor';
import { SecureStorageService } from './services/secure-storage.service';

export function initializeSecureStorage(secureStorage: SecureStorageService) {
  return () => secureStorage.initialize();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor, loadingInterceptor])
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeSecureStorage,
      deps: [SecureStorageService],
      multi: true
    }
  ]
};