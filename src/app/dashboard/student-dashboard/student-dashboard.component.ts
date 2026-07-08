import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { NotificationService, NotificationItem } from '../../services/notification.service';
import { ToastService } from '../../services/toast.service';
import { AccessibilityService } from '../../services/accessibility.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BrailleContentViewerComponent } from '../../braille/braille-content-viewer/braille-content-viewer.component';
import { SearchTelemetryService } from '../../services/search-telemetry.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BrailleContentViewerComponent],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit, OnDestroy {
  activeSection = 'overview';
  isLoading = false;
  userId = '';
  
  studentInfo = {
    name: '',
    disabilityId: '',
    course: '',
    profileImage: '',
    email: '',
    phone: '',
    address: ''
  };

  notifications: NotificationItem[] = [];
  personalNotifications: NotificationItem[] = [];  // approval / system messages
  broadcastNotifications: NotificationItem[] = []; // admin sent to all students
  schemes: any[] = [];
  myEditRequests: any[] = [];
  availableCourses: any[] = [];
  enrolledCourses: any[] = [];
  userEnrollmentMap: { [courseId: string]: any } = {};
  resources: any[] = [];
  unreadNotificationsCount = 0;
  
  // Unenroll Modal state
  showUnenrollModal = false;
  unenrollReview = '';
  selectedCourse: any = null;

  schemeSearchQuery = '';
  selectedBrailleScheme: any = null;
  notificationSearchQuery = '';

  analytics: any = {
    currentStreak: 0,
    longestStreak: 0,
    totalLogins: 0,
    loginHistory: []
  };
  activityFeed: any[] = [];

  quickLinks = ['View Grades', 'Attendance Records', 'Library History', 'Pay Fees'];

  private refreshInterval: any;

  constructor(
    private userService: UserService,
    private notificationService: NotificationService,
    private toastService: ToastService,
    private accService: AccessibilityService,
    private route: ActivatedRoute,
    private router: Router,
    private telemetryService: SearchTelemetryService,
    private elementRef: ElementRef
  ) {}

  isSectionScopeActive = false;
  previousActiveElement: HTMLElement | null = null;

  focusModal() {
    setTimeout(() => {
      const modal = document.querySelector('.modal-dialog-custom') as HTMLElement;
      if (modal) {
        const focusable = modal.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length > 0) {
          (focusable[0] as HTMLElement).focus();
        } else {
          modal.focus();
        }
      }
    }, 100);
  }

  restorePreviousFocus() {
    if (this.previousActiveElement) {
      this.previousActiveElement.focus();
      this.previousActiveElement = null;
    }
  }

  @HostListener('document:focusin', ['$event'])
  handleFocusIn(event: FocusEvent) {
    const container = document.getElementById('activeSectionContainer');
    if (container && container.contains(event.target as Node)) {
      this.isSectionScopeActive = true;
    } else {
      const sidebar = document.querySelector('.col-lg-3');
      const navbar = document.querySelector('.navbar');
      const target = event.target as HTMLElement;
      if ((sidebar && sidebar.contains(target)) || (navbar && navbar.contains(target))) {
        this.isSectionScopeActive = false;
      }
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    // If modal or Braille viewer is active, let them trap focus / handle escape
    if (this.showUnenrollModal || this.selectedBrailleScheme) {
      if (event.key === 'Escape') {
        if (this.showUnenrollModal) {
          this.closeUnenrollModal();
        } else if (this.selectedBrailleScheme) {
          this.closeBrailleScheme();
        }
        event.preventDefault();
      }
      if (event.key === 'Tab') {
        if (this.showUnenrollModal) {
          this.trapFocus('modal-dialog-custom', event);
        } else if (this.selectedBrailleScheme) {
          this.trapFocus('dialog', event);
        }
      }
      return;
    }

    if (event.key === 'Escape') {
      if (this.isSectionScopeActive) {
        this.exitSectionScope();
        event.preventDefault();
      }
    }

    if (event.key === 'Tab') {
      if (this.isSectionScopeActive) {
        this.trapSectionFocus(event);
      }
    }
  }

  private trapSectionFocus(event: KeyboardEvent) {
    const container = document.getElementById('activeSectionContainer');
    if (!container) return;
    
    const focusable = container.querySelectorAll('button, input, select, textarea, a, [tabindex]:not([tabindex="-1"])');
    const focusableFiltered = Array.from(focusable).filter(el => {
      const style = window.getComputedStyle(el as HTMLElement);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             (el as HTMLElement).offsetWidth > 0 && 
             (el as HTMLElement).offsetHeight > 0 && 
             !(el as HTMLButtonElement).disabled;
    }) as HTMLElement[];
    
    if (focusableFiltered.length === 0) return;
    
    const first = focusableFiltered[0];
    const last = focusableFiltered[focusableFiltered.length - 1];
    
    if (event.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        event.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        event.preventDefault();
      }
    }
  }

  private exitSectionScope() {
    this.isSectionScopeActive = false;
    setTimeout(() => {
      const activeBtn = document.querySelector('.col-lg-3 .nav-link.active') as HTMLElement;
      if (activeBtn) {
        activeBtn.focus();
      }
    }, 50);
  }

  private trapFocus(className: string, event: KeyboardEvent) {
    const modal = document.querySelector('.' + className);
    if (!modal) return;
    const focusable = modal.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    
    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;
    
    if (event.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        event.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        event.preventDefault();
      }
    }
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const section = params['tab'] || params['section'];
      if (section) {
        this.setSection(section);
      }
    });
    this.userService.currentUser$.subscribe(user => {
      if (user) {
        this.userId = user.disabilityId || '';
        this.studentInfo.disabilityId = this.userId;
        this.studentInfo.name = user.user || '';
        if (user.profileImage !== undefined) {
          this.studentInfo.profileImage = user.profileImage;
        }
        
        if (!this.refreshInterval) {
          this.loadAllData();
          this.refreshInterval = setInterval(() => {
            if (this.userId) {
              this.fetchAnalyticsData();
              this.loadNotifications();
              this.loadEditRequests();
            }
          }, 10000);
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  hasCertificates(): boolean {
    if (!this.enrolledCourses) return false;
    return this.enrolledCourses.some(e => e.certificateUrl);
  }

  downloadCertificate(elementId: string, courseTitle: string) {
    const printContents = document.getElementById(elementId)?.innerHTML;
    if (printContents) {
      const originalContents = document.body.innerHTML;
      // Replace button so it doesn't show in print
      const cleanContents = printContents.replace(/<button[^>]*>.*?<\/button>/gi, '');
      
      document.body.innerHTML = `
        <div style="padding: 40px; text-align: center; font-family: 'Inter', sans-serif; background: white;">
          <h2 style="color: #4f46e5; margin-bottom: 30px; font-weight: 800;">Siksha Setu E-Learning Platform</h2>
          <div style="border: 4px solid #e2e8f0; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); margin: 0 auto; max-width: 800px; position: relative;">
            ${cleanContents}
            <div style="margin-top: 40px; pt-3; border-top: 2px dashed #cbd5e1; display: flex; justify-content: space-between;">
              <div>
                <p style="margin: 0; color: #64748b; font-size: 12px;">Authorized Signature</p>
                <div style="border-bottom: 1px solid #000; width: 150px; margin-top: 20px;"></div>
              </div>
              <div>
                <p style="margin: 0; color: #64748b; font-size: 12px;">Date Issued</p>
                <p style="margin: 5px 0 0; font-weight: bold;">${new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      `;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  }

  loadAllData(): void {
    this.loadStudentProfile();
    this.loadNotifications();
    this.loadSchemes();
    this.loadEditRequests();
    this.loadAnalytics();
    this.loadCourses();
  }

  setSection(section: string): void {
    this.activeSection = section;
    this.isSectionScopeActive = true;
    setTimeout(() => {
      const activeSectionEl = document.querySelector('.col-lg-9 h2, .col-lg-9 h4, .col-lg-9 h5') as HTMLElement;
      if (activeSectionEl) {
        activeSectionEl.setAttribute('tabindex', '-1');
        activeSectionEl.focus();
      }
    }, 150);
  }

  loadStudentProfile(): void {
    if (!this.userId) return;
    this.userService.getUserByDisabilityId(this.userId).subscribe({
      next: (user) => {
        if (user) {
          this.studentInfo.name = user.name || this.studentInfo.name;
          this.studentInfo.course = user.course || '';
          this.studentInfo.profileImage = user.profileImage || '';
          this.studentInfo.email = user.email || '';
          this.studentInfo.phone = user.phone || '';
          this.studentInfo.address = user.address || '';
        }
      },
      error: (err) => console.error('Error fetching student profile:', err)
    });
  }

  loadNotifications(): void {
    if (!this.userId) return;
    this.notificationService.getNotifications(this.userId).subscribe({
      next: (data) => {
        this.notifications = data;
        // Split: BROADCAST_ prefix = admin public announcements, SCHEME = scheme publish, everything else = personal
        this.broadcastNotifications = data.filter((n: any) => n.type && n.type.startsWith('BROADCAST_'));
        this.personalNotifications  = data.filter((n: any) => !n.type || (!n.type.startsWith('BROADCAST_') && n.type !== 'SCHEME'));
        // Unread count based on isRead field
        this.unreadNotificationsCount = data.filter((n: any) => !n.isRead && !n.read).length;
      },
      error: (err) => console.error('Error loading notifications:', err)
    });
  }

  markAllNotificationsRead(): void {
    this.unreadNotificationsCount = 0;
    // Mark each unread notification as read on the backend
    this.notifications
      .filter(n => !(n.isRead || n.read))
      .forEach(n => this.notificationService.markAsRead(n.id).subscribe());
  }

  getFilteredPersonalNotifications(): NotificationItem[] {
    if (!this.notificationSearchQuery) return this.personalNotifications;
    const q = this.notificationSearchQuery.toLowerCase();
    return this.personalNotifications.filter(n => n.message?.toLowerCase().includes(q));
  }

  getFilteredBroadcastNotifications(): NotificationItem[] {
    if (!this.notificationSearchQuery) return this.broadcastNotifications;
    const q = this.notificationSearchQuery.toLowerCase();
    return this.broadcastNotifications.filter(n => n.message?.toLowerCase().includes(q));
  }

  getBroadcastCategoryDetails(type?: string): any {
    if (!type) return { label: 'Announcement', colorClass: 'primary', icon: 'bi-megaphone-fill' };
    
    if (type.includes('INFO')) {
      return { label: 'Information', colorClass: 'info', icon: 'bi-info-circle-fill' };
    } else if (type.includes('WARNING')) {
      return { label: 'Important Alert', colorClass: 'danger', icon: 'bi-exclamation-triangle-fill' };
    } else if (type.includes('SUCCESS')) {
      return { label: 'Good News', colorClass: 'success', icon: 'bi-stars' };
    }
    
    return { label: type.replace('BROADCAST_', ''), colorClass: 'secondary', icon: 'bi-megaphone-fill' };
  }

  loadSchemes(): void {
    this.isLoading = true;
    this.userService.getSchemes().subscribe({
      next: (data) => {
        this.schemes = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading schemes:', err);
        this.isLoading = false;
      }
    });
  }

  loadEditRequests(): void {
    if (!this.userId) return;
    this.userService.getStudentEditRequests(this.userId).subscribe({
      next: (data) => {
        this.myEditRequests = data;
      },
      error: (err) => console.error('Error loading edit requests:', err)
    });
  }

  loadAnalytics(): void {
    if (!this.userId) return;
    
    this.userService.updateLoginStreak(this.userId).subscribe({
      next: (progress: any) => {
        if (progress) {
          this.analytics.currentStreak = progress.currentStreak || 0;
          this.analytics.longestStreak = progress.longestStreak || 0;
        }
        this.fetchAnalyticsData();
      },
      error: (err) => {
        console.error('Error fetching streak:', err);
        this.fetchAnalyticsData(); // Fallback to still load analytics
      }
    });
  }

  fetchAnalyticsData(): void {
    if (!this.userId) return;
    this.userService.getStudentAnalytics(this.userId).subscribe({
      next: (data) => {
        if (data) {
          if (data.progress) {
            this.analytics.totalLogins = data.progress.totalLogins || 0;
            this.analytics.currentStreak = data.progress.currentStreak || 0;
            this.analytics.longestStreak = data.progress.longestStreak || 0;
          }
          if (data.enrollments) {
            this.enrolledCourses = data.enrollments;
            this.userEnrollmentMap = {};
            this.enrolledCourses.forEach(e => {
              if (e.course) {
                this.userEnrollmentMap[e.course.id] = e;
              }
            });
          }
          if (data.activityTracker) {
            this.activityFeed = data.activityTracker.map((a: any) => {
              let icon = 'bi-check-circle-fill text-success';
              if (a.actionDetails.includes('Logged in')) icon = 'bi-box-arrow-in-right text-info';
              else if (a.actionDetails.includes('Profile updated')) icon = 'bi-person-lines-fill text-primary';
              else if (a.actionDetails.includes('lesson') || a.actionDetails.includes('course')) icon = 'bi-book-fill text-success';
              
              return { date: a.activityTimestamp, text: a.actionDetails, icon: icon };
            });
          }
        }
      },
      error: (err) => console.error('Error loading analytics:', err)
    });
  }

  loadCourses(): void {
    this.userService.getAllCourses().subscribe({
      next: (data) => {
        this.availableCourses = data || [];
      },
      error: (err) => console.error('Error loading courses:', err)
    });
  }

  enroll(courseId: string): void {
    this.userService.enrollInCourse(this.userId, courseId, 'All Resources').subscribe({
      next: () => {
        this.toastService.success('Successfully enrolled in course!');
        this.loadCourses(); // Refresh courses
        this.loadAnalytics(); // Refresh enrollments
      },
      error: (err) => {
        this.toastService.error('Failed to enroll in course');
        console.error(err);
      }
    });
  }

  openUnenrollModal(course: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.accService.playClickSound();
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.selectedCourse = course;
    this.showUnenrollModal = true;
    this.unenrollReview = '';
    this.focusModal();
  }

  closeUnenrollModal(): void {
    this.showUnenrollModal = false;
    this.selectedCourse = null;
    this.unenrollReview = '';
    this.restorePreviousFocus();
  }

  openBrailleScheme(scheme: any): void {
    this.accService.playClickSound();
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.selectedBrailleScheme = scheme;
  }

  closeBrailleScheme(): void {
    this.selectedBrailleScheme = null;
    this.restorePreviousFocus();
  }

  submitUnenroll(): void {
    if (this.userId && this.selectedCourse) {
      this.userService.unenrollFromCourse(this.userId, this.selectedCourse.id, this.unenrollReview).subscribe({
        next: () => {
          this.toastService.success('Successfully unenrolled from the course.');
          this.closeUnenrollModal();
          this.loadCourses(); // Refresh courses
          this.loadAnalytics(); // Refresh enrollments and map
        },
        error: (err) => {
          console.error(err);
          this.toastService.error('Failed to unenroll from course.');
        }
      });
    }
  }

  readCourseAloud(course: any, event: Event): void {
    event.stopPropagation();
    this.accService.playClickSound();
    const textToSpeak = `Course: ${course.title || course.name}. Category: ${course.category}. Description: ${course.description}.`;
    this.accService.speakText(textToSpeak);
  }

  openCourseDetails(course: any): void {
    if (this.userId) {
      this.telemetryService.logTelemetry('COURSE_OPEN', course.id, `Opened course details: ${course.title || course.name}`, this.userId).subscribe();
    }
    this.router.navigate(['/dashboard/studentdashboard/course', course.id]);
  }

  startTest(course: any): void {
    if (this.userId) {
      this.telemetryService.logTelemetry('COURSE_OPEN', course.id, `Started test for course: ${course.title || course.name}`, this.userId).subscribe();
    }
    this.router.navigate(['/dashboard/studentdashboard/course', course.id]);
  }

  viewResources(courseId: string): void {
    if (this.userId) {
      this.telemetryService.logTelemetry('COURSE_OPEN', courseId, `Viewed resources for course ID: ${courseId}`, this.userId).subscribe();
    }
    this.router.navigate(['/dashboard/studentdashboard/course', courseId]);
  }

  getFilteredSchemes(): any[] {
    if (!this.schemeSearchQuery) return this.schemes;
    const q = this.schemeSearchQuery.toLowerCase();
    return this.schemes.filter(s => s.title?.toLowerCase().includes(q) || s.summary?.toLowerCase().includes(q));
  }

  getFilteredNotifications(): NotificationItem[] {
    if (!this.notificationSearchQuery) return this.notifications;
    const q = this.notificationSearchQuery.toLowerCase();
    return this.notifications.filter(n => n.message?.toLowerCase().includes(q));
  }
}
