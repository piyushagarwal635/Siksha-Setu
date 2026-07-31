import { Component, AfterViewInit, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { UserService } from '../services/user.service';
import { ToastService } from '../services/toast.service';
import { AiVoiceAssistantService } from '../services/ai-voice-assistant.service';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-signup',
  standalone: true,
  templateUrl: './signup.component.html',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  styleUrls: ['./signup.component.css']
})
export class SignupComponent implements AfterViewInit {
  userForm: FormGroup;
  isLoading = false;
  showSignUpError = false;
  signUpErrorMessage = '';
  private isBrowser: boolean;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    private toastService: ToastService,
    private aiVoiceService: AiVoiceAssistantService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.userForm = this.fb.group({
      user: ['', [Validators.required, Validators.minLength(5)]],
      pass: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/[!@#$%^&*(),.?":{}|<>]/)
        ]
      ],
      disabilityId: [
        '',
        [
          Validators.required,
          Validators.pattern(/^DIS\d{9}$/)
        ]
      ],
      securityQuestion: ['', Validators.required],
      securityAnswer: ['', Validators.required],
      rememberMe: [false]
    });
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      setTimeout(() => {
        this.initGsapAnimations();
      }, 50);
    }
  }

  initGsapAnimations(): void {
    // Signup Card Entrance
    gsap.from('.signup-card', {
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

  onSubmit(): void {
    this.showSignUpError = false;
    this.signUpErrorMessage = '';

    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.signUpErrorMessage = 'Please fill all fields correctly before creating an account.';
      this.showSignUpError = true;
      return;
    }

    this.isLoading = true;
    this.userForm.disable();
    const rawVal = this.userForm.value;

    // Serialize single question/answer pair to JSON Map for database uniformity
    const regPairs = { [rawVal.securityQuestion]: rawVal.securityAnswer };
    const userData = {
      ...rawVal,
      securityQuestion: JSON.stringify(regPairs),
      securityAnswer: ''
    };

    this.userService.checkUserExists(userData.disabilityId).subscribe(
      (exists: any) => {
        if (exists) {
          this.toastService.warning('Account already exists. Please sign in instead.');
          this.signUpErrorMessage = 'An account with this Disability ID already exists.';
          this.showSignUpError = true;
          this.isLoading = false;
          this.userForm.enable();
        } else {
          this.userService.createUser(userData).subscribe(
            (response: any) => {
              console.log('User created:', response);
              
              // Auto-login functionality
              const loginCredentials = {
                disabilityId: userData.disabilityId,
                pass: rawVal.pass
              };
              
              this.userService.loginUser(loginCredentials).subscribe(
                (loginRes: any) => {
                  this.isLoading = false;
                  this.userForm.enable();
                  
                  this.userService.login({
                    user: loginRes.username,
                    disabilityId: loginRes.disabilityId,
                    adminId: loginRes.adminId,
                    role: loginRes.role,
                    token: loginRes.token,
                    aiVoiceEnabled: loginRes.aiVoiceEnabled
                  }, rawVal.rememberMe || false);

                  this.toastService.success('Account created & logged in successfully!');
                  
                  if (loginRes.role === 'ADMIN') {
                    this.router.navigate(['/dashboard/admindashboard']);
                  } else {
                    this.router.navigate(['/dashboard/studentdashboard']);
                  }
                },
                (loginErr: any) => {
                   // Fallback to manual login if auto-login fails for some reason
                   this.isLoading = false;
                   this.userForm.enable();
                   this.toastService.success('Account created successfully! Please sign in.');
                   this.router.navigate(['/login']);
                }
              );
            },
            (error: any) => {
              console.error('Error creating user:', error);
              this.signUpErrorMessage = 'Error creating account. Please try again.';
              this.showSignUpError = true;
              this.isLoading = false;
              this.userForm.enable();
            }
          );
        }
      },
      (error: any) => {
        console.error('Error checking user:', error);
        this.signUpErrorMessage = 'Error checking user. Please try again.';
        this.showSignUpError = true;
        this.isLoading = false;
        this.userForm.enable();
      }
    );
  }

  onReset(): void {
    this.userForm.reset();
    this.showSignUpError = false;
    this.signUpErrorMessage = '';
  }
}
