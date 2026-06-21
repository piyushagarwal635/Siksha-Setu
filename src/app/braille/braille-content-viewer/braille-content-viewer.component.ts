import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject, HostListener } from '@angular/core';
import { finalize } from 'rxjs';
import { BrailleApiService } from '../../services/braille-api.service';
import { BrailleHardwareService } from '../../services/braille-hardware.service';
import { Braille3dDisplayComponent } from '../braille-3d-display/braille-3d-display.component';
import {
  BrailleContentArea,
  BrailleDotMode,
  BrailleTranslation
} from '../braille.models';

@Component({
  selector: 'app-braille-content-viewer',
  standalone: true,
  imports: [CommonModule, Braille3dDisplayComponent],
  template: `
    <div class="backdrop" (click)="closed.emit()" aria-hidden="true"></div>
    <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="inline-braille-title">
      <header>
        <div>
          <p>{{ contentAreaLabel }}</p>
          <h2 id="inline-braille-title">{{ title }}</h2>
          <span class="text-muted small" *ngIf="hardware.status$ | async as status">
            {{ status.state === 'connected' ? 'Physical Braille connected (' + status.deviceName + ')' : 'Virtual Braille output' }}
          </span>
        </div>
        <div class="actions">
          <button type="button" class="btn-hardware" (click)="connectUsb()" title="Connect via USB">
            <i class="bi bi-usb-symbol"></i> USB
          </button>
          <button type="button" class="btn-hardware" (click)="connectBluetooth()" title="Connect via Bluetooth">
            <i class="bi bi-bluetooth"></i> BT
          </button>
          <div class="divider"></div>
          <button type="button" [class.active]="dotMode === 6" (click)="setMode(6)">6-dot</button>
          <button type="button" [class.active]="dotMode === 8" (click)="setMode(8)">8-dot</button>
          <button type="button" class="close" (click)="closed.emit()" aria-label="Close Braille viewer">&times;</button>
        </div>
      </header>

      <div *ngIf="error" class="error" role="alert">{{ error }}</div>
      <div class="grid" [attr.aria-busy]="loading">
        <article>
          <h3>Original text</h3>
          <div class="text" tabindex="0">{{ text }}</div>
        </article>
        <article>
          <h3>Liblouis translation</h3>
          <div class="braille" tabindex="0">{{ translation?.braille || 'Translating…' }}</div>
        </article>
        <article>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
            <h3 style="margin: 0;">3D pin output</h3>
            <div class="actions" style="transform: scale(0.85); transform-origin: right center;">
              <button type="button" [class.active]="maxCells === 20" (click)="setMaxCells(20)">20 Cells</button>
              <button type="button" [class.active]="maxCells === 40" (click)="setMaxCells(40)">40 Cells</button>
              <div class="divider"></div>
              <button type="button" (click)="panningPrev()" [disabled]="pageStart === 0"><i class="bi bi-chevron-left"></i> Prev</button>
              <button type="button" (click)="panningNext()" [disabled]="pageStart + maxCells >= (translation?.cells?.length || 0)">Next <i class="bi bi-chevron-right"></i></button>
            </div>
          </div>
          <app-braille-3d-display [cells]="currentCells" [dotMode]="dotMode" [maxCells]="maxCells">
          </app-braille-3d-display>
        </article>
      </div>
    </section>
  `,
  styles: [`
    .backdrop { position: fixed; inset: 0; z-index: 1090; background: rgba(2,6,23,.64); backdrop-filter: blur(5px); }
    .dialog { position: fixed; inset: 4vh 3vw; z-index: 1091; overflow: auto; padding: 1rem; border-radius: 1.25rem; background: #f4f7fb; box-shadow: 0 30px 90px rgba(2,6,23,.4); color: #14213a; }
    header, .actions { display: flex; align-items: center; }
    header { justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
    header p { margin: 0; color: #64748b; font-size: .72rem; font-weight: 900; letter-spacing: .09em; text-transform: uppercase; }
    h2 { margin: .15rem 0 0; font-weight: 900; }
    .actions { gap: .4rem; }
    button { border: 1px solid #cbd5e1; border-radius: 999px; padding: .45rem .7rem; background: white; font-weight: 800; }
    button.active { border-color: #2563eb; background: #dbeafe; color: #1d4ed8; }
    button.close { width: 2.35rem; height: 2.35rem; padding: 0; font-size: 1.45rem; }
    button.btn-hardware { border-color: #94a3b8; background: #f8fafc; color: #334155; }
    button.btn-hardware:hover { background: #e2e8f0; }
    .divider { width: 1px; height: 1.5rem; background: #cbd5e1; margin: 0 0.5rem; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
    article { min-width: 0; padding: .9rem; border: 1px solid #dbe3ef; border-radius: 1rem; background: white; }
    article:last-child { grid-column: 1 / -1; }
    h3 { margin: 0 0 .65rem; font-size: .9rem; font-weight: 900; }
    .text, .braille { min-height: 320px; max-height: 58vh; overflow: auto; padding: .9rem; border-radius: .8rem; white-space: pre-wrap; }
    .text { background: #f8fafc; line-height: 1.65; }
    .braille { background: #101827; color: #f8fafc; font-size: 1.5rem; line-height: 1.8; letter-spacing: .12em; }
    .error { margin-bottom: .8rem; padding: .75rem; border-radius: .7rem; background: #fff1f2; color: #991b1b; }
    button:focus-visible, [tabindex="0"]:focus-visible { outline: 3px solid #f59e0b; outline-offset: 3px; }
    @media (max-width: 1050px) { .grid { grid-template-columns: 1fr 1fr; } article:last-child { grid-column: 1/-1; } }
    @media (max-width: 700px) { .dialog { inset: 1rem; } header { align-items: flex-start; flex-direction: column; } .grid { grid-template-columns: 1fr; } article:last-child { grid-column: auto; } }
  `]
})
export class BrailleContentViewerComponent implements OnChanges, OnInit {
  @Input({ required: true }) title = 'Braille Mode';
  @Input() text?: string; // Optional if using resourceId
  @Input() resourceId?: number; // Optional if using text
  @Input({ required: true }) contentArea: BrailleContentArea = 'LESSON_CONTENT';
  @Output() closed = new EventEmitter<void>();

  dotMode: BrailleDotMode = 6;
  translation?: BrailleTranslation;
  loading = false;
  error = '';
  maxCells = 20;
  pageStart = 0;
  currentCells: any[] = [];

  public readonly hardware = inject(BrailleHardwareService);

  constructor(private readonly api: BrailleApiService) {}

  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.closed.emit();
      event.preventDefault();
    }

    if (event.key === 'Tab') {
      this.trapFocus('dialog', event);
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

  ngOnInit(): void {
    void this.hardware.detectAuthorizedHardware();
    if (this.resourceId) {
      this.translateResource();
    } else if (this.text) {
      this.translateText();
    }
    setTimeout(() => {
      const dialog = document.querySelector('.dialog') as HTMLElement;
      if (dialog) {
        const focusable = dialog.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length > 0) {
          (focusable[0] as HTMLElement).focus();
        } else {
          dialog.focus();
        }
      }
    }, 100);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['text'] && this.text) {
      this.translateText();
    }
    if (changes['resourceId'] && this.resourceId) {
      this.translateResource();
    }
    if (changes['contentArea'] && !changes['text'] && !changes['resourceId']) {
      this.resourceId ? this.translateResource() : this.translateText();
    }
  }

  get contentAreaLabel(): string {
    return this.contentArea.replaceAll('_', ' ');
  }

  setMode(mode: BrailleDotMode): void {
    this.dotMode = mode;
    this.pageStart = 0;
    this.resourceId ? this.translateResource() : this.translateText();
  }

  setMaxCells(size: number): void {
    this.maxCells = size;
    this.pageStart = 0;
    this.updateCurrentCells();
  }

  panningPrev(): void {
    this.pageStart = Math.max(0, this.pageStart - this.maxCells);
    this.updateCurrentCells();
  }

  panningNext(): void {
    const total = this.translation?.cells?.length || 0;
    if (this.pageStart + this.maxCells < total) {
      this.pageStart += this.maxCells;
      this.updateCurrentCells();
    }
  }

  private updateCurrentCells(): void {
    this.currentCells = (this.translation?.cells || []).slice(this.pageStart, this.pageStart + this.maxCells);
  }

  async connectUsb(): Promise<void> {
    if (await this.hardware.connectUsb() && this.translation) {
      await this.hardware.sendCells(this.translation.cells);
    }
  }

  async connectBluetooth(): Promise<void> {
    if (await this.hardware.connectBluetooth() && this.translation) {
      await this.hardware.sendCells(this.translation.cells);
    }
  }

  private translateText(): void {
    if (!this.text || !this.text.trim()) return;
    this.loading = true;
    this.error = '';
    this.api.translate({
      text: this.text,
      contentArea: this.contentArea,
      dotMode: this.dotMode
    }).pipe(finalize(() => this.loading = false)).subscribe({
      next: translation => this.acceptTranslation(translation),
      error: () => this.handleTranslationError()
    });
  }

  private translateResource(): void {
    if (!this.resourceId) return;
    this.loading = true;
    this.error = '';
    this.api.translateResource(this.resourceId, this.contentArea, this.dotMode)
      .pipe(finalize(() => this.loading = false)).subscribe({
      next: translation => {
        this.text = translation.originalText;
        this.acceptTranslation(translation);
      },
      error: () => this.handleTranslationError()
    });
  }

  private acceptTranslation(translation: BrailleTranslation): void {
    this.translation = translation;
    this.updateCurrentCells();
    if (this.hardware.status.state === 'connected') {
      void this.hardware.sendCells(translation.cells);
    }
  }

  private handleTranslationError(): void {
    this.translation = undefined;
    this.updateCurrentCells();
    this.error = 'Liblouis translation is currently unavailable or the resource could not be read.';
  }
}
