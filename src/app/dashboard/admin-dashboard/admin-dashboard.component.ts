import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { NotificationService } from '../../services/notification.service';
import { UserService } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';
import { SearchTelemetryService } from '../../services/search-telemetry.service';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  activeSection = 'overview';
  isLoading = false;
  adminId = '';
  adminUsername = '';
  profileImage = '';

  // Stats
  totalStudentsCount = 0;
  pendingEditsCount = 0;

  // Date Filters
  private getStoredFilter(key: string, defaultValue: number): number {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? Number(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  globalDateFilter = this.getStoredFilter('admin_globalDateFilter', 7);
  summaryDateFilter = this.getStoredFilter('admin_summaryDateFilter', 7);
  courseDateFilter = this.getStoredFilter('admin_courseDateFilter', 7);
  resourceDateFilter = this.getStoredFilter('admin_resourceDateFilter', 7);
  telemetryDateFilter = this.getStoredFilter('admin_telemetryDateFilter', 7);

  filterOptions = [
    { label: '7 Days', value: 7 },
    { label: '30 Days', value: 30 },
    { label: '60 Days', value: 60 },
    { label: '90 Days', value: 90 },
    { label: '1 Year', value: 365 },
    { label: '2 Years', value: 730 },
    { label: 'All Time', value: 0 }
  ];

  // New Summary Stats
  activeStudentsCount = 0;
  totalCoursesCount = 0;
  totalEnrollmentsCount = 0;
  certificatesIssuedCount = 0;
  totalTestsTakenCount = 0;
  averageTestScore = 0.0;

  // Course Analytics
  courseAnalytics: any[] = [];

  // Resource Analytics
  resourceAnalyticsBreakdown: any = {};
  resourceAnalyticsPercentages: any = {};

  // Telemetry Insights
  mostSearchedKeywords: any[] = [];
  mostSearchedCourses: any[] = [];
  mostViewedResources: any[] = [];
  mostUsedAccessibilityFeatures: any[] = [];

  // Chart References
  accessibilityChart: any = null;
  resourceBarChart: any = null;
  resourceTrendChart: any = null;

  // Broadcast Alert Form
  broadcastMessage = '';
  broadcastType = 'INFO';
  broadcastHistory: any[] = [];

  // Publish Scheme Form
  schemeTitle = '';
  schemeSummary = '';
  schemeLink = '';
  publishedSchemes: any[] = [];

  // Courses & Resources
  courses: any[] = [];
  newCourse = {
    id: '',
    title: '',
    description: '',
    category: '',
    duration: '2 Weeks',
    difficulty: 'Beginner',
    details: '',
    whatYouWillLearn: '',
    learningOutcomes: '',
    accessibilityFeatures: '',
  };
  courseImageFile: File | null = null;

  // Course modal state
  showCourseModal = false;
  isEditMode = false;
  selectedCourseId: string | null = null;

  // Course-centric resources
  selectedCourseForResources: any = null;
  courseResources: any[] = [];
  newResource = {
    title: '',
    description: '',
    type: 'txt',
    fileUrl: '',
    contentArea: 'LESSON_CONTENT',
  };
  resourceFile: File | null = null;

  // Queues data
  pendingEditRequests: any[] = [];

  // Student Directory
  studentsList: any[] = [];
  studentSearchQuery = '';
  studentStatusFilter = '';

  // Local Search & Filter inputs
  courseSearchQuery = '';
  courseCategoryFilter = '';
  courseDifficultyFilter = '';
  schemeSearchQuery = '';
  approvalSearchQuery = '';
  resourceSearchQuery = '';

  // Reject Modal
  showRejectModal = false;
  rejectingRequestId: number | null = null;
  rejectReason = '';

  // Delete Confirm
  showDeleteConfirmModal = false;
  deleteConfirmTitle = '';
  deleteConfirmMessage = '';
  deleteConfirmCallback: (() => void) | null = null;

  // Student Details Modal
  showStudentDetailsModal = false;
  selectedStudentAnalytics: any = null;
  selectedStudentUser: any = null;

  private refreshInterval: any;

  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService,
    private userService: UserService,
    private toastService: ToastService,
    private telemetryService: SearchTelemetryService,
    private route: ActivatedRoute,
    private elementRef: ElementRef
  ) {}

  isSectionScopeActive = false;
  previousActiveElement: HTMLElement | null = null;

  focusModal() {
    setTimeout(() => {
      const modal = document.querySelector('.modal-content, .modal-dialog-custom') as HTMLElement;
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

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.restorePreviousFocus();
  }

  closeStudentDetailsModal(): void {
    this.showStudentDetailsModal = false;
    this.restorePreviousFocus();
  }

  closeEditRequestDetailsModal(): void {
    this.showEditRequestDetailsModal = false;
    this.restorePreviousFocus();
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
    // If any modal is active, let them handle the events and return early
    if (this.showCourseModal || this.showRejectModal || this.showDeleteConfirmModal || 
        this.showStudentDetailsModal || this.showEditRequestDetailsModal || 
        this.selectedCourseForResources || this.selectedCourseForTests) {
      if (event.key === 'Escape') {
        if (this.showCourseModal) this.closeCourseModal();
        else if (this.showRejectModal) this.closeRejectModal();
        else if (this.showDeleteConfirmModal) this.closeDeleteConfirm();
        else if (this.showStudentDetailsModal) this.closeStudentDetailsModal();
        else if (this.showEditRequestDetailsModal) this.closeEditRequestDetailsModal();
        else if (this.selectedCourseForResources) this.closeManageResourcesModal();
        else if (this.selectedCourseForTests) this.closeManageTestsModal();
        event.preventDefault();
      }
      if (event.key === 'Tab') {
        this.trapFocus(event);
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

  private trapFocus(event: KeyboardEvent) {
    const modal = document.querySelector('.modal-content, .modal-dialog-custom');
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
        this.adminId = user.adminId || user.disabilityId || '';
        this.adminUsername = user.user || 'Admin';
        if (user.profileImage !== undefined) {
          this.profileImage = user.profileImage;
        }
        
        if (!this.refreshInterval) {
          this.loadStats();
          this.loadAnalytics();
          
          this.refreshInterval = setInterval(() => {
            if (this.adminId) {
              this.loadStats();
              this.loadAnalytics();
              if (this.activeSection === 'edit-requests') this.loadEditRequests();
              if (this.activeSection === 'notifications')
                this.loadBroadcastHistory();
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

  setSection(section: string): void {
    this.activeSection = section;
    this.isSectionScopeActive = true;
    if (section === 'overview') {
      this.loadStats();
      this.loadAnalytics();
    }
    else if (section === 'courses') this.loadCourses();
    else if (section === 'edit-requests') this.loadEditRequests();
    else if (section === 'student-directory') this.loadStudentDirectory();
    else if (section === 'notifications') {
      this.loadBroadcastHistory();
      this.loadSchemes();
    }
    setTimeout(() => {
      const activeSectionEl = document.querySelector('.col-lg-9 h2, .col-lg-9 h4, .col-lg-9 h5') as HTMLElement;
      if (activeSectionEl) {
        activeSectionEl.setAttribute('tabindex', '-1');
        activeSectionEl.focus();
      }
    }, 150);
  }

  loadStats(): void {
    this.adminService.getAllUsers().subscribe({
      next: (data) => (this.totalStudentsCount = data.length),
      error: () => console.error('Error loading users'),
    });
    this.adminService.getPendingEditRequests().subscribe({
      next: (data) => (this.pendingEditsCount = data.length),
    });
  }

  // BROADCAST NOTIFICATION
  submitBroadcast(): void {
    if (!this.broadcastMessage.trim()) {
      this.toastService.warning('Please enter a broadcast message.');
      return;
    }
    this.isLoading = true;
    this.notificationService
      .broadcastNotification(this.broadcastMessage, this.broadcastType)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.success('Notification broadcasted successfully!');
          this.broadcastMessage = '';
          this.loadBroadcastHistory();
        },
        error: () => {
          this.isLoading = false;
          this.toastService.error('Failed to broadcast notification.');
        },
      });
  }

  loadBroadcastHistory(): void {
    this.adminService.getBroadcastHistory().subscribe({
      next: (data) => (this.broadcastHistory = data),
      error: (err) => console.error('Error loading broadcast history', err),
    });
  }

  deleteBroadcast(message: string): void {
    // Requires backend support, mocking for now
    this.broadcastHistory = this.broadcastHistory.filter(
      (m) => m.message !== message,
    );
    this.toastService.success('Broadcast deleted (Mock)');
  }

  // COURSES
  loadCourses(): void {
    this.userService.getAllCourses().subscribe({
      next: (data) => (this.courses = data),
      error: (err) => console.error('Error loading courses', err),
    });
  }

  onCourseImageSelected(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.courseImageFile = event.target.files[0];
    }
  }

  openCreateCourseModal(): void {
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.isEditMode = false;
    this.selectedCourseId = null;
    this.newCourse = {
      id: '',
      title: '',
      description: '',
      category: '',
      duration: '2 Weeks',
      difficulty: 'Beginner',
      details: '',
      whatYouWillLearn: '',
      learningOutcomes: '',
      accessibilityFeatures: '',
    };
    this.courseImageFile = null;
    this.showCourseModal = true;
    this.focusModal();
  }

  openEditCourseModal(course: any): void {
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.isEditMode = true;
    this.selectedCourseId = course.id;
    this.newCourse = {
      id: course.id,
      title: course.title || course.name || '',
      description: course.description || '',
      category: course.category || '',
      duration: course.duration || '2 Weeks',
      difficulty: course.difficulty || 'Beginner',
      details: course.details || '',
      whatYouWillLearn: course.whatYouWillLearn || '',
      learningOutcomes: course.learningOutcomes || '',
      accessibilityFeatures: course.accessibilityFeatures || '',
    };
    this.courseImageFile = null;
    this.showCourseModal = true;
    this.focusModal();
  }

  closeCourseModal(): void {
    this.showCourseModal = false;
    this.restorePreviousFocus();
  }

  createCourse(): void {
    if (!this.newCourse.title) return;
    this.isLoading = true;

    if (this.isEditMode && this.selectedCourseId) {
      this.adminService
        .updateCourse(
          this.selectedCourseId,
          this.newCourse,
          this.courseImageFile || undefined,
        )
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.toastService.success('Course updated successfully');
            this.showCourseModal = false;
            this.loadCourses();
          },
          error: () => {
            this.isLoading = false;
            this.toastService.error('Failed to update course');
          },
        });
    } else {
      this.adminService
        .createCourse(this.newCourse, this.courseImageFile || undefined)
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.toastService.success('Course created successfully');
            this.showCourseModal = false;
            this.loadCourses();
          },
          error: () => {
            this.isLoading = false;
            this.toastService.error('Failed to create course');
          },
        });
    }
  }

  deleteCourse(id: string): void {
    this.openDeleteConfirm(
      'Delete Course',
      'Are you sure you want to delete this course? This will also delete all its resources and enrollments.',
      () => {
        this.adminService.deleteCourse(id).subscribe({
          next: () => {
            this.toastService.success('Course deleted successfully');
            this.loadCourses();
          },
          error: (err) => {
            this.toastService.error('Failed to delete course');
            console.error(err);
          },
        });
      },
    );
  }

  // Course-specific resources loading
  loadCourseResources(courseId: string): void {
    this.userService.getResourcesByCourse(courseId).subscribe({
      next: (data) => (this.courseResources = data),
      error: (err) => console.error('Error loading course resources', err),
    });
  }

  openManageResourcesModal(course: any): void {
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.selectedCourseForResources = course;
    this.newResource = {
      title: '',
      description: '',
      type: 'txt',
      fileUrl: '',
      contentArea: 'LESSON_CONTENT',
    };
    this.resourceFile = null;
    this.loadCourseResources(course.id);
    this.focusModal();
  }

  // Test Management
  selectedCourseForTests: any = null;
  courseTestQuestions: any[] = [];
  showTestForm = false;
  isEditingTest = false;
  newTestQuestion: any = {
    id: null,
    question: '',
    options: ['', '', '', ''],
    correctIndex: 0,
  };

  openManageTestsModal(course: any): void {
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.selectedCourseForTests = course;
    this.showTestForm = false;
    this.loadCourseTests(course.id);
    this.focusModal();
  }

  closeManageTestsModal(): void {
    this.selectedCourseForTests = null;
    this.courseTestQuestions = [];
    this.showTestForm = false;
    this.restorePreviousFocus();
  }

  loadCourseTests(courseId: string): void {
    this.adminService.getTestQuestions(courseId).subscribe({
      next: (data) => (this.courseTestQuestions = data),
      error: (err) => console.error('Error loading tests', err),
    });
  }

  openTestForm(question: any = null): void {
    this.showTestForm = true;
    if (question) {
      this.isEditingTest = true;
      this.newTestQuestion = {
        id: question.id,
        question: question.question,
        options: [...question.options],
        correctIndex: question.correctIndex,
      };
    } else {
      this.isEditingTest = false;
      this.newTestQuestion = {
        id: null,
        question: '',
        options: ['', '', '', ''],
        correctIndex: 0,
      };
    }
  }

  cancelTestForm(): void {
    this.showTestForm = false;
  }

  saveTestQuestion(): void {
    if (
      !this.newTestQuestion.question.trim() ||
      this.newTestQuestion.options.some((o: string) => !o.trim())
    ) {
      this.toastService.warning('Please fill in all fields');
      return;
    }

    if (this.isEditingTest) {
      this.adminService
        .updateTestQuestion(
          this.selectedCourseForTests.id,
          this.newTestQuestion.id,
          this.newTestQuestion,
        )
        .subscribe({
          next: () => {
            this.toastService.success('Question updated');
            this.loadCourseTests(this.selectedCourseForTests.id);
            this.showTestForm = false;
          },
          error: () => this.toastService.error('Error updating question'),
        });
    } else {
      this.adminService
        .addTestQuestion(this.selectedCourseForTests.id, this.newTestQuestion)
        .subscribe({
          next: () => {
            this.toastService.success('Question added');
            this.loadCourseTests(this.selectedCourseForTests.id);
            this.showTestForm = false;
          },
          error: () => this.toastService.error('Error adding question'),
        });
    }
  }

  trackByIndex(index: number, obj: any): any {
    return index;
  }

  deleteTestQuestion(questionId: number): void {
    this.openDeleteConfirm(
      'Delete Question',
      'Are you sure you want to delete this question?',
      () => {
        this.adminService
          .deleteTestQuestion(this.selectedCourseForTests.id, questionId)
          .subscribe({
            next: () => {
              this.toastService.success('Question deleted');
              this.loadCourseTests(this.selectedCourseForTests.id);
            },
            error: () => this.toastService.error('Error deleting question'),
          });
      },
    );
  }

  closeManageResourcesModal(): void {
    this.selectedCourseForResources = null;
    this.courseResources = [];
    this.restorePreviousFocus();
  }

  onFileSelected(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.resourceFile = event.target.files[0];
    }
  }

  uploadResource(): void {
    if (!this.selectedCourseForResources) return;
    if (!this.resourceFile) {
      this.toastService.warning('Please select a file to upload.');
      return;
    }

    const selectedType = this.newResource.type;
    let targetFormat = 'text';

    if (selectedType === 'audio') targetFormat = 'audio';
    else if (selectedType === 'video') targetFormat = 'video';
    else if (selectedType === 'signlanguage video')
      targetFormat = 'sign language';
    else if (selectedType === 'braille') targetFormat = 'braille';

    const finalTitle = this.resourceFile
      ? this.resourceFile.name
      : selectedType.toUpperCase() + ' Resource';

    const payload = {
      title: finalTitle,
      description: this.newResource.description || '',
      type: 'file',
      format: targetFormat,
      contentArea:
        selectedType === 'txt' || selectedType === 'braille'
          ? this.newResource.contentArea
          : null,
    };

    this.isLoading = true;
    this.adminService
      .createResource(
        payload,
        this.selectedCourseForResources.id,
        this.resourceFile,
      )
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.success('Resource uploaded successfully');
          this.newResource = {
            title: '',
            description: '',
            type: 'txt',
            fileUrl: '',
            contentArea: 'LESSON_CONTENT',
          };
          this.resourceFile = null;
          this.loadCourseResources(this.selectedCourseForResources.id);
        },
        error: () => {
          this.isLoading = false;
          this.toastService.error('Failed to upload resource');
        },
      });
  }

  deleteResource(id: number): void {
    this.openDeleteConfirm(
      'Delete Resource',
      'Are you sure you want to delete this resource?',
      () => {
        this.adminService.deleteResource(id).subscribe({
          next: () => {
            this.toastService.success('Resource deleted successfully');
            if (this.selectedCourseForResources) {
              this.loadCourseResources(this.selectedCourseForResources.id);
            }
          },
          error: (err) => {
            this.toastService.error('Failed to delete resource');
            console.error(err);
          },
        });
      },
    );
  }

  // SCHEMES
  loadSchemes(): void {
    this.isLoading = true;
    this.userService.getSchemes().subscribe({
      next: (data) => {
        this.publishedSchemes = data;
        this.isLoading = false;
      },
      error: () => (this.isLoading = false),
    });
  }

  publishScheme(): void {
    if (!this.schemeTitle) return;
    this.isLoading = true;
    const schemeData = {
      title: this.schemeTitle,
      summary: this.schemeSummary,
      link: this.schemeLink,
    };
    this.adminService.publishScheme(schemeData).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastService.success('Scheme published!');
        this.schemeTitle = '';
        this.schemeSummary = '';
        this.schemeLink = '';
        this.loadSchemes();
      },
      error: () => {
        this.isLoading = false;
        this.toastService.error('Failed to publish scheme');
      },
    });
  }

  deleteScheme(id: number): void {
    this.adminService.deleteScheme(id).subscribe({
      next: () => {
        this.toastService.success('Scheme deleted');
        this.loadSchemes();
      },
    });
  }

  // EDIT REQUESTS
  loadEditRequests(): void {
    this.isLoading = true;
    this.adminService.getPendingEditRequests().subscribe({
      next: (data) => {
        this.pendingEditRequests = data;
        this.isLoading = false;
      },
      error: () => (this.isLoading = false),
    });
  }

  approveEditRequest(id: number): void {
    this.adminService.approveEditRequest(id).subscribe({
      next: () => {
        this.toastService.success('Request approved');
        this.loadEditRequests();
        this.loadStats();
      },
    });
  }

  rejectEditRequest(id: number): void {
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.rejectingRequestId = id;
    this.rejectReason = '';
    this.showRejectModal = true;
    this.focusModal();
  }

  confirmReject(): void {
    if (!this.rejectingRequestId) return;
    this.adminService
      .rejectEditRequest(this.rejectingRequestId, this.rejectReason)
      .subscribe({
        next: () => {
          this.toastService.success('Request rejected');
          this.closeRejectModal();
          this.loadEditRequests();
          this.loadStats();
        },
      });
  }

  // DIRECTORY
  loadStudentDirectory(): void {
    this.isLoading = true;
    this.adminService.getAllUsers().subscribe({
      next: (data) => {
        this.studentsList = data;
        this.isLoading = false;
      },
      error: () => (this.isLoading = false),
    });
  }

  getFilteredStudents(): any[] {
    let list = this.studentsList;
    if (this.studentSearchQuery) {
      const q = this.studentSearchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.disabilityId?.toLowerCase().includes(q),
      );
    }
    if (this.studentStatusFilter) {
      list = list.filter((s) => {
        const course = s.course || '';
        const isInactive = !course || course === 'Not Enrolled';
        if (this.studentStatusFilter === 'Inactive') return isInactive;
        if (this.studentStatusFilter === 'In Progress') return !isInactive;
        if (this.studentStatusFilter === 'Completed') {
          // If student has streak or logged completed course
          return !isInactive && course.toLowerCase().includes('complete');
        }
        if (this.studentStatusFilter === 'Active') return !isInactive;
        return true;
      });
    }
    return list;
  }

  viewStudentDetails(disabilityId: string): void {
    this.isLoading = true;
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.adminService.getStudentAnalytics(disabilityId).subscribe({
      next: (data) => {
        this.selectedStudentUser = data.user;
        this.selectedStudentAnalytics = data;
        
        // Load student accessibility settings from their telemetry events
        if (data.activityTracker) {
          // Find most used accessibility preferences from activities or log
          const accessEvents = (data.activityTracker as any[]).filter(a => a.actionDetails?.startsWith('ACCESSIBILITY_USE') || a.actionDetails?.includes('Contrast') || a.actionDetails?.includes('Font'));
          this.selectedStudentAnalytics.accessPreferences = accessEvents.map(e => e.actionDetails).slice(0, 3);
        }
        
        this.showStudentDetailsModal = true;
        this.isLoading = false;
        this.focusModal();
      },
      error: (err) => {
        console.error('Error fetching analytics:', err);
        this.toastService.error('Failed to load student details');
        this.isLoading = false;
      },
    });
  }

  // DELETE CONFIRMATION MODAL
  openDeleteConfirm(
    title: string,
    message: string,
    callback: () => void,
  ): void {
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.deleteConfirmTitle = title;
    this.deleteConfirmMessage = message;
    this.deleteConfirmCallback = callback;
    this.showDeleteConfirmModal = true;
    this.focusModal();
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirmModal = false;
    this.deleteConfirmCallback = null;
    this.restorePreviousFocus();
  }

  executeDeleteConfirm(): void {
    if (this.deleteConfirmCallback) {
      this.deleteConfirmCallback();
    }
    this.closeDeleteConfirm();
  }

  // Edit Request Details Review Modal
  showEditRequestDetailsModal = false;
  selectedEditRequest: any = null;
  selectedRequestStudentDetails: any = null;

  viewEditRequestDetails(req: any): void {
    this.selectedEditRequest = req;
    this.selectedRequestStudentDetails = null;
    this.isLoading = true;
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.adminService.getStudentAnalytics(req.userId).subscribe({
      next: (analytics) => {
        this.selectedRequestStudentDetails = analytics.user;
        this.showEditRequestDetailsModal = true;
        this.isLoading = false;
        this.focusModal();
      },
      error: (err) => {
        console.error('Error fetching student details:', err);
        // Fallback
        this.showEditRequestDetailsModal = true;
        this.isLoading = false;
        this.focusModal();
      },
    });
  }

  approveEditRequestFromModal(): void {
    if (!this.selectedEditRequest) return;
    const reqId = this.selectedEditRequest.id;
    this.closeEditRequestDetailsModal();
    this.approveEditRequest(reqId);
  }

  rejectEditRequestFromModal(): void {
    if (!this.selectedEditRequest) return;
    const reqId = this.selectedEditRequest.id;
    this.closeEditRequestDetailsModal();
    this.rejectEditRequest(reqId);
  }

  openImageInNewTab(base64Data: string): void {
    if (typeof window !== 'undefined') {
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(
          `<iframe src="${base64Data}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`,
        );
      }
    }
  }

  // Analytics Loading & Rendering Methods
  loadAnalytics(): void {
    this.loadAdminSummary();
    this.loadCourseAnalytics();
    this.loadResourceAnalytics();
    this.loadTelemetryStats();
  }

  onGlobalDateFilterChange(event: any): void {
    const val = Number(event.target.value);
    this.globalDateFilter = val;
    this.summaryDateFilter = val;
    this.courseDateFilter = val;
    this.resourceDateFilter = val;
    this.telemetryDateFilter = val;

    localStorage.setItem('admin_globalDateFilter', val.toString());
    localStorage.setItem('admin_summaryDateFilter', val.toString());
    localStorage.setItem('admin_courseDateFilter', val.toString());
    localStorage.setItem('admin_resourceDateFilter', val.toString());
    localStorage.setItem('admin_telemetryDateFilter', val.toString());

    this.loadAnalytics();
  }

  onLocalDateFilterChange(section: string, event: any): void {
    const val = Number(event.target.value);
    if (section === 'summary') {
      this.summaryDateFilter = val;
      localStorage.setItem('admin_summaryDateFilter', val.toString());
      this.loadAdminSummary();
    } else if (section === 'course') {
      this.courseDateFilter = val;
      localStorage.setItem('admin_courseDateFilter', val.toString());
      this.loadCourseAnalytics();
    } else if (section === 'resource') {
      this.resourceDateFilter = val;
      localStorage.setItem('admin_resourceDateFilter', val.toString());
      this.loadResourceAnalytics();
    } else if (section === 'telemetry') {
      this.telemetryDateFilter = val;
      localStorage.setItem('admin_telemetryDateFilter', val.toString());
      this.loadTelemetryStats();
    }
  }

  loadAdminSummary(): void {
    this.telemetryService.getAdminSummary(this.summaryDateFilter).subscribe({
      next: (summary) => {
        this.totalStudentsCount = summary.totalStudents || 0;
        this.activeStudentsCount = summary.activeStudents || 0;
        this.totalCoursesCount = summary.totalCourses || 0;
        this.totalEnrollmentsCount = summary.courseEnrollments || 0;
        this.certificatesIssuedCount = summary.certificatesIssued || 0;
        this.totalTestsTakenCount = summary.totalTestsTaken || 0;
        this.averageTestScore = summary.averageTestScore || 0.0;
        
        // Resource Usage
        this.resourceAnalyticsBreakdown = summary.resourceUsage || {};

        // Render charts once summary is loaded
        setTimeout(() => {
          this.renderAccessibilityChart(summary.accessibilityUsage || {});
        }, 100);
      },
      error: (err) => console.error('Error loading admin summary', err)
    });
  }

  loadCourseAnalytics(): void {
    this.telemetryService.getCourseAnalytics(this.courseDateFilter).subscribe({
      next: (data) => {
        this.courseAnalytics = data || [];
      },
      error: (err) => console.error('Error loading course analytics', err)
    });
  }

  loadResourceAnalytics(): void {
    this.telemetryService.getResourceAnalytics(this.resourceDateFilter).subscribe({
      next: (data) => {
        setTimeout(() => {
          this.renderResourceCharts(data || {});
        }, 150);
      },
      error: (err) => console.error('Error loading resource analytics', err)
    });
  }

  loadTelemetryStats(): void {
    this.telemetryService.getTelemetryStats(this.telemetryDateFilter).subscribe({
      next: (stats) => {
        this.mostSearchedKeywords = stats.mostSearchedKeywords || [];
        this.mostSearchedCourses = stats.mostSearchedCourses || [];
        this.mostViewedResources = stats.mostViewedResources || [];
        this.mostUsedAccessibilityFeatures = stats.mostUsedAccessibilityFeatures || [];
      },
      error: (err) => console.error('Error loading telemetry stats', err)
    });
  }

  renderAccessibilityChart(data: any) {
    const canvas = document.getElementById('accessibilityChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.accessibilityChart) {
      this.accessibilityChart.destroy();
    }

    const labels = Object.keys(data);
    const values = Object.values(data);

    this.accessibilityChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: ['#7c3aed', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { size: 11 }
            }
          }
        }
      },
      plugins: [{
        id: 'emptyDoughnut',
        afterDraw(chart: any) {
          const { datasets } = chart.data;
          const hasData = datasets[0].data.some((val: any) => Number(val) > 0);
          if (!hasData) {
            const { ctx, chartArea: { left, top, right, bottom } } = chart;
            const centerX = (left + right) / 2;
            const centerY = (top + bottom) / 2;
            const outerRadius = Math.min(right - left, bottom - top) / 2;
            const meta = chart.getDatasetMeta(0);
            const innerRadius = (meta.controller as any).innerRadius || (outerRadius * 0.8);
            const thickness = outerRadius - innerRadius;

            ctx.beginPath();
            ctx.lineWidth = thickness;
            ctx.strokeStyle = '#e2e8f0';
            ctx.arc(centerX, centerY, innerRadius + thickness / 2, 0, 2 * Math.PI);
            ctx.stroke();
          }
        }
      }]
    });
  }

  renderResourceCharts(data: any) {
    const barCanvas = document.getElementById('resourceBarChart') as HTMLCanvasElement;
    if (barCanvas) {
      if (this.resourceBarChart) {
        this.resourceBarChart.destroy();
      }

      const breakdown = data.breakdown || {};
      const labels = Object.keys(breakdown);
      const values = Object.values(breakdown);

      this.resourceBarChart = new Chart(barCanvas, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Resource Opens',
            data: values,
            backgroundColor: 'rgba(124, 58, 237, 0.7)',
            borderColor: '#7c3aed',
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0 }
            }
          }
        }
      });
    }

    const trendCanvas = document.getElementById('resourceTrendChart') as HTMLCanvasElement;
    if (trendCanvas) {
      if (this.resourceTrendChart) {
        this.resourceTrendChart.destroy();
      }

      const dates = data.dates || [];
      const trends = data.trends || {};
      const datasets = [];

      const colors: { [key: string]: string } = {
        'PDF': '#3b82f6',
        'Video': '#ef4444',
        'Audio': '#10b981',
        'Braille': '#7c3aed',
        'Sign Language': '#f59e0b'
      };

      for (const [format, color] of Object.entries(colors)) {
        if (trends[format]) {
          datasets.push({
            label: format,
            data: trends[format],
            borderColor: color,
            backgroundColor: color + '15',
            fill: true,
            tension: 0.3
          });
        }
      }

      this.resourceTrendChart = new Chart(trendCanvas, {
        type: 'line',
        data: {
          labels: dates,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 10,
                font: { size: 10 }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0 }
            }
          }
        }
      });
    }
  }

  // Course management local filters
  getDynamicCategories(): string[] {
    const categories = this.courses.map(c => c.category).filter(Boolean);
    return Array.from(new Set(categories));
  }

  getFilteredCourses(): any[] {
    let filtered = this.courses;
    
    if (this.courseSearchQuery) {
      const q = this.courseSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(c => 
        (c.title || c.name || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q)
      );
    }
    
    if (this.courseCategoryFilter) {
      filtered = filtered.filter(c => c.category === this.courseCategoryFilter);
    }
    
    if (this.courseDifficultyFilter) {
      filtered = filtered.filter(c => c.difficulty === this.courseDifficultyFilter);
    }
    
    return filtered;
  }

  getFilteredSchemes(): any[] {
    if (!this.schemeSearchQuery) return this.publishedSchemes;
    const q = this.schemeSearchQuery.toLowerCase().trim();
    return this.publishedSchemes.filter(s => 
      s.title?.toLowerCase().includes(q) ||
      s.summary?.toLowerCase().includes(q)
    );
  }

  getFilteredEditRequests(): any[] {
    if (!this.approvalSearchQuery) return this.pendingEditRequests;
    const q = this.approvalSearchQuery.toLowerCase().trim();
    return this.pendingEditRequests.filter(r => 
      r.userId?.toLowerCase().includes(q) ||
      r.fieldName?.toLowerCase().includes(q) ||
      (r.newValue || '').toLowerCase().includes(q)
    );
  }

  getFilteredCourseResources(): any[] {
    if (!this.resourceSearchQuery) return this.courseResources;
    const q = this.resourceSearchQuery.toLowerCase().trim();
    return this.courseResources.filter(r => 
      r.title?.toLowerCase().includes(q) ||
      (r.format || '').toLowerCase().includes(q)
    );
  }
}
