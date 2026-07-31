import { Injectable, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

export interface PageDescriptor {
  pageId: string;
  route: string;
  pageTitle?: string;
  purpose: string;
  pageCategory: string;
  audienceRole?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RouteSemanticAnalyzer implements OnDestroy {
  private state = new BehaviorSubject<PageDescriptor | null>(null);
  public pageState$: Observable<PageDescriptor | null> = this.state.asObservable();
  private destroy$ = new Subject<void>();

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: any) => {
      this.analyzeRoute(event.urlAfterRedirects);
    });
    
    // Initial analysis
    setTimeout(() => this.analyzeRoute(this.router.url), 100);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private analyzeRoute(url: string) {
    // In Phase 2 this will read from the Page Catalog. For now, derived from URL.
    let pageId = 'general';
    if (url === '/' || url === '') {
      pageId = 'home';
    } else {
      const parts = url.split('/').filter(p => p);
      if (parts.length > 0) pageId = parts[0];
    }
    
    let descriptor: PageDescriptor = {
      pageId: pageId,
      route: url,
      purpose: 'General platform page',
      pageCategory: 'GENERAL'
    };

    if (url.includes('login')) {
      descriptor = { pageId: 'login', route: url, purpose: 'User sign-in', pageCategory: 'AUTH' };
    } else if (url.includes('signup')) {
      descriptor = { pageId: 'signup', route: url, purpose: 'New account creation', pageCategory: 'AUTH' };
    } else if (url.includes('student-dashboard')) {
      descriptor = { pageId: 'student-dashboard', route: url, purpose: 'Student learning hub and progress', pageCategory: 'DASHBOARD' };
    } else if (url.includes('courses')) {
      descriptor = { pageId: 'courses', route: url, purpose: 'Browse available courses', pageCategory: 'LEARNING' };
    } else if (url.includes('secure-test')) {
      descriptor = { pageId: 'secure-test', route: url, purpose: 'Assessment / Quiz', pageCategory: 'ASSESSMENT' };
    } else if (url.includes('settings')) {
      descriptor = { pageId: 'settings', route: url, purpose: 'User Profile and Accessibility Settings', pageCategory: 'SETTINGS' };
    }

    this.state.next(descriptor);
  }
}
