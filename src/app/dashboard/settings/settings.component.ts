import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormComponent } from '../form/form.component';
import { UserService } from '../../services/user.service';
import { AccessibilityService } from '../../services/accessibility.service';
import { AiVoiceAssistantService } from '../../services/ai-voice-assistant.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, FormComponent],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  public activeTab: string = 'account';
  public userRole: string | null = '';
  public disabilityId: string | null = '';
  
  public currentPassword = '';
  public newPassword = '';
  public confirmPassword = '';
  public passwordError = '';
  public passwordSuccess = '';

  public courseUpdates = true;
  public streakReminders = true;
  public notifSuccess = '';
  public notifError = '';

  public aiVoiceEnabled = false;
  public aiVoiceSuccess = '';
  public aiVoiceError = '';

  constructor(
    private userService: UserService,
    private accService: AccessibilityService,
    private aiVoiceService: AiVoiceAssistantService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.userService.currentUser$.subscribe(user => {
      if (user) {
        this.userRole = this.userService.getUserRole(user);
        this.disabilityId = user.disabilityId || user.adminId || '';
        this.aiVoiceEnabled = user.aiVoiceEnabled || false;
      }
    });
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }

  updatePassword() {
    this.passwordError = '';
    this.passwordSuccess = '';
    
    if (!this.disabilityId) {
      this.passwordError = 'User not logged in properly';
      return;
    }

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.passwordError = 'Please fill in all fields';
      return;
    }
    
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'New password and confirm password do not match';
      return;
    }

    const payload = {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword
    };

    this.userService.updatePassword(this.disabilityId, payload).subscribe({
      next: (res: any) => {
        this.passwordSuccess = 'Password updated successfully';
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      },
      error: (err: any) => {
        this.passwordError = err.error || 'Failed to update password';
      }
    });
  }

  saveNotificationPreferences() {
    this.notifError = '';
    this.notifSuccess = '';

    if (!this.disabilityId) {
      this.notifError = 'User not logged in properly';
      return;
    }

    const payload = {
      courseUpdates: this.courseUpdates,
      streakReminders: this.streakReminders
    };

    this.userService.updateNotificationPreferences(this.disabilityId, payload).subscribe({
      next: (res: any) => {
        this.notifSuccess = 'Preferences saved successfully';
      },
      error: (err: any) => {
        this.notifError = 'Failed to save preferences';
      }
    });
  }

  openWidget() {
    this.accService.toggleWidget$.next();
  }

  toggleAiVoice() {
    this.aiVoiceSuccess = '';
    this.aiVoiceError = '';

    const payload = {
      userId: this.disabilityId,
      enabled: this.aiVoiceEnabled
    };

    this.http.post(`${environment.apiUrl}/api/voice/preferences`, payload).subscribe({
      next: () => {
        this.aiVoiceSuccess = 'AI Voice preference updated';
        if (this.aiVoiceEnabled) {
           this.aiVoiceService.executeCommand('CMD_ACTIVATE', { speakWelcome: true });
        } else {
           this.aiVoiceService.executeCommand('CMD_DEACTIVATE');
        }
      },
      error: () => {
        this.aiVoiceError = 'Failed to update AI Voice preference';
      }
    });
  }
}
