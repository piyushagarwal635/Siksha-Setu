import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UserService } from '../user.service';

export interface ExperienceProfile {
  guidanceDepth: 'DETAILED' | 'STANDARD' | 'TERSE';
  confirmationStyle: 'EXPLICIT' | 'IMPLICIT';
  speechSpeed: number; // 0.5 to 2.0
  accessibilityNeeds: string[]; // e.g., 'HIGH_CONTRAST', 'SCREEN_READER_OPTIMIZED'
  successfulTaskCount: number;
}

const DEFAULT_PROFILE: ExperienceProfile = {
  guidanceDepth: 'DETAILED',
  confirmationStyle: 'EXPLICIT',
  speechSpeed: 1.0,
  accessibilityNeeds: [],
  successfulTaskCount: 0
};

@Injectable({
  providedIn: 'root'
})
export class ExperienceEngine {
  private userService = inject(UserService);
  
  private profileSubject = new BehaviorSubject<ExperienceProfile>(DEFAULT_PROFILE);
  public profile$ = this.profileSubject.asObservable();

  constructor() {
    this.loadProfile();
  }

  private loadProfile() {
    const user = this.userService.getCurrentUser();
    if (user && user.experienceProfile) {
      this.profileSubject.next({ ...DEFAULT_PROFILE, ...user.experienceProfile });
    } else {
      const stored = localStorage.getItem('guestExperienceProfile');
      if (stored) {
        try {
          this.profileSubject.next({ ...DEFAULT_PROFILE, ...JSON.parse(stored) });
        } catch (e) {
          // fallback to default
        }
      }
    }
  }

  public recordTaskSuccess() {
    const current = this.profileSubject.value;
    const newCount = current.successfulTaskCount + 1;
    
    // Auto-adapt experience based on success
    let newDepth = current.guidanceDepth;
    let newStyle = current.confirmationStyle;
    
    if (newCount > 10 && newDepth === 'DETAILED') {
      newDepth = 'STANDARD';
    } else if (newCount > 30 && newDepth === 'STANDARD') {
      newDepth = 'TERSE';
      newStyle = 'IMPLICIT';
    }

    this.updateProfile({
      successfulTaskCount: newCount,
      guidanceDepth: newDepth,
      confirmationStyle: newStyle
    });
  }

  public updateProfile(updates: Partial<ExperienceProfile>) {
    const updated = { ...this.profileSubject.value, ...updates };
    this.profileSubject.next(updated);
    
    const user = this.userService.getCurrentUser();
    if (user) {
       this.userService.updateExperienceProfile(updated);
    } else {
       localStorage.setItem('guestExperienceProfile', JSON.stringify(updated));
    }
  }

  public getProfile(): ExperienceProfile {
    return this.profileSubject.value;
  }
}
