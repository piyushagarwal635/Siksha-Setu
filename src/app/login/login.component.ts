import { Component, OnInit, Inject, PLATFORM_ID, Input, Output, EventEmitter, AfterViewInit, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, FormGroup, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { UserService } from '../services/user.service';
import { AdminService } from '../services/admin.service';
import { ToastService } from '../services/toast.service';
import { AiVoiceAssistantService } from '../services/ai-voice-assistant.service';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  imports: [FormsModule, CommonModule, ReactiveFormsModule, RouterModule],
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, AfterViewInit {

  signInForm: FormGroup;
  forgotForm: FormGroup;
  isLoading = false;
  menuOpen = false;
  isForgotPasswordActive = false;
  private isBrowser: boolean;

  // Step-by-step Recovery properties
  recoveryStep = 1;
  recoveryUserId = '';
  recoveryQuestion = '';
  recoveryAnswer = '';
  recoveryNewPassword = '';
  recoveryConfirmPassword = '';
  recoveryQuestions: string[] = [];

  showSignInError = false;
  signInErrorMessage = '';

  @Input() isModal = false;
  @Output() loginSuccess = new EventEmitter<string>();

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private adminService: AdminService,
    private rl: Router,
    private toastService: ToastService,
    private aiVoiceService: AiVoiceAssistantService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.signInForm = this.fb.group({
      disabilityId: ['', Validators.required],
      pass: ['', Validators.required],
      rememberMe: [false]
    });

    this.forgotForm = this.fb.group({
      id: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[6-9][0-9]{9}$')]],
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/[!@#$%^&*(),.?":{}|<>]/)
        ]
      ],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: FormGroup) {
    const newPass = g.get('newPassword')?.value;
    const confirmPass = g.get('confirmPassword')?.value;
    return newPass === confirmPass ? null : { mismatch: true };
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      setTimeout(() => {
        this.initGsapAnimations();
      }, 100);
    }
  }

  initGsapAnimations(): void {
    // Login Card Entrance
    gsap.from('.login-card', {
      y: 50,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out'
    });

    // Brand Header
    gsap.from('.brand-header img', { scale: 0.5, opacity: 0, duration: 0.6, delay: 0.2, ease: 'back.out(1.5)' });
    gsap.from('.brand-header h1', { y: 20, opacity: 0, duration: 0.5, delay: 0.4, ease: 'power2.out' });
    gsap.from('.brand-header p', { y: 20, opacity: 0, duration: 0.5, delay: 0.5, ease: 'power2.out' });

    // Inputs & Actions Stagger
    gsap.from('.input-group-custom, .remember-row, .form-actions-row, .bottom-link', {
      y: 20,
      opacity: 0,
      duration: 0.5,
      stagger: 0.1,
      delay: 0.6,
      ease: 'power2.out'
    });
  }

  onPasswordFocus(): void {
    // Disabled to allow blind users to dictate their passwords via voice
  }

  onPasswordBlur(): void {
    // Disabled
  }

  onreset(): void {
    this.signInForm.reset();
    this.forgotForm.reset();
    this.showSignInError = false;
  }

  onSignIn(): void {
    this.showSignInError = false;
    this.signInErrorMessage = '';

    if (this.signInForm.invalid) {
      this.signInErrorMessage = 'Please fill all fields before signing in.';
      this.showSignInError = true;
      return;
    }

    const userData = this.signInForm.value;
    const rememberMe = this.signInForm.get('rememberMe')?.value || false;
    this.isLoading = true;
    this.signInForm.disable();

    this.userService
      .loginUser(userData)
      .subscribe(
        (response: any) => {
          this.isLoading = false;
          this.signInForm.enable();

          this.userService.login({
            user: response.username,
            disabilityId: response.disabilityId,
            adminId: response.adminId,
            role: response.role,
            token: response.token,
            aiVoiceEnabled: response.aiVoiceEnabled
          }, rememberMe);

          this.toastService.success('Login successful.');

          if (this.isModal) {
            this.loginSuccess.emit(response.role);
          } else {
            if (response.role === 'ADMIN') {
              this.rl.navigate(['/dashboard/admindashboard']);
            } else {
              this.rl.navigate(['/dashboard/studentdashboard']);
            }
          }
        },
        (error: any) => {
          this.isLoading = false;
          this.signInForm.enable();
          if (error.status === 401) {
            this.signInErrorMessage = 'Wrong password.';
          } else if (error.status === 404) {
             this.signInErrorMessage = 'User not found.';
          } else {
            this.signInErrorMessage = 'Server error.';
          }
          this.showSignInError = true;
        }
      );
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  toggleForgotPassword(active: boolean): void {
    this.isForgotPasswordActive = active;
    this.showSignInError = false;
    this.goToRecoveryStep1();
  }

  goToRecoveryStep1(): void {
    this.recoveryStep = 1;
    this.recoveryUserId = '';
    this.recoveryQuestion = '';
    this.recoveryAnswer = '';
    this.recoveryNewPassword = '';
    this.recoveryConfirmPassword = '';
  }

  fetchSecurityQuestion(): void {
    if (!this.recoveryUserId) {
      this.toastService.warning('Please enter your Disability ID, Admin ID, or Username.');
      return;
    }

    this.isLoading = true;
    this.userService.getForgotPasswordQuestion(this.recoveryUserId).subscribe(
      (res: any) => {
        this.isLoading = false;
        if (res.noQuestionSet) {
          this.toastService.error('No security question configured for this account. Please contact an Administrator directly.');
        } else {
          this.recoveryQuestions = res.questions || [];
          if (this.recoveryQuestions.length > 0) {
            this.recoveryQuestion = this.recoveryQuestions[0];
          } else {
            this.recoveryQuestion = '';
          }
          this.recoveryStep = 2;
          this.toastService.success('Account verified. Please choose your security question.');
        }
      },
      (err: any) => {
        console.error(err);
        this.isLoading = false;
        const errMsg = err.error || 'Account not found. Please verify your ID.';
        this.toastService.error(errMsg);
      }
    );
  }

  resetWithQuestion(): void {
    if (!this.recoveryQuestion || !this.recoveryAnswer || !this.recoveryNewPassword || !this.recoveryConfirmPassword) {
      this.toastService.warning('Please fill all fields.');
      return;
    }

    if (this.recoveryNewPassword !== this.recoveryConfirmPassword) {
      this.toastService.warning('Passwords do not match.');
      return;
    }

    if (this.recoveryNewPassword.length < 8) {
      this.toastService.warning('Password must be at least 8 characters long.');
      return;
    }

    this.isLoading = true;
    const resetData = {
      userId: this.recoveryUserId,
      securityQuestion: this.recoveryQuestion,
      securityAnswer: this.recoveryAnswer,
      newPassword: this.recoveryNewPassword
    };

    this.userService.resetPasswordWithSecurityQuestion(resetData).subscribe(
      (res: any) => {
        this.isLoading = false;
        this.toastService.success('Password reset successfully! Please sign in.');
        this.toggleForgotPassword(false);
      },
      (err: any) => {
        console.error(err);
        this.isLoading = false;
        this.toastService.error('Failed to reset password. Incorrect security question or answer.');
      }
    );
  }
}