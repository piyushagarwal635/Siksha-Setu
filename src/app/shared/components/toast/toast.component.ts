import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container-wrapper">
      <div 
        *ngFor="let toast of toasts" 
        class="custom-toast" 
        [ngClass]="'toast-' + toast.type"
      >
        <div class="toast-header-bar">
          <strong class="toast-title">
            <i class="bi" [ngClass]="getIconClass(toast.type)"></i>
            &nbsp;{{ toast.title }}
          </strong>
          <button class="toast-close-btn" (click)="remove(toast.id)">&times;</button>
        </div>
        <div class="toast-body-bar">
          {{ toast.message }}
        </div>
        <div class="toast-progress-container">
          <div class="toast-progress-bar" [style.animationDuration.ms]="toast.duration || 3000"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast-container-wrapper {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 350px;
      width: 100%;
    }
    .custom-toast {
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);
      border: 1px solid rgba(15, 23, 42, 0.08);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: toastSlideIn 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
      position: relative;
    }
    .toast-header-bar {
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(0, 0, 0, 0.03);
    }
    .toast-title {
      font-size: 0.95rem;
      font-weight: 700;
    }
    .toast-success .toast-title { color: #198754; }
    .toast-danger .toast-title { color: #dc3545; }
    .toast-warning .toast-title { color: #ffc107; }
    .toast-info .toast-title { color: #0d6efd; }

    .toast-close-btn {
      background: none;
      border: none;
      font-size: 1.25rem;
      font-weight: bold;
      color: #64748b;
      cursor: pointer;
      line-height: 1;
      padding: 0;
    }
    .toast-close-btn:hover {
      color: #0f172a;
    }
    .toast-body-bar {
      padding: 12px 14px;
      font-size: 0.9rem;
      color: #334155;
      line-height: 1.4;
    }
    .toast-progress-container {
      height: 4px;
      width: 100%;
      background: #f1f5f9;
      position: absolute;
      bottom: 0;
      left: 0;
    }
    .toast-progress-bar {
      height: 100%;
      width: 100%;
      background: #cbd5e1;
      animation-name: toastProgress;
      animation-timing-function: linear;
      animation-fill-mode: forwards;
    }
    .toast-success .toast-progress-bar { background: #198754; }
    .toast-danger .toast-progress-bar { background: #dc3545; }
    .toast-warning .toast-progress-bar { background: #ffc107; }
    .toast-info .toast-progress-bar { background: #0d6efd; }

    @keyframes toastSlideIn {
      from {
        opacity: 0;
        transform: translateX(100px) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }
    @keyframes toastProgress {
      from { width: 100%; }
      to { width: 0%; }
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: ToastMessage[] = [];
  private subscription!: Subscription;

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.subscription = this.toastService.toasts$.subscribe(toast => {
      this.toasts.push(toast);
      setTimeout(() => {
        this.remove(toast.id);
      }, toast.duration || 3000);
    });
  }

  remove(id: number) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  getIconClass(type: string): string {
    switch (type) {
      case 'success': return 'bi-check-circle-fill';
      case 'danger': return 'bi-x-circle-fill';
      case 'warning': return 'bi-exclamation-triangle-fill';
      default: return 'bi-info-circle-fill';
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
