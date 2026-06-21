import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged, finalize, switchMap, of, catchError } from 'rxjs';
import { Braille3dDisplayComponent } from '../../braille/braille-3d-display/braille-3d-display.component';
import {
  BrailleDotMode,
  BrailleHardwareStatus,
  BrailleTranslation
} from '../../braille/braille.models';
import { BrailleApiService } from '../../services/braille-api.service';
import { BrailleHardwareService } from '../../services/braille-hardware.service';

@Component({
  selector: 'app-braille-testing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Braille3dDisplayComponent],
  templateUrl: './braille-testing.component.html',
  styleUrl: './braille-testing.component.css'
})
export class BrailleTestingComponent implements OnInit, OnDestroy {
  readonly examples = ['Hello', 'Angular', 'Siksha Setu', 'Government Schemes', 'Course Notes'];
  text = 'Siksha Setu';
  dotMode: BrailleDotMode = 6;
  translation?: BrailleTranslation;
  error = '';
  isTranslating = false;
  hardwareStatus: BrailleHardwareStatus = {
    state: 'checking',
    transport: 'virtual',
    deviceName: null,
    profileId: null,
    message: 'Checking hardware...'
  };

  private readonly input = new Subject<string>();
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly api: BrailleApiService,
    readonly hardware: BrailleHardwareService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(this.hardware.status$.subscribe(status => this.hardwareStatus = status));
    this.subscriptions.add(
      this.input.pipe(
        debounceTime(150),
        distinctUntilChanged(),
        switchMap(text => {
          this.error = '';
          this.isTranslating = true;
          return this.api.translate({
            text,
            contentArea: 'LESSON_CONTENT',
            dotMode: this.dotMode
          }).pipe(
            catchError(err => {
              this.translation = undefined;
              this.error = 'The Liblouis translation service is not available.';
              return of(null);
            }),
            finalize(() => this.isTranslating = false)
          );
        })
      ).subscribe({
        next: result => {
          if (result) {
            this.translation = result;
            if (this.hardware.status.state === 'connected') {
              void this.hardware.sendCells(result.cells);
            }
          }
        }
      })
    );
    void this.hardware.detectAuthorizedHardware();
    this.input.next(this.text);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  translate(): void {
    this.input.next(this.text);
  }

  useExample(example: string): void {
    this.text = example;
    this.input.next(example);
  }

  setDotMode(mode: BrailleDotMode): void {
    this.dotMode = mode;
    this.input.next(`${this.text}\u200b`);
    queueMicrotask(() => {
      this.text = this.text.replace('\u200b', '');
      this.input.next(this.text);
    });
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
}
