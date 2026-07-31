import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiVoiceAssistantService } from '../../../services/ai-voice-assistant.service';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-ai-voice-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ai-voice-indicator" [class.active]="isListening$ | async" [class.disabled]="isSleeping$ | async" (click)="toggleAssistant()" [title]="(isSleeping$ | async) ? 'Turn On Voice Assistant' : 'Turn Off Voice Assistant'">
      <i class="bi" [ngClass]="(isSleeping$ | async) ? 'bi-mic-mute-fill' : ((isListening$ | async) ? 'bi-mic-fill' : 'bi-mic')"></i>
    </div>
  `,
  styles: [`
    .ai-voice-indicator {
      position: fixed;
      top: 15px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      background: rgba(33, 37, 41, 0.9);
      color: white;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
      font-size: 1.3rem;
      cursor: pointer;
    }
    
    .ai-voice-indicator.active {
      background: #0d6efd;
      box-shadow: 0 0 15px rgba(13, 110, 253, 0.8);
      animation: pulse 1.5s infinite;
    }

    .ai-voice-indicator.disabled {
      background: #dc3545;
      opacity: 0.8;
    }

    @keyframes pulse {
      0% { transform: translateX(-50%) scale(1); }
      50% { transform: translateX(-50%) scale(1.08); }
      100% { transform: translateX(-50%) scale(1); }
    }
  `]
})
export class AiVoiceIndicatorComponent implements OnInit {
  isListening$!: Observable<boolean>;
  isEnabled$!: Observable<boolean>;
  isSleeping$!: Observable<boolean>;

  constructor(private voiceAssistantService: AiVoiceAssistantService) {}

  ngOnInit() {
    this.isListening$ = this.voiceAssistantService.isListening$;
    this.isEnabled$ = this.voiceAssistantService.isEnabled$;
    this.isSleeping$ = this.voiceAssistantService.isSleeping$;
  }

  toggleAssistant() {
    this.isSleeping$.pipe(take(1)).subscribe(isSleeping => {
      if (isSleeping) {
        this.voiceAssistantService.executeCommand('CMD_ACTIVATE', { speakWelcome: true });
      } else {
        this.voiceAssistantService.executeCommand('CMD_DEACTIVATE', { silent: false });
      }
    });
  }
}
