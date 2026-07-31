import { Component, Inject, PLATFORM_ID, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccessibilityService } from '../../services/accessibility.service';
import { ToastService } from '../../services/toast.service';
import { UserService } from '../../services/user.service';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface Course {
  id: string;
  title: string;
  category: 'technical' | 'soft-skills' | 'creative';
  description: string;
  duration: string;
  lessons: number;
  difficulty: string;
  image: string;
  details: string;
  Test: {
    question: string;
    options: string[];
    correctIndex: number;
  };
  whatYouWillLearn?: string;
  learningOutcomes?: string;
  accessibilityFeatures?: string;
}

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.css']
})
export class CoursesComponent implements AfterViewInit {
  bgTransform: string = 'translate3d(0px, 0px, 0px) scale(1.05)';
  public searchQuery: string = '';
  public activeTab: string = 'all';
  public selectedCourse: Course | null = null;
  public showTestModal: boolean = false;
  public selectedTestOption: number | null = null;
  public TestAnswered: boolean = false;
  public TestCorrect: boolean = false;
  private isBrowser: boolean;

  public courses: Course[] = [];
  public enrollments: any[] = [];
  public userEnrollmentMap: { [courseId: string]: any } = {};

  // Enrollment Modal
  public showEnrollModal: boolean = false;
  public selectedPreferences: { [key: string]: boolean } = {
    'Text': false,
    'Video': false,
    'Audio': false,
    'Sign Language': false,
    'Braille': false,
    'All Resources': false
  };
  public preferencesList: string[] = ['Text', 'Video', 'Audio', 'Sign Language', 'Braille', 'All Resources'];
  public isLoadingResources: boolean = false;

  // Unenroll Modal
  public showUnenrollModal: boolean = false;
  public unenrollReview: string = '';

  private previousActiveElement: HTMLElement | null = null;

  focusModal() {
    setTimeout(() => {
      const modal = document.querySelector('.modal-dialog-custom, .Test-modal') as HTMLElement;
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

  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (this.showEnrollModal) {
        this.closeEnrollModal();
        event.preventDefault();
      }
      if (this.showUnenrollModal) {
        this.closeUnenrollModal();
        event.preventDefault();
      }
      if (this.showTestModal) {
        this.closeTest();
        event.preventDefault();
      }
    }

    if (event.key === 'Tab') {
      if (this.showEnrollModal || this.showUnenrollModal || this.showTestModal) {
        this.trapFocus('modal-dialog-custom, .Test-modal', event);
      }
    }
  }

  private trapFocus(selector: string, event: KeyboardEvent) {
    const modal = document.querySelector(selector);
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

  constructor(
    public accService: AccessibilityService,
    private toastService: ToastService,
    private router: Router,
    private userService: UserService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    this.loadCourses();
    this.loadEnrollments();
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      setTimeout(() => {
        this.initGsapAnimations();
      }, 100);
    }
  }

  initGsapAnimations(): void {
    // Header Animation
    gsap.from('.courses-header', { 
      y: -50, opacity: 0, duration: 1, ease: 'power3.out' 
    });
    gsap.from('.courses-header h1', { 
      y: 20, opacity: 0, duration: 0.8, delay: 0.2, ease: 'power2.out' 
    });
    gsap.from('.courses-header p', { 
      y: 20, opacity: 0, duration: 0.8, delay: 0.4, ease: 'power2.out' 
    });
    gsap.from('.search-box, .btn-tab', {
      y: 20, opacity: 0, duration: 0.6, stagger: 0.1, delay: 0.6, ease: 'power2.out'
    });

    // Course Cards Staggered Entrance
    gsap.utils.toArray('.course-card').forEach((card: any, i) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 90%',
        },
        y: 50,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: (i % 2) * 0.2
      });
    });
  }

  loadCourses() {
    this.userService.getAllCourses().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
           this.courses = data;
        }
      },
      error: (err) => console.error('Error fetching courses', err)
    });
  }

  loadEnrollments() {
    const currentUser = this.userService.getCurrentUser();
    if (currentUser) {
      const userId = currentUser.disabilityId || currentUser.adminId || '';
      if (userId) {
        this.userService.getStudentAnalytics(userId).subscribe({
          next: (data) => {
            if (data && data.enrollments) {
              this.enrollments = data.enrollments;
              this.userEnrollmentMap = {};
              this.enrollments.forEach(e => {
                if (e.course) {
                  this.userEnrollmentMap[e.course.id] = e;
                }
              });
            }
          },
          error: (err) => console.error('Error fetching student enrollments', err)
        });
      }
    }
  }

  get filteredCourses(): Course[] {
    return this.courses.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                            course.description.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesTab = this.activeTab === 'all' || course.category === this.activeTab;
      return matchesSearch && matchesTab;
    });
  }

  public readCourseAloud(course: Course, event: Event) {
    event.stopPropagation();
    this.accService.playClickSound();
    
    const wasTtsEnabled = this.accService.ttsEnabled;
    this.accService.ttsEnabled = true;
    
    const textToSpeak = `Course: ${course.title}. Category: ${course.category}. Description: ${course.description}. Duration is ${course.duration} with ${course.lessons} lessons.`;
    this.accService.speakText(textToSpeak);
    
    this.accService.ttsEnabled = wasTtsEnabled;
  }

  public openCourseDetails(course: Course) {
    this.accService.playClickSound();
    const currentUser = this.userService.getCurrentUser();
    if (currentUser) {
      this.router.navigate(['/dashboard/studentdashboard/course', course.id]);
    } else {
      this.toastService.warning('Please log in with your details to view this course.', 'Login Required');
      this.router.navigate(['/login']);
    }
  }

  public closeCourseDetails() {
    this.accService.playClickSound();
    this.selectedCourse = null;
    this.accService.stopSpeaking();
  }

  public enrollCourse(course: Course) {
    this.accService.playClickSound();
    const currentUser = this.userService.getCurrentUser();
    if (currentUser) {
      this.previousActiveElement = document.activeElement as HTMLElement;
      this.selectedCourse = course;
      this.showEnrollModal = true;
      this.focusModal();
      this.selectedPreferences = {
        'Text': false,
        'Video': false,
        'Audio': false,
        'Sign Language': false,
        'Braille': false,
        'All Resources': false
      };
    } else {
      this.toastService.warning('Please log in with your details to enroll in this course.', 'Login Required');
      this.router.navigate(['/login']);
    }
  }

  public isFormatAvailable(pref: string): boolean {
    return true; 
  }

  public togglePreference(pref: string) {
    this.accService.playClickSound();
    if (pref === 'All Resources') {
      const newVal = !this.selectedPreferences['All Resources'];
      this.selectedPreferences['All Resources'] = newVal;
      this.preferencesList.forEach(p => {
        if (p !== 'All Resources') {
          this.selectedPreferences[p] = newVal;
        }
      });
    } else {
      this.selectedPreferences[pref] = !this.selectedPreferences[pref];
      if (!this.selectedPreferences[pref]) {
        this.selectedPreferences['All Resources'] = false;
      } else {
        const allChecked = this.preferencesList
          .filter(p => p !== 'All Resources')
          .every(p => this.selectedPreferences[p]);
        if (allChecked) {
          this.selectedPreferences['All Resources'] = true;
        }
      }
    }
  }

  public closeEnrollModal() {
    this.showEnrollModal = false;
    this.selectedCourse = null;
    this.restorePreviousFocus();
  }

  public submitEnrollment() {
    const currentUser = this.userService.getCurrentUser();
    if (currentUser && this.selectedCourse) {
       const userId = currentUser.disabilityId || currentUser.adminId || '';
       if (!userId) {
         this.toastService.error('User ID not found. Cannot enroll.');
         return;
       }

       let prefString = '';
       if (this.selectedPreferences['All Resources']) {
         prefString = 'All Resources';
       } else {
         const checked = this.preferencesList.filter(p => p !== 'All Resources' && this.selectedPreferences[p]);
         if (checked.length === 0) {
           this.toastService.warning('Please select at least one learning mode.');
           return;
         }
         prefString = checked.join(', ');
       }

       this.userService.enrollInCourse(userId, this.selectedCourse.id, prefString).subscribe({
         next: () => {
           this.toastService.success('Enrolled successfully! Redirecting to course dashboard.');
           this.closeEnrollModal();
           this.closeCourseDetails();
           this.loadEnrollments();
           this.router.navigate(['/dashboard/studentdashboard/course', this.selectedCourse?.id]);
         },
         error: (err) => {
           console.error(err);
           this.toastService.error('Failed to enroll in course.');
         }
       });
    }
  }

  public openUnenrollModal(course: Course, event?: Event) {
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

  public closeUnenrollModal() {
    this.showUnenrollModal = false;
    this.selectedCourse = null;
    this.unenrollReview = '';
    this.restorePreviousFocus();
  }

  public submitUnenroll() {
    const currentUser = this.userService.getCurrentUser();
    if (currentUser && this.selectedCourse) {
      const userId = currentUser.disabilityId || currentUser.adminId || '';
      if (!userId) return;

      this.userService.unenrollFromCourse(userId, this.selectedCourse.id, this.unenrollReview).subscribe({
        next: () => {
          this.toastService.success('Successfully unenrolled from the course.');
          this.closeUnenrollModal();
          this.loadEnrollments();
        },
        error: (err) => {
          console.error(err);
          this.toastService.error('Failed to unenroll from course.');
        }
      });
    }
  }

  // Test activation
  public startTest(course: Course) {
    this.accService.playClickSound();
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.selectedCourse = course;
    this.showTestModal = true;
    this.selectedTestOption = null;
    this.TestAnswered = false;
    this.TestCorrect = false;
    this.focusModal();
    this.accService.speakText(`Test started for ${course.title}. The question is: ${course.Test.question}`);
  }

  public selectTestOption(index: number) {
    this.accService.playClickSound();
    this.selectedTestOption = index;
  }

  public submitTestAnswer() {
    if (this.selectedTestOption === null || !this.selectedCourse) return;

    this.TestAnswered = true;
    this.accService.playClickSound();
    
    if (this.selectedTestOption === this.selectedCourse.Test.correctIndex) {
      this.TestCorrect = true;
      this.accService.playSuccessSound();
      this.toastService.success('Correct Answer! Super job!');
      this.accService.speakText('Hurray! That is the correct answer! Great job.');
      this.triggerConfetti();
    } else {
      this.TestCorrect = false;
      this.toastService.warning('Wrong Answer. Give it another try!');
      this.accService.speakText('Oops, that is not correct. Let us read and try again.');
    }
  }

  public closeTest() {
    this.accService.playClickSound();
    this.showTestModal = false;
    this.selectedTestOption = null;
    this.TestAnswered = false;
    this.accService.stopSpeaking();
    this.restorePreviousFocus();
  }

  // Confetti Particle Emitter
  private triggerConfetti() {
    if (!this.isBrowser) return;

    const TestBox = document.querySelector('.Test-modal');
    if (!TestBox) return;

    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#7c3aed', '#06b6d4'];
    for (let i = 0; i < 40; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      
      const dx = (Math.random() - 0.5) * 350 + 'px';
      const dy = (Math.random() * -180 - 60) + 'px';
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      confetti.style.setProperty('--dx', dx);
      confetti.style.setProperty('--dy', dy);
      confetti.style.setProperty('--color', color);
      confetti.style.left = '50%';
      confetti.style.top = '50%';

      TestBox.appendChild(confetti);

      setTimeout(() => {
        confetti.remove();
      }, 1500);
    }
  }
}
