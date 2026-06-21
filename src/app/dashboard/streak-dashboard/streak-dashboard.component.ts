import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-streak-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './streak-dashboard.component.html',
  styleUrls: ['./streak-dashboard.component.css']
})
export class StreakDashboardComponent implements OnInit, OnDestroy {
  userId: string = '';
  currentStreak = 0;
  longestStreak = 0;
  contributionData: any[] = [];
  
  // Restoration state
  isStreakBroken = false;
  streakBrokenAt: Date | null = null;
  previousStreak = 0;
  timeLeftToRestore: string = '';
  private timerSubscription: Subscription | null = null;
  
  // Rewards
  rewards = [
    { threshold: 10, name: 'Bronze Badge', icon: 'fas fa-medal', achieved: false, color: '#cd7f32' },
    { threshold: 50, name: 'Silver Badge', icon: 'fas fa-medal', achieved: false, color: '#c0c0c0' },
    { threshold: 100, name: 'Gold Badge', icon: 'fas fa-medal', achieved: false, color: '#ffd700' },
    { threshold: 500, name: 'Free School Bag', icon: 'fas fa-shopping-bag', achieved: false, color: '#ff4757' },
    { threshold: 1000, name: 'Study Table', icon: 'fas fa-chair', achieved: false, color: '#2ed573' }
  ];

  constructor(private userService: UserService, private toastService: ToastService) {}

  ngOnInit(): void {
    const user = this.userService.getCurrentUser();
    if (user && user.disabilityId) {
      this.userId = user.disabilityId;
      this.loadAnalytics();
    }
  }

  ngOnDestroy(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  loadAnalytics(): void {
    this.userService.getStudentAnalytics(this.userId).subscribe({
      next: (data) => {
        if (data && data.progress) {
          this.currentStreak = data.progress.currentStreak;
          this.longestStreak = data.progress.longestStreak;
          
          if (data.progress.streakBrokenAt) {
            this.streakBrokenAt = new Date(data.progress.streakBrokenAt);
            this.previousStreak = data.progress.previousStreak;
            this.checkRestorationTimer();
          } else {
            this.isStreakBroken = false;
          }
          
          this.updateRewards();
        }
        
        if (data && data.activities) {
          this.generateContributionGraph(data.activities);
        }
      },
      error: (err) => {
        console.error('Error fetching analytics', err);
      }
    });
  }

  checkRestorationTimer(): void {
    if (!this.streakBrokenAt) return;
    
    // Check if within 10 hours
    const expiryTime = new Date(this.streakBrokenAt.getTime() + (10 * 60 * 60 * 1000));
    
    const updateTimer = () => {
      const now = new Date();
      const diff = expiryTime.getTime() - now.getTime();
      
      if (diff > 0) {
        this.isStreakBroken = true;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        this.timeLeftToRestore = `${hours}h ${minutes}m ${seconds}s`;
      } else {
        this.isStreakBroken = false;
        if (this.timerSubscription) {
          this.timerSubscription.unsubscribe();
        }
      }
    };
    
    updateTimer(); // Initial call
    
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    
    this.timerSubscription = interval(1000).subscribe(() => {
      updateTimer();
    });
  }

  restoreStreak(): void {
    this.userService.restoreStreak(this.userId).subscribe({
      next: (progress) => {
        this.toastService.success('Streak Restored Successfully! 🎉');
        this.currentStreak = progress.currentStreak;
        this.longestStreak = progress.longestStreak;
        this.isStreakBroken = false;
        if (this.timerSubscription) {
          this.timerSubscription.unsubscribe();
        }
        this.updateRewards();
      },
      error: (err) => {
        this.toastService.error('Failed to restore streak. Time might have expired.');
        this.isStreakBroken = false;
      }
    });
  }

  updateRewards(): void {
    this.rewards.forEach(r => {
      r.achieved = this.currentStreak >= r.threshold;
    });
  }

  generateContributionGraph(activities: any[]): void {
    this.contributionData = [];
    const today = new Date();
    
    // Generate last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      const activity = activities.find(a => a.activityDate === dateString);
      const level = activity ? activity.activityLevel : 0;
      
      let colorClass = 'activity-level-0';
      if (level === 1) colorClass = 'activity-level-1';
      else if (level === 2) colorClass = 'activity-level-2';
      else if (level === 3) colorClass = 'activity-level-3';
      else if (level >= 4) colorClass = 'activity-level-4';
      
      this.contributionData.push({
        date: dateString,
        level: level,
        colorClass: colorClass
      });
    }
  }
}
