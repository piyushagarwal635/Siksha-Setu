import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged, finalize, switchMap, of, catchError } from 'rxjs';
import { Braille3dDisplayComponent } from '../../braille/braille-3d-display/braille-3d-display.component';
import {
  BrailleContentArea,
  BrailleDotMode,
  BrailleHardwareStatus,
  BrailleTranslation
} from '../../braille/braille.models';
import { BrailleApiService } from '../../services/braille-api.service';
import { BrailleHardwareService } from '../../services/braille-hardware.service';
import { ToastService } from '../../services/toast.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-braille-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, Braille3dDisplayComponent],
  templateUrl: './braille-dashboard.component.html',
  styleUrl: './braille-dashboard.component.css'
})
export class BrailleDashboardComponent implements OnInit, OnDestroy {
  courseId = '';
  resourceId = 0;
  courseDetails: any;
  selectedResource: any;
  translation?: BrailleTranslation;
  originalText = '';
  dotMode: BrailleDotMode = 6;
  contentArea: BrailleContentArea = 'LESSON_CONTENT';
  isLoading = true;
  isTranslating = false;
  translationError = '';
  hardwareStatus: BrailleHardwareStatus = {
    state: 'checking',
    transport: 'virtual',
    deviceName: null,
    profileId: null,
    message: 'Checking for Braille hardware...'
  };

  private readonly translateInput = new Subject<string>();
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly userService: UserService,
    private readonly brailleApi: BrailleApiService,
    readonly hardware: BrailleHardwareService,
    private readonly toast: ToastService
  ) {}

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('id') || '';
    this.resourceId = Number(this.route.snapshot.paramMap.get('resourceId'));
    if (!this.courseId || !Number.isInteger(this.resourceId) || this.resourceId <= 0) {
      this.rejectRoute('Invalid Braille resource.');
      return;
    }

    this.subscriptions.add(
      this.hardware.status$.subscribe(status => this.hardwareStatus = status)
    );
    this.subscriptions.add(
      this.translateInput.pipe(
        debounceTime(180),
        distinctUntilChanged(),
        switchMap(text => {
          this.isTranslating = true;
          this.translationError = '';
          return this.brailleApi.translate({
            text,
            contentArea: this.contentArea,
            dotMode: this.dotMode
          }).pipe(
            catchError(err => {
              this.translation = undefined;
              this.translationError = 'Liblouis translation service is unavailable.';
              return of(null);
            }),
            finalize(() => this.isTranslating = false)
          );
        })
      ).subscribe({
        next: translation => {
          if (translation) {
            this.acceptTranslation(translation);
          }
        }
      })
    );

    void this.hardware.detectAuthorizedHardware();
    this.loadResource();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  setDotMode(mode: BrailleDotMode): void {
    if (this.dotMode === mode) return;
    this.dotMode = mode;
    this.translateInput.next(this.originalText);
  }

  async connectUsb(): Promise<void> {
    const connected = await this.hardware.connectUsb();
    if (connected && this.translation) {
      await this.hardware.sendCells(this.translation.cells);
    }
  }

  async connectBluetooth(): Promise<void> {
    const connected = await this.hardware.connectBluetooth();
    if (connected && this.translation) {
      await this.hardware.sendCells(this.translation.cells);
    }
  }

  async disconnect(): Promise<void> {
    await this.hardware.disconnect();
  }

  goBack(): void {
    void this.router.navigate([`/dashboard/studentdashboard/course/${this.courseId}`]);
  }

  private loadResource(): void {
    this.userService.getAllCourses().subscribe({
      next: courses => {
        this.courseDetails = courses.find((course: any) => course.id === this.courseId);
        if (!this.courseDetails) {
          this.rejectRoute('Course not found.');
          return;
        }
        this.userService.getResourcesByCourse(this.courseId).subscribe({
          next: resources => {
            this.selectedResource = resources.find((resource: any) => resource.id === this.resourceId);
            if (!this.selectedResource || !this.isBrailleEligible(this.selectedResource)) {
              this.rejectRoute('Braille Mode is not available for this content type.');
              return;
            }
            this.contentArea = this.resolveContentArea(this.selectedResource);
            this.loadText();
          },
          error: () => this.rejectRoute('Unable to load the learning resource.')
        });
      },
      error: () => this.rejectRoute('Unable to load the course.')
    });
  }

  private loadText(): void {
    this.isTranslating = true;
    this.brailleApi.translateResource(this.resourceId, this.contentArea, this.dotMode)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.isTranslating = false;
      }))
      .subscribe({
      next: translation => {
        this.originalText = translation.originalText;
        this.acceptTranslation(translation);
      },
      error: () => {
        this.translationError = 'The secure Liblouis resource translation service is unavailable.';
      }
    });
  }

  private acceptTranslation(translation: BrailleTranslation): void {
    this.translation = translation;
    if (this.hardware.status.state === 'connected') {
      void this.hardware.sendCells(translation.cells);
    }
  }

  private isBrailleEligible(resource: any): boolean {
    const area = String(resource.contentArea || resource.category || resource.format || '').toUpperCase();
    const blocked = ['LOGIN', 'NAVIGATION', 'SETTINGS', 'FORM', 'ADMIN', 'NOTIFICATION'];
    if (blocked.some(value => area.includes(value))) return false;
    return true;
  }

  private resolveContentArea(resource: any): BrailleContentArea {
    const value = String(resource.contentArea || resource.format || resource.type || '').toUpperCase();
    if (value.includes('NOTE')) return 'COURSE_NOTES';
    if (value.includes('ARTICLE')) return 'EDUCATIONAL_ARTICLE';
    if (value.includes('SCHEME')) return 'GOVERNMENT_SCHEME';
    if (value.includes('TEST')) return 'TEST';
    return 'LESSON_CONTENT';
  }

  private rejectRoute(message: string): void {
    this.isLoading = false;
    this.toast.error(message);
    void this.router.navigate([`/dashboard/studentdashboard/course/${this.courseId}`]);
  }
}
