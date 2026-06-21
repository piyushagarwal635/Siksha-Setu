import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AccessibilityWidgetComponent } from './shared/components/accessibility-widget/accessibility-widget.component';
import { AccessibilityService } from './services/accessibility.service';
import { UserService } from './services/user.service';
import { LoadingService } from './services/loading.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AccessibilityWidgetComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private loadingService = inject(LoadingService);
  private accessibilityService = inject(AccessibilityService);
  private userService = inject(UserService);
  private platformId = inject(PLATFORM_ID);

  isLoading$ = this.loadingService.isLoading$;
  showCookieBanner = false;

  ngOnInit(): void {
    this.accessibilityService.loadSettings();
    this.accessibilityService.applyAllStyles();

    if (isPlatformBrowser(this.platformId)) {
      this.userService.currentUser$.subscribe(user => {
        if (user) {
          const userId = user.disabilityId || user.adminId || '';
          const consent = localStorage.getItem(`cookieConsent_${userId}`);
          if (!consent) {
            setTimeout(() => {
              this.showCookieBanner = true;
            }, 1000);
          } else {
            this.showCookieBanner = false;
          }
        } else {
          this.showCookieBanner = false;
        }
      });
    }
  }

  acceptCookies(): void {
    this.showCookieBanner = false;
    this.userService.updateCookieConsent('accepted').subscribe({
      next: () => console.log('Cookie consent accepted updated on backend'),
      error: (err) => console.error('Error updating consent:', err)
    });
  }

  declineCookies(): void {
    this.showCookieBanner = false;
    this.userService.updateCookieConsent('rejected').subscribe({
      next: () => console.log('Cookie consent rejected updated on backend'),
      error: (err) => console.error('Error updating consent:', err)
    });
  }
}
