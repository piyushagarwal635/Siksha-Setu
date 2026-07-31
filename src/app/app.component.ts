import { Component, OnInit, inject, PLATFORM_ID, HostListener, AfterViewInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AccessibilityWidgetComponent } from './shared/components/accessibility-widget/accessibility-widget.component';
import { AiVoiceIndicatorComponent } from './shared/components/ai-voice-indicator/ai-voice-indicator.component';
import { AccessibilityService } from './services/accessibility.service';
import { UserService } from './services/user.service';
import { AiVoiceAssistantService } from './services/ai-voice-assistant.service';
import { LoadingService } from './services/loading.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AccessibilityWidgetComponent, AiVoiceIndicatorComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit {
  private loadingService = inject(LoadingService);
  private accessibilityService = inject(AccessibilityService);
  private userService = inject(UserService);
  private aiVoiceService = inject(AiVoiceAssistantService);
  private platformId = inject(PLATFORM_ID);

  isLoading$ = this.loadingService.isLoading$;
  showCookieBanner = false;
  showSplash = true;
  private interactionDone = false;

  @HostListener('document:click')
  @HostListener('document:keydown')
  initializeOnInteraction() {
    if (!this.interactionDone) {
      this.interactionDone = true;
      this.aiVoiceService.executeCommand('CMD_ACTIVATE', { isFirstInteraction: true });
    }
  }

  ngOnInit(): void {
    this.accessibilityService.loadSettings();
    this.accessibilityService.applyAllStyles();
    this.aiVoiceService.initAssistant();

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

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Splash screen animation
      setTimeout(() => {
        const tl = gsap.timeline();
        
        // Logo pop in with glow
        tl.fromTo('.splash-logo', 
          { scale: 0.5, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(1.5)' }
        )
        // Zoom into the logo and fade out to reveal the website
        .to('.splash-logo', {
          scale: 15,
          opacity: 0,
          duration: 0.5,
          ease: 'power3.in',
          delay: 0.4
        })
        // Fade out the blur background concurrently
        .to('.splash-screen', {
          opacity: 0,
          duration: 0.4,
          ease: 'power2.out',
          onComplete: () => {
            this.showSplash = false;
          }
        }, "-=0.3");
      }, 100);
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
