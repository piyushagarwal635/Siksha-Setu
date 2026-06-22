import { Component, OnInit, Inject, PLATFORM_ID, ViewChild, ElementRef, OnDestroy, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';
import { BrailleService } from '../../services/braille.service';
import { BrailleHardwareService } from '../../services/braille-hardware.service';
import { AccessibilityService } from '../../services/accessibility.service';
import { getRandomTest, TestQuestion } from '../../shared/test-pool';
import { BrailleContentViewerComponent } from '../../braille/braille-content-viewer/braille-content-viewer.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SearchTelemetryService } from '../../services/search-telemetry.service';
import { timeout, catchError } from 'rxjs/operators';
import { throwError, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-course-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BrailleContentViewerComponent],
  templateUrl: './course-dashboard.component.html',
  styleUrl: './course-dashboard.component.css'
})
export class CourseDashboardComponent implements OnInit, OnDestroy {
  courseId: string | null = null;
  courseDetails: any = null;
  resources: any[] = [];
  
  // Grouped resources
  textResources: any[] = [];
  videoResources: any[] = [];
  audioResources: any[] = [];
  signLanguageResources: any[] = [];
  brailleResources: any[] = [];

  isLoading = true;
  isEnrolled = false;
  enrollment: any = null;

  // Resource Viewer state
  activeFormat: string = 'text'; // 'text', 'video', 'audio', 'sign', 'braille'
  selectedResource: any = null;
  safeFileUrl: SafeResourceUrl | null = null;

  // Custom Media Player & PDF.js states
  isResourceLoading = false;
  secureVideoSrc: string | null = null;
  secureAudioSrc: string | null = null;
  securePdfBlob: Blob | null = null;
  currentBlobUrl: string | null = null;

  // Video player references & state
  @ViewChild('customVideoPlayer') customVideoPlayerRef!: ElementRef<HTMLVideoElement>;
  isVideoPlaying = false;
  isVideoMuted = false;
  videoVolume = 1.0;
  videoCurrentTime = 0;
  videoDuration = 0;
  videoProgressPercent = 0;
  videoTimeDisplay = '00:00 / 00:00';

  // Audio player references & state
  @ViewChild('customAudioPlayer') customAudioPlayerRef!: ElementRef<HTMLAudioElement>;
  isAudioPlaying = false;
  isAudioMuted = false;
  audioVolume = 1.0;
  audioCurrentTime = 0;
  audioDuration = 0;
  audioProgressPercent = 0;
  audioTimeDisplay = '00:00 / 00:00';

  // PDF.js State & references
  @ViewChild('pdfCanvas') pdfCanvasRef!: ElementRef<HTMLCanvasElement>;
  pdfjsLoaded = false;
  pdfDoc: any = null;
  pdfPageNumber = 1;
  pdfTotalPages = 0;
  isPdfLoading = false;

  // Test State
  TestQuestions: TestQuestion[] = [];
  currentTestIndex: number = 0;
  TestScore: number = 0;
  TestAnswers: number[] = [];
  TestFinished: boolean = false;
  activeTab: string = 'resources'; // 'resources', 'Test', 'certificate'
  hasSubmittedTest: boolean = false;
  showTestBraille = false;
  showResourceBraille = false;

  // Enrollment Modal
  showEnrollModal: boolean = false;
  selectedPreferences: { [key: string]: boolean } = {
    'Text': false,
    'Video': false,
    'Audio': false,
    'Sign Language': false,
    'Braille': false,
    'All Resources': false
  };
  preferencesList: string[] = ['Text', 'Video', 'Audio', 'Sign Language', 'Braille', 'All Resources'];

  // Unenroll Modal
  showUnenrollModal: boolean = false;
  unenrollReview = '';

  // Category Unlock Modal State
  showUnlockPromptModal: boolean = false;
  pendingUnlockCategory: string = '';

  expandedSections: { [key: string]: boolean } = {
    'text': false,
    'video': false,
    'audio': false,
    'sign': false,
    'braille': false
  };

  // Braille simulator state
  brailleText: string = '';
  translatedBraille: string = '';
  selectedBrailleIndex: number = 0;
  connectionStatus: string = 'Disconnected';
  deviceName: string | null = null;
  braillePageStart: number = 0;
  braillePageSize: number = 20;
  displayCells: { cell: string; original: string }[] = [];

  private isBrowser: boolean;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private toastService: ToastService,
    private brailleService: BrailleService,
    private brailleHardware: BrailleHardwareService,
    private accService: AccessibilityService,
    private sanitizer: DomSanitizer,
    private telemetryService: SearchTelemetryService,
    private http: HttpClient,
    private elementRef: ElementRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  previousActiveElement: HTMLElement | null = null;

  focusCourseTitle() {
    let attempts = 0;
    const tryFocus = () => {
      const heading = document.getElementById('course-title-heading');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus();
      } else if (attempts < 10) {
        attempts++;
        setTimeout(tryFocus, 100);
      }
    };
    tryFocus();
  }

  focusResourceContent() {
    let attempts = 0;
    const tryFocus = () => {
      const heading = document.getElementById('resource-title-heading');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus();
      } else {
        const contentArea = document.getElementById('resource-content-area');
        if (contentArea) {
          contentArea.setAttribute('tabindex', '-1');
          contentArea.focus();
        } else if (attempts < 10) {
          attempts++;
          setTimeout(tryFocus, 100);
        }
      }
    };
    tryFocus();
  }

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

  closeUnlockPromptModal() {
    this.showUnlockPromptModal = false;
    this.restorePreviousFocus();
  }

  openTestBraille() {
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.showTestBraille = true;
  }

  closeTestBraille() {
    this.showTestBraille = false;
    this.restorePreviousFocus();
  }

  closeResourceBraille() {
    this.showResourceBraille = false;
    this.restorePreviousFocus();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      let handled = false;
      if (this.showEnrollModal) {
        this.closeEnrollModal();
        handled = true;
      } else if (this.showUnlockPromptModal) {
        this.closeUnlockPromptModal();
        handled = true;
      } else if (this.showUnenrollModal) {
        this.closeUnenrollModal();
        handled = true;
      } else if (this.showTestBraille) {
        this.closeTestBraille();
        handled = true;
      } else if (this.showResourceBraille) {
        this.closeResourceBraille();
        handled = true;
      }

      if (handled) {
        event.preventDefault();
        return;
      }

      // Escape exits the current scope:
      // Resource Scope -> Course Scope
      // Course Scope -> Dashboard Scope
      if (this.selectedResource) {
        this.selectedResource = null;
        this.safeFileUrl = null;
        this.focusCourseTitle();
        event.preventDefault();
      } else {
        this.goBack();
        event.preventDefault();
      }
    }

    if (event.key === 'Tab') {
      if (this.showEnrollModal || this.showUnlockPromptModal || this.showUnenrollModal) {
        this.trapFocus('modal-dialog-custom', event);
      } else {
        this.trapCourseFocus(event);
      }
    }
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

  private trapCourseFocus(event: KeyboardEvent) {
    if (this.showEnrollModal || this.showUnlockPromptModal || this.showUnenrollModal || this.showTestBraille || this.showResourceBraille) {
      return;
    }

    const host = this.elementRef.nativeElement;
    const focusable = host.querySelectorAll('button, input, select, textarea, a, [tabindex]:not([tabindex="-1"])');
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

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.courseId = id;
        this.loadCourseData();
      } else {
        this.router.navigate(['/dashboard/studentdashboard']);
      }
    });

    this.brailleHardware.deviceStatus$.subscribe(status => this.connectionStatus = status);
    this.brailleHardware.connectedDeviceName$.subscribe(name => this.deviceName = name);
    this.brailleHardware.autoDetectPreviousDevices();
  }

  get currentTestBrailleText(): string {
    const Test = this.TestQuestions[this.currentTestIndex];
    if (!Test) return '';
    return [
      Test.question,
      ...Test.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`)
    ].join('\n');
  }

  loadCourseData() {
    this.isLoading = true;
    
    // Fetch all courses and filter
    this.userService.getAllCourses().pipe(
      timeout(10000),
      catchError(err => throwError(() => err))
    ).subscribe({
      next: (courses) => {
        this.courseDetails = courses.find((c: any) => c.id === this.courseId || String(c.id) === String(this.courseId));
        if (!this.courseDetails) {
          this.toastService.error('Course not found');
          this.router.navigate(['/dashboard/studentdashboard']);
          return;
        }

        // Fetch resources for this course
        this.userService.getResourcesByCourse(this.courseId!).pipe(
          timeout(10000),
          catchError(err => throwError(() => err))
        ).subscribe({
          next: (res) => {
            this.resources = res || [];
            this.groupResources();
            this.checkEnrollmentStatus();
          },
          error: (err: any) => {
            console.error('Error fetching resources or timeout:', err);
            this.resources = [];
            this.groupResources();
            // Proceed to check enrollment even if resources fail/timeout, so user isn't stuck on spinner
            this.checkEnrollmentStatus();
          }
        });
      },
      error: (err: any) => {
        console.error('Error fetching courses or timeout:', err);
        this.isLoading = false;
        this.toastService.error('Failed to load course details. Please try again.');
      }
    });
  }

  checkEnrollmentStatus() {
    const currentUser = this.userService.getCurrentUser();
    if (currentUser && this.courseId) {
      const userId = currentUser.disabilityId || currentUser.adminId || '';
      this.userService.getEnrollment(userId, this.courseId).pipe(
        timeout(10000),
        catchError(err => throwError(() => err))
      ).subscribe({
        next: (data: any) => {
          if (data && data.id) {
            this.enrollment = data;
            this.isEnrolled = true;
            this.selectedResource = null;
            this.safeFileUrl = null;
          } else {
            this.enrollment = null;
            this.isEnrolled = false;
          }
          this.isLoading = false;
          if (this.isBrowser) {
            this.focusCourseTitle();
          }
        },
        error: (err: any) => {
          console.error('Error fetching enrollment or timeout:', err);
          this.isEnrolled = false;
          this.isLoading = false;
          if (this.isBrowser) {
            this.focusCourseTitle();
          }
        }
      });
    } else {
      this.isEnrolled = false;
      this.isLoading = false;
      if (this.isBrowser) {
        this.focusCourseTitle();
      }
    }
  }

  getSafeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  isPdfResource(res: any): boolean {
    return res && res.fileUrl && res.fileUrl.toLowerCase().endsWith('.pdf');
  }

  groupResources() {
    this.textResources = [];
    this.videoResources = [];
    this.audioResources = [];
    this.signLanguageResources = [];
    this.brailleResources = [];

    this.resources.forEach(res => {
      const format = res.format?.toLowerCase() || '';
      const fileUrl = res.fileUrl?.toLowerCase() || '';
      
      let resolvedFormat = format;
      if (!resolvedFormat) {
        if (fileUrl.endsWith('.pdf') || fileUrl.endsWith('.txt') || fileUrl.endsWith('.doc') || fileUrl.endsWith('.docx')) {
          resolvedFormat = 'text';
        } else if (fileUrl.endsWith('.mp4') || fileUrl.endsWith('.avi') || fileUrl.endsWith('.mkv') || fileUrl.endsWith('.mov')) {
          resolvedFormat = 'video';
        } else if (fileUrl.endsWith('.mp3') || fileUrl.endsWith('.wav') || fileUrl.endsWith('.ogg')) {
          resolvedFormat = 'audio';
        } else if (fileUrl.endsWith('.brf')) {
          resolvedFormat = 'brf';
        }
      }

      if (resolvedFormat === 'pdf' || resolvedFormat === 'text' || resolvedFormat === 'txt') {
        this.textResources.push(res);
      } else if (resolvedFormat === 'video' || resolvedFormat === 'mp4') {
        this.videoResources.push(res);
      } else if (resolvedFormat === 'audio' || resolvedFormat === 'mp3' || resolvedFormat === 'audio book') {
        this.audioResources.push(res);
      } else if (resolvedFormat === 'sign language' || resolvedFormat === 'signlanguage video') {
        this.signLanguageResources.push(res);
      } else if (resolvedFormat === 'braille' || resolvedFormat === 'braille docs' || resolvedFormat === 'brf') {
        this.brailleResources.push(res);
      }
    });
  }

  autoSelectFirstResource() {
    // Select the first available resource based on preference or availability
    if (this.textResources.length > 0) {
      this.selectResource(this.textResources[0], 'text');
    } else if (this.videoResources.length > 0) {
      this.selectResource(this.videoResources[0], 'video');
    } else if (this.audioResources.length > 0) {
      this.selectResource(this.audioResources[0], 'audio');
    } else if (this.signLanguageResources.length > 0) {
      this.selectResource(this.signLanguageResources[0], 'sign');
    } else if (this.brailleResources.length > 0) {
      this.selectResource(this.brailleResources[0], 'braille');
    }
  }

  resolveUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${environment.apiUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  selectResource(res: any, format: string) {
    this.accService.playClickSound();
    this.selectedResource = res;
    this.activeFormat = format;
    this.activeTab = 'resources';
    this.expandedSections[format] = true;

    // Revoke previous blob url
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
    this.secureVideoSrc = null;
    this.secureAudioSrc = null;
    this.securePdfBlob = null;
    this.pdfDoc = null;
    this.pdfTotalPages = 0;
    this.pdfPageNumber = 1;

    // Fetch resource as blob securely
    if (res && res.fileUrl) {
      this.isResourceLoading = true;
      const targetUrl = this.resolveUrl(res.fileUrl);
      this.http.get(targetUrl, { responseType: 'blob' }).subscribe({
        next: (blob) => {
          this.currentBlobUrl = URL.createObjectURL(blob);
          
          if (this.isPdfResource(res)) {
            this.securePdfBlob = blob;
            this.loadPdfjsAndRender(blob);
          } else if (format === 'video' || format === 'sign') {
            this.secureVideoSrc = this.currentBlobUrl;
            this.initCustomVideo();
            this.isResourceLoading = false;
            this.focusResourceContent();
          } else if (format === 'audio') {
            this.secureAudioSrc = this.currentBlobUrl;
            this.initCustomAudio();
            this.isResourceLoading = false;
            this.focusResourceContent();
          } else {
            this.isResourceLoading = false;
            this.focusResourceContent();
          }
        },
        error: (err: any) => {
          console.error('Failed to secure resource', err);
          this.toastService.error('Failed to load secure resource.');
          this.isResourceLoading = false;
        }
      });
    } else {
      this.isResourceLoading = false;
      this.focusResourceContent();
    }

    // Telemetry: Log RESOURCE_OPEN event
    const currentUser = this.userService.getCurrentUser();
    const userId = currentUser ? (currentUser.disabilityId || currentUser.adminId || '') : '';
    if (userId && res && res.id) {
      this.telemetryService.logTelemetry('RESOURCE_OPEN', String(res.id), `Opened resource: ${res.title} (Format: ${format})`, userId).subscribe();
    }

    // If Braille, translate description or title immediately, or load text file content
    if (format === 'braille') {
      if (res.fileUrl) {
        this.userService.getFileContent(res.fileUrl).subscribe({
          next: (content) => {
            this.brailleText = content || res.description || res.title || '';
            this.translateBraille();
          },
          error: (err: any) => {
            console.error('Failed to load Braille file content', err);
            this.brailleText = res.description || res.title || '';
            this.translateBraille();
          }
        });
      } else {
        this.brailleText = res.description || res.title || '';
        this.translateBraille();
      }
    }
  }

  ngOnDestroy() {
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
    }
  }

  // Custom Video Player Controls
  initCustomVideo() {
    this.isVideoPlaying = false;
    this.videoCurrentTime = 0;
    this.videoProgressPercent = 0;
    this.videoTimeDisplay = '00:00 / 00:00';
  }

  onVideoMetadataLoaded() {
    if (this.customVideoPlayerRef && this.customVideoPlayerRef.nativeElement) {
      const video = this.customVideoPlayerRef.nativeElement;
      this.videoDuration = video.duration || 0;
      this.isVideoMuted = video.muted;
      this.videoVolume = video.volume;
      this.updateVideoTimeDisplay();
    }
  }

  onVideoTimeUpdate() {
    if (this.customVideoPlayerRef && this.customVideoPlayerRef.nativeElement) {
      const video = this.customVideoPlayerRef.nativeElement;
      this.videoCurrentTime = video.currentTime;
      this.videoDuration = video.duration || 0;
      this.videoProgressPercent = this.videoDuration > 0 ? (this.videoCurrentTime / this.videoDuration) * 100 : 0;
      this.updateVideoTimeDisplay();
    }
  }

  onVideoVolumeChange() {
    if (this.customVideoPlayerRef && this.customVideoPlayerRef.nativeElement) {
      const video = this.customVideoPlayerRef.nativeElement;
      this.videoVolume = video.volume;
      this.isVideoMuted = video.muted;
    }
  }

  onVideoEnded() {
    this.isVideoPlaying = false;
  }

  toggleVideoPlay() {
    if (this.customVideoPlayerRef && this.customVideoPlayerRef.nativeElement) {
      const video = this.customVideoPlayerRef.nativeElement;
      if (video.paused) {
        video.play();
        this.isVideoPlaying = true;
      } else {
        video.pause();
        this.isVideoPlaying = false;
      }
    }
  }

  toggleVideoMute() {
    if (this.customVideoPlayerRef && this.customVideoPlayerRef.nativeElement) {
      const video = this.customVideoPlayerRef.nativeElement;
      video.muted = !video.muted;
      this.isVideoMuted = video.muted;
    }
  }

  onVideoVolumeInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const volume = parseFloat(target.value);
    if (this.customVideoPlayerRef && this.customVideoPlayerRef.nativeElement) {
      const video = this.customVideoPlayerRef.nativeElement;
      video.volume = volume;
      video.muted = volume === 0;
    }
  }

  onVideoSeek(event: Event) {
    const target = event.target as HTMLInputElement;
    const time = parseFloat(target.value);
    if (this.customVideoPlayerRef && this.customVideoPlayerRef.nativeElement) {
      const video = this.customVideoPlayerRef.nativeElement;
      video.currentTime = time;
      this.videoCurrentTime = time;
    }
  }

  toggleVideoFullscreen() {
    if (this.customVideoPlayerRef && this.customVideoPlayerRef.nativeElement) {
      const video = this.customVideoPlayerRef.nativeElement;
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if ((video as any).webkitRequestFullscreen) {
        (video as any).webkitRequestFullscreen();
      } else if ((video as any).msRequestFullscreen) {
        (video as any).msRequestFullscreen();
      }
    }
  }

  // Custom Audio Player Controls
  initCustomAudio() {
    this.isAudioPlaying = false;
    this.audioCurrentTime = 0;
    this.audioProgressPercent = 0;
    this.audioTimeDisplay = '00:00 / 00:00';
  }

  onAudioMetadataLoaded() {
    if (this.customAudioPlayerRef && this.customAudioPlayerRef.nativeElement) {
      const audio = this.customAudioPlayerRef.nativeElement;
      this.audioDuration = audio.duration || 0;
      this.isAudioMuted = audio.muted;
      this.audioVolume = audio.volume;
      this.updateAudioTimeDisplay();
    }
  }

  onAudioTimeUpdate() {
    if (this.customAudioPlayerRef && this.customAudioPlayerRef.nativeElement) {
      const audio = this.customAudioPlayerRef.nativeElement;
      this.audioCurrentTime = audio.currentTime;
      this.audioDuration = audio.duration || 0;
      this.audioProgressPercent = this.audioDuration > 0 ? (this.audioCurrentTime / this.audioDuration) * 100 : 0;
      this.updateAudioTimeDisplay();
    }
  }

  onAudioVolumeChange() {
    if (this.customAudioPlayerRef && this.customAudioPlayerRef.nativeElement) {
      const audio = this.customAudioPlayerRef.nativeElement;
      this.audioVolume = audio.volume;
      this.isAudioMuted = audio.muted;
    }
  }

  onAudioEnded() {
    this.isAudioPlaying = false;
  }

  toggleAudioPlay() {
    if (this.customAudioPlayerRef && this.customAudioPlayerRef.nativeElement) {
      const audio = this.customAudioPlayerRef.nativeElement;
      if (audio.paused) {
        audio.play();
        this.isAudioPlaying = true;
      } else {
        audio.pause();
        this.isAudioPlaying = false;
      }
    }
  }

  toggleAudioMute() {
    if (this.customAudioPlayerRef && this.customAudioPlayerRef.nativeElement) {
      const audio = this.customAudioPlayerRef.nativeElement;
      audio.muted = !audio.muted;
      this.isAudioMuted = audio.muted;
    }
  }

  onAudioVolumeInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const volume = parseFloat(target.value);
    if (this.customAudioPlayerRef && this.customAudioPlayerRef.nativeElement) {
      const audio = this.customAudioPlayerRef.nativeElement;
      audio.volume = volume;
      audio.muted = volume === 0;
    }
  }

  onAudioSeek(event: Event) {
    const target = event.target as HTMLInputElement;
    const time = parseFloat(target.value);
    if (this.customAudioPlayerRef && this.customAudioPlayerRef.nativeElement) {
      const audio = this.customAudioPlayerRef.nativeElement;
      audio.currentTime = time;
      this.audioCurrentTime = time;
    }
  }

  formatTime(time: number): string {
    if (isNaN(time) || time < 0) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  updateVideoTimeDisplay() {
    this.videoTimeDisplay = `${this.formatTime(this.videoCurrentTime)} / ${this.formatTime(this.videoDuration)}`;
  }

  updateAudioTimeDisplay() {
    this.audioTimeDisplay = `${this.formatTime(this.audioCurrentTime)} / ${this.formatTime(this.audioDuration)}`;
  }

  // PDF.js rendering logic
  loadPdfjsAndRender(blob: Blob) {
    this.isPdfLoading = true;
    this.loadPdfjs().then((pdfjsLib) => {
      this.pdfjsLoaded = true;
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const arrayBuffer = e.target.result;
        pdfjsLib.getDocument({ data: arrayBuffer }).promise.then((pdfDoc: any) => {
          this.pdfDoc = pdfDoc;
          this.pdfTotalPages = pdfDoc.numPages;
          this.pdfPageNumber = 1;
          this.isPdfLoading = false;
          this.isResourceLoading = false;
          this.focusResourceContent();
          setTimeout(() => {
            this.renderPdfPage(this.pdfPageNumber);
          });
        }).catch((err: any) => {
          console.error('Error loading PDF document', err);
          this.toastService.error('Error loading PDF document.');
          this.isPdfLoading = false;
          this.isResourceLoading = false;
        });
      };
      reader.readAsArrayBuffer(blob);
    }).catch((err) => {
      console.error('Error loading PDF.js script', err);
      this.toastService.error('Error loading PDF engine.');
      this.isPdfLoading = false;
      this.isResourceLoading = false;
    });
  }

  loadPdfjs(): Promise<any> {
    if ((window as any)['pdfjsLib']) {
      return Promise.resolve((window as any)['pdfjsLib']);
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      script.onload = () => {
        const pdfjsLib = (window as any)['pdfjsLib'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        resolve(pdfjsLib);
      };
      script.onerror = (err) => reject(err);
      document.body.appendChild(script);
    });
  }

  renderPdfPage(pageNum: number) {
    if (!this.pdfDoc || !this.pdfCanvasRef) return;
    this.pdfDoc.getPage(pageNum).then((page: any) => {
      const canvas = this.pdfCanvasRef.nativeElement;
      const context = canvas.getContext('2d');
      if (!context) return;

      const viewport = page.getViewport({ scale: 1.5 });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      page.render(renderContext);
    });
  }

  prevPdfPage() {
    if (this.pdfPageNumber > 1) {
      this.pdfPageNumber--;
      this.renderPdfPage(this.pdfPageNumber);
    }
  }

  nextPdfPage() {
    if (this.pdfPageNumber < this.pdfTotalPages) {
      this.pdfPageNumber++;
      this.renderPdfPage(this.pdfPageNumber);
    }
  }

  openResourceBraille(): void {
    if (this.selectedResource) {
      this.accService.playClickSound();
      this.previousActiveElement = document.activeElement as HTMLElement;
      this.showResourceBraille = true;
    } else {
      this.toastService.warning('Please select a resource first');
    }
  }

  markAsCompleted(resource: any) {
    const currentUser = this.userService.getCurrentUser();
    if (currentUser && this.courseId) {
      const userId = currentUser.disabilityId || currentUser.adminId || '';
      this.userService.completeResource(userId, this.courseId, resource.id).subscribe({
        next: (data: any) => {
          this.enrollment = data;
          this.toastService.success('Resource marked as completed!');
        },
        error: (err: any) => {
          console.error(err);
          this.toastService.error('Failed to mark resource as completed');
        }
      });
    }
  }

  isResourceCompleted(resourceId: number): boolean {
    if (!this.enrollment || !this.enrollment.completedResources) return false;
    const completedList = this.enrollment.completedResources.split(',');
    return completedList.includes(String(resourceId));
  }

  // Test Handling
  startTest() {
    if (!this.enrollment || !this.enrollment.testUnlocked) {
      this.toastService.warning('Complete all course materials before attempting the Test.');
      return;
    }
    this.accService.playClickSound();
    
    // Telemetry: Log TEST_ATTEMPT land/start event
    const currentUser = this.userService.getCurrentUser();
    const userId = currentUser ? (currentUser.disabilityId || currentUser.adminId || '') : '';
    if (userId && this.courseId) {
      this.telemetryService.logTelemetry('TEST_ATTEMPT', this.courseId, 'Started evaluation test', userId).subscribe();
    }
    
    // Navigate to the secure full-screen test environment
    this.router.navigate(['/secure-test', this.courseId]);
  }

  selectTestOption(optionIndex: number) {
    this.accService.playClickSound();
    this.TestAnswers[this.currentTestIndex] = optionIndex;
  }

  nextQuestion() {
    if (this.currentTestIndex < this.TestQuestions.length - 1) {
      this.currentTestIndex++;
    }
  }

  prevQuestion() {
    if (this.currentTestIndex > 0) {
      this.currentTestIndex--;
    }
  }

  submitTest() {
    let scoreCount = 0;
    this.TestAnswers.forEach((ans, index) => {
      if (ans === this.TestQuestions[index].correctIndex) {
        scoreCount++;
      }
    });

    const percentage = (scoreCount / this.TestQuestions.length) * 100.0;
    this.TestScore = scoreCount;
    this.hasSubmittedTest = true;

    const currentUser = this.userService.getCurrentUser();
    if (currentUser && this.courseId) {
      const userId = currentUser.disabilityId || currentUser.adminId || '';
      const payload = {
        score: percentage,
        tabSwitches: 0,
        fullscreenExits: 0,
        suspiciousEvents: ''
      };
      this.userService.submitTest(userId, this.courseId, payload).subscribe({
        next: (data: any) => {
          this.enrollment = data;
          this.TestFinished = true;

          if (percentage >= 80.0) {
            this.toastService.success(`Congratulations! You passed with ${percentage.toFixed(0)}%!`);
            this.activeTab = 'certificate';
            this.triggerConfetti();
          } else {
            this.toastService.error(`You scored ${percentage.toFixed(0)}%. You need at least 80% to pass. Try again!`);
          }
        },
        error: (err: any) => {
          console.error(err);
          this.toastService.error('Error saving Test results.');
        }
      });
    }
  }

  // Enrollment handling
  enrollCourse() {
    const currentUser = this.userService.getCurrentUser();
    if (currentUser) {
      this.previousActiveElement = document.activeElement as HTMLElement;
      this.showEnrollModal = true;
      this.selectedPreferences = {
        'Text': false,
        'Video': false,
        'Audio': false,
        'Sign Language': false,
        'Braille': false,
        'All Resources': false
      };
      this.focusModal();
    } else {
      this.toastService.warning('Please log in to enroll.', 'Login Required');
      this.router.navigate(['/login']);
    }
  }

  isFormatAvailable(pref: string): boolean {
    if (!this.courseDetails) return false;
    switch (pref) {
      case 'Text': return this.textResources.length > 0;
      case 'Video': return this.videoResources.length > 0;
      case 'Audio': return this.audioResources.length > 0;
      case 'Sign Language': return this.signLanguageResources.length > 0;
      case 'Braille': return this.brailleResources.length > 0;
      default: return true;
    }
  }

  togglePreference(pref: string) {
    this.accService.playClickSound();
    if (pref === 'All Resources') {
      const newVal = !this.selectedPreferences['All Resources'];
      this.selectedPreferences['All Resources'] = newVal;
      this.preferencesList.forEach(p => {
        if (p !== 'All Resources') {
          if (this.isFormatAvailable(p)) {
            this.selectedPreferences[p] = newVal;
          } else {
            this.selectedPreferences[p] = false;
          }
        }
      });
    } else {
      this.selectedPreferences[pref] = !this.selectedPreferences[pref];
      if (!this.selectedPreferences[pref]) {
        this.selectedPreferences['All Resources'] = false;
      } else {
        const allAvailableChecked = this.preferencesList
          .filter(p => p !== 'All Resources' && this.isFormatAvailable(p))
          .every(p => this.selectedPreferences[p]);
        if (allAvailableChecked) {
          this.selectedPreferences['All Resources'] = true;
        }
      }
    }
  }

  submitEnrollment() {
    const currentUser = this.userService.getCurrentUser();
    if (currentUser && this.courseDetails) {
      const userId = currentUser.disabilityId || currentUser.adminId || '';
      
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

      this.userService.enrollInCourse(userId, this.courseDetails.id, prefString).subscribe({
        next: () => {
          this.toastService.success('Successfully enrolled!');
          this.showEnrollModal = false;
          this.restorePreviousFocus();
          this.loadCourseData(); // Reload details and open resource viewer
        },
        error: (err: any) => {
          console.error(err);
          this.toastService.error('Enrollment failed');
        }
      });
    }
  }

  closeEnrollModal() {
    this.showEnrollModal = false;
    this.restorePreviousFocus();
  }

  // Locked Category and Unlock Prompt Methods
  isCategoryEnabled(category: string): boolean {
    if (!this.enrollment || !this.enrollment.resourcePreference) return false;
    const pref = this.enrollment.resourcePreference.toLowerCase();
    if (pref.includes('all resources')) return true;
    
    if (category === 'text' && pref.includes('text')) return true;
    if (category === 'video' && pref.includes('video')) return true;
    if (category === 'audio' && pref.includes('audio')) return true;
    if (category === 'sign' && pref.includes('sign language')) return true;
    if (category === 'braille' && pref.includes('braille')) return true;
    
    return false;
  }

  handleCategoryHeaderClick(category: string, event: Event) {
    this.accService.playClickSound();
    const resources = this.getResourcesByCategory(category);
    
    if (resources.length === 0) {
      // If there are no resources in the course, do not toggle accordion
      event.stopPropagation();
      event.preventDefault();
      return;
    }
    
    // Toggle expansion locally (even if locked, so user can see locked items)
    this.expandedSections[category] = !this.expandedSections[category];
  }

  promptUnlockCategory(category: string) {
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.pendingUnlockCategory = category;
    this.showUnlockPromptModal = true;
    this.accService.speakText(`This category is locked. Would you like to unlock ${this.getCategoryLabel(category)} support for this course?`);
    this.focusModal();
  }

  confirmUnlockCategory() {
    const cat = this.pendingUnlockCategory;
    if (!cat || !this.enrollment) return;
    
    let currentPref = this.enrollment.resourcePreference || '';
    let formatName = '';
    switch (cat) {
      case 'text': formatName = 'Text'; break;
      case 'video': formatName = 'Video'; break;
      case 'audio': formatName = 'Audio'; break;
      case 'sign': formatName = 'Sign Language'; break;
      case 'braille': formatName = 'Braille'; break;
    }
    
    let newPref = '';
    if (currentPref.toLowerCase().includes('all resources') || currentPref === '') {
      newPref = 'All Resources';
    } else {
      const parts = currentPref.split(',').map((s: string) => s.trim()).filter((s: string) => !!s);
      if (!parts.includes(formatName)) {
        parts.push(formatName);
      }
      
      const allFormats = ['Text', 'Video', 'Audio', 'Sign Language', 'Braille'];
      const allAvailable = allFormats.filter(f => this.isFormatAvailable(f));
      const allSelected = allAvailable.every(f => parts.includes(f));
      if (allSelected) {
        newPref = 'All Resources';
      } else {
        newPref = parts.join(', ');
      }
    }
    
    const currentUser = this.userService.getCurrentUser();
    if (currentUser) {
      const userId = currentUser.disabilityId || currentUser.adminId || '';
      this.userService.enrollInCourse(userId, this.courseId!, newPref).subscribe({
        next: () => {
          this.enrollment.resourcePreference = newPref;
          this.toastService.success(`Successfully unlocked ${this.getCategoryLabel(cat)}!`);
          this.showUnlockPromptModal = false;
          this.restorePreviousFocus();
          this.expandedSections[cat] = true; // Auto-expand the newly unlocked category
          
          const resourcesOfCat = this.getResourcesByCategory(cat);
          if (resourcesOfCat.length > 0) {
            this.selectResource(resourcesOfCat[0], cat);
          } else {
            this.activeFormat = cat;
          }
        },
        error: (err: any) => {
          console.error(err);
          this.toastService.error('Failed to unlock category.');
        }
      });
    }
  }

  getResourcesByCategory(cat: string): any[] {
    switch (cat) {
      case 'text': return this.textResources;
      case 'video': return this.videoResources;
      case 'audio': return this.audioResources;
      case 'sign': return this.signLanguageResources;
      case 'braille': return this.brailleResources;
      default: return [];
    }
  }

  getCategoryLabel(cat: string): string {
    switch (cat) {
      case 'text': return 'Text Notes';
      case 'video': return 'Video Lessons';
      case 'audio': return 'Audio Lessons';
      case 'sign': return 'Sign Language Video';
      case 'braille': return 'Braille Mode';
      default: return cat;
    }
  }

  generateCertificate() {
    const currentUser = this.userService.getCurrentUser();
    if (currentUser && this.courseId) {
      const userId = currentUser.disabilityId || currentUser.adminId || '';
      this.userService.generateCertificate(userId, this.courseId).subscribe({
        next: (data) => {
          this.enrollment = data;
          this.toastService.success('Certificate generated successfully!');
          this.goToAchievements();
        },
        error: (err) => {
          console.error(err);
          this.toastService.error('Failed to generate certificate');
        }
      });
    }
  }

  goToAchievements() {
    this.router.navigate(['/dashboard/studentdashboard'], { queryParams: { tab: 'achievements' } });
  }

  openUnenrollModal(): void {
    this.accService.playClickSound();
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.showUnenrollModal = true;
    this.unenrollReview = '';
    this.focusModal();
  }

  closeUnenrollModal(): void {
    this.showUnenrollModal = false;
    this.unenrollReview = '';
    this.restorePreviousFocus();
  }

  submitUnenroll(): void {
    const currentUser = this.userService.getCurrentUser();
    if (currentUser && this.courseDetails) {
      const userId = currentUser.disabilityId || currentUser.adminId || '';
      if (!userId) return;

      this.userService.unenrollFromCourse(userId, this.courseDetails.id, this.unenrollReview).subscribe({
        next: () => {
          this.toastService.success('Successfully unenrolled from the course.');
          this.closeUnenrollModal();
          this.router.navigate(['/dashboard/studentdashboard']);
        },
        error: (err: any) => {
          console.error(err);
          this.toastService.error('Failed to unenroll from course.');
        }
      });
    }
  }

  // Braille translator & Hardware Methods
  translateBraille() {
    if (this.selectedResource && this.selectedResource.fileUrl && this.selectedResource.fileUrl.toLowerCase().endsWith('.brf')) {
      this.translatedBraille = this.brailleService.parseBRF(this.brailleText);
      // Map 1-to-1 for BRF files
      this.displayCells = [];
      for (let i = 0; i < this.translatedBraille.length; i++) {
        this.displayCells.push({
          cell: this.translatedBraille[i],
          original: this.brailleText[i] || ' '
        });
      }
    } else {
      this.translatedBraille = this.brailleService.translateText(this.brailleText);
      this.displayCells = this.brailleService.getDisplayCells(this.brailleText);
    }
    this.selectedBrailleIndex = 0;
    this.braillePageStart = 0;
    this.updateHardwareData();
  }

  selectBrailleCell(index: number) {
    this.selectedBrailleIndex = index;
  }

  get braillePageCells(): { cell: string; original: string }[] {
    if (!this.displayCells) return [];
    return this.displayCells.slice(this.braillePageStart, this.braillePageStart + this.braillePageSize);
  }

  panningPrev() {
    this.accService.playClickSound();
    this.braillePageStart = Math.max(0, this.braillePageStart - this.braillePageSize);
    this.selectedBrailleIndex = this.braillePageStart;
  }

  panningNext() {
    this.accService.playClickSound();
    const maxLength = this.translatedBraille.length;
    if (this.braillePageStart + this.braillePageSize < maxLength) {
      this.braillePageStart += this.braillePageSize;
      this.selectedBrailleIndex = this.braillePageStart;
    }
  }

  getDotStatesForCell(cell: string): boolean[] {
    return this.brailleService.getDotStates(cell);
  }

  selectPageCell(cellIndex: number) {
    this.accService.playClickSound();
    this.selectedBrailleIndex = this.braillePageStart + cellIndex;
  }

  mathMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  get activeBrailleCellDots(): boolean[] {
    if (!this.displayCells || this.displayCells.length <= this.selectedBrailleIndex) {
      return [false, false, false, false, false, false];
    }
    return this.brailleService.getDotStates(this.displayCells[this.selectedBrailleIndex].cell);
  }

  updateHardwareData() {
    const cells: boolean[][] = [];
    for (let i = 0; i < this.translatedBraille.length; i++) {
      cells.push(this.brailleService.getDotStates(this.translatedBraille[i]));
    }
    this.brailleHardware.sendBrailleData(this.translatedBraille, cells);
  }

  // Hardware connection
  connectUSB() {
    this.brailleHardware.connectUSB().then(success => {
      if (success) {
        this.toastService.success('Web Serial USB Braille Device Ready');
        this.updateHardwareData();
      }
    });
  }

  connectBluetooth() {
    this.brailleHardware.connectBluetooth().then(success => {
      if (success) {
        this.toastService.success('Web Bluetooth Braille Device Ready');
        this.updateHardwareData();
      }
    });
  }

  disconnectDevice() {
    this.brailleHardware.disconnect();
    this.toastService.info('Braille device disconnected.');
  }

  // Security Helper to disable context menu inside Resource Viewers
  disableContextMenu(event: MouseEvent) {
    event.preventDefault();
  }

  triggerConfetti() {
    if (!this.isBrowser) return;
    setTimeout(() => {
      const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];
      for (let i = 0; i < 60; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-particle';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.top = '-10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.width = Math.random() * 8 + 6 + 'px';
        confetti.style.height = Math.random() * 12 + 8 + 'px';
        confetti.style.position = 'fixed';
        confetti.style.zIndex = '99999';
        confetti.style.opacity = Math.random().toString();
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        
        document.body.appendChild(confetti);

        const duration = Math.random() * 2000 + 1500;
        const animation = confetti.animate([
          { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
          { transform: `translate(${(Math.random() - 0.5) * 200}px, 100vh) rotate(${Math.random() * 720}deg)`, opacity: 0 }
        ], {
          duration: duration,
          easing: 'cubic-bezier(0.1, 0.8, 0.25, 1)'
        });

        animation.onfinish = () => confetti.remove();
      }
    }, 100);
  }

  printCertificate() {
    if (!this.isBrowser) {
      return;
    }

    const printContent = document.getElementById('certificateBox')?.innerHTML;
    if (!printContent) {
      this.toastService.error('Could not find certificate content to print.');
      return;
    }

    const popupWin = window.open('', '_blank', 'top=0,left=0,height=100%,width=auto');
    if (!popupWin) {
      this.toastService.error('Popup blocked. Please allow popups for this site to print the certificate.');
      return;
    }

    popupWin.document.open();
    popupWin.document.write(`
      <html>
        <head>
          <title>Siksha Setu Certificate</title>
          <style>
            @media print {
              body {
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact; /* Chrome, Safari */
                color-adjust: exact; /* Firefox */
              }
              .certificate-print-wrap {
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
              }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${printContent}
        </body>
      </html>`
    );

    // Copy all stylesheets from the current document to the new window
    Array.from(document.styleSheets).forEach(styleSheet => {
      if (styleSheet.href) {
        const link = popupWin.document.createElement('link');
        link.rel = 'stylesheet';
        link.href = styleSheet.href;
        popupWin.document.head.appendChild(link);
      } else if (styleSheet.cssRules) {
        const style = popupWin.document.createElement('style');
        style.textContent = Array.from(styleSheet.cssRules)
          .map(rule => rule.cssText)
          .join('\n');
        popupWin.document.head.appendChild(style);
      }
    });

    popupWin.document.close();
  }

  goBack() {
    this.router.navigate(['/dashboard/studentdashboard']);
  }
}



