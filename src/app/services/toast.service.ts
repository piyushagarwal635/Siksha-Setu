import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private snackBar = inject(MatSnackBar);

  show(message: string, type: 'success' | 'danger' | 'warning' | 'info' = 'info', title: string = '', duration: number = 4000) {
    const fullMessage = title ? `${title}: ${message}` : message;
    
    // Convert old type to matching CSS classes
    let panelClass = ['custom-snackbar'];
    if (type === 'success') panelClass.push('snackbar-success');
    else if (type === 'danger') panelClass.push('snackbar-danger');
    else if (type === 'warning') panelClass.push('snackbar-warning');
    else panelClass.push('snackbar-info');

    this.snackBar.open(fullMessage, 'Close', {
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
      panelClass
    });
  }

  success(message: string, title?: string, duration?: number) {
    this.show(message, 'success', title, duration);
  }

  error(message: string, title?: string, duration?: number) {
    this.show(message, 'danger', title, duration);
  }

  warning(message: string, title?: string, duration?: number) {
    this.show(message, 'warning', title, duration);
  }

  info(message: string, title?: string, duration?: number) {
    this.show(message, 'info', title, duration);
  }
}
