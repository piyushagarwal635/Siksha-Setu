import { Component, OnInit, Inject, PLATFORM_ID, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule, FormGroup, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService } from '../services/user.service';
import { AdminService } from '../services/admin.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  imports: [FormsModule, CommonModule, ReactiveFormsModule],
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  userForm: FormGroup;
  signInForm: FormGroup;
  forgotForm: FormGroup;
  isLoading = false;
  menuOpen = false;
  isForgotPasswordActive = false;

  // Step-by-step Recovery properties
  recoveryStep = 1; // 1 = Enter ID, 2 = Answer Question, 3 = Admin Assistance
  recoveryUserId = '';
  recoveryQuestion = '';
  recoveryAnswer = '';
  recoveryNewPassword = '';
  recoveryConfirmPassword = '';
  recoveryQuestions: string[] = [];

  showSignInError = false;
  signInErrorMessage = '';

  showSignUpError = false;
  signUpErrorMessage = '';

  @Input() isModal = false;
  @Output() loginSuccess = new EventEmitter<string>();

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private adminService: AdminService,
    private rl: Router,
    private toastService: ToastService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
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
      securityAnswer: ['', Validators.required]
    });

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

  onSubmit(): void {
    this.showSignUpError = false;
    this.signUpErrorMessage = '';

    if (this.userForm.invalid) {
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

    this.userService
      .checkUserExists(userData.disabilityId)
      .subscribe(
        (exists: any) => {
          if (exists) {
            this.toastService.warning('Account already exists. Please sign in instead.');
            this.signUpErrorMessage = 'Account already exists. Please sign in instead.';
            this.showSignUpError = true;
            this.isLoading = false;
            this.userForm.enable();
          } else {
            this.userService
              .createUser(userData)
              .subscribe(
                (response: any) => {
                  console.log('User created:', response);
                  this.isLoading = false;
                  this.userForm.enable();
                  this.toastService.success('Account created successfully. Please sign in.');
                  this.togglePanel(false);
                  this.userForm.reset();
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
            token: response.token
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

  onreset(): void {
    this.userForm.reset();
    this.signInForm.reset();
    this.forgotForm.reset();
    this.showSignInError = false;
    this.showSignUpError = false;
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  isRightPanelActive = false;

  togglePanel(isRightPanelActive: boolean): void {
    this.isRightPanelActive = isRightPanelActive;
    this.isForgotPasswordActive = false;
    this.showSignInError = false;
    this.showSignUpError = false;
  }

  toggleForgotPassword(active: boolean): void {
    this.isForgotPasswordActive = active;
    this.showSignInError = false;
    this.showSignUpError = false;
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