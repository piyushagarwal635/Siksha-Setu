import { Component, OnInit, Inject, PLATFORM_ID, HostListener, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { AdminService } from '../../services/admin.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule],
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.css']
})
export class FormComponent implements OnInit {
  userForm: FormGroup;
  courses = ['BCA', 'B.Sc IT', 'MCA', 'MBA', 'B.Tech'];
  isLoading = false;
  userRole = 'STUDENT';
  userId = '';
  cookieConsent = 'rejected';

  // Profile status tracking
  originalProfileData: any = null;
  allowedFieldsToEdit: string[] = [];
  myEditRequests: any[] = [];

  // Edit Request Modal
  showEditRequestModal = false;
  fieldNameForRequest = '';
  fieldLabelForRequest = '';
  proposedValue = '';
  reasonForRequest = '';
  proofDocument = '';

  // Confirmation Modal state
  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmCallback: (() => void) | null = null;

  openConfirmModal(title: string, message: string, callback: () => void): void {
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmCallback = callback;
    this.showConfirmModal = true;
    this.focusModal();
  }

  onConfirmAccept(): void {
    if (this.confirmCallback) {
      this.confirmCallback();
    }
    this.showConfirmModal = false;
    this.confirmCallback = null;
    this.restorePreviousFocus();
  }

  onConfirmCancel(): void {
    this.showConfirmModal = false;
    this.confirmCallback = null;
    this.restorePreviousFocus();
  }

  // Multiple Security Questions List
  securityQuestionsList = [
    "What is your pet's name?",
    "What is your mother's maiden name?",
    "In what city were you born?",
    "What was your first school name?",
    "What is your mother's name?",
    "What is your father's name?",
    "What was the name of your first pet?",
    "What street did you grow up on?",
    "What is your oldest sibling's middle name?",
    "What is your favorite movie?",
    "What was your childhood nickname?",
    "What was the make of your first car?"
  ];
  securityPairs: { question: string; answer: string }[] = [];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private adminService: AdminService,
    private router: Router,
    private toastService: ToastService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private elementRef: ElementRef
  ) {
    this.userForm = this.fb.group({
      id: [{ value: '', disabled: true }],
      name: ['', [Validators.required, Validators.minLength(3)]],
      course: [''],
      phone: ['', [Validators.required, Validators.pattern('^[6-9][0-9]{9}$')]],
      email: ['', [Validators.required, Validators.email]],
      address: [''],
      profileImage: [''],
      incomeCertificate: [''],
      securityQuestion: [''],
      securityAnswer: ['']
    });
  }

  previousActiveElement: HTMLElement | null = null;

  focusModal() {
    setTimeout(() => {
      const modal = document.querySelector('.modal-container') as HTMLElement;
      if (modal) {
        const focusable = modal.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length > 0) {
          (focusable[0] as HTMLElement).focus();
        } else {
          modal.focus();
        }
      }
    }, 100);
  }

  restorePreviousFocus() {
    if (this.previousActiveElement) {
      this.previousActiveElement.focus();
      this.previousActiveElement = null;
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (this.showEditRequestModal || this.showConfirmModal) {
      if (event.key === 'Escape') {
        if (this.showEditRequestModal) {
          this.closeEditRequestModal();
        } else if (this.showConfirmModal) {
          this.onConfirmCancel();
        }
        event.preventDefault();
      }
      if (event.key === 'Tab') {
        this.trapFocus('modal-container', event);
      }
      return;
    }

    if (event.key === 'Escape') {
      this.onCancel();
      event.preventDefault();
    }

    if (event.key === 'Tab') {
      this.trapProfileFocus(event);
    }
  }

  private trapProfileFocus(event: KeyboardEvent) {
    const host = this.elementRef.nativeElement;
    const focusable = host.querySelectorAll('button, input, select, textarea, a, [tabindex]:not([tabindex="-1"])');
    const focusableFiltered = Array.from(focusable).filter(el => {
      const style = window.getComputedStyle(el as HTMLElement);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             (el as HTMLElement).offsetWidth > 0 && 
             (el as HTMLElement).offsetHeight > 0 && 
             !(el as HTMLButtonElement).disabled;
    }) as HTMLElement[];
    
    if (focusableFiltered.length === 0) return;
    
    const first = focusableFiltered[0];
    const last = focusableFiltered[focusableFiltered.length - 1];
    
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

  focusProfileTitle() {
    setTimeout(() => {
      const titleEl = this.elementRef.nativeElement.querySelector('.profile-name') as HTMLElement;
      if (titleEl) {
        titleEl.setAttribute('tabindex', '-1');
        titleEl.focus();
      }
    }, 150);
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
    if (isPlatformBrowser(this.platformId)) {
      this.cookieConsent = localStorage.getItem('cookieConsent') || 'rejected';
      const currentUser = this.userService.getCurrentUser();
      if (currentUser) {
        this.userRole = this.userService.getUserRole(currentUser);
        this.userId = this.userRole === 'ADMIN' ? (currentUser.adminId || '') : (currentUser.disabilityId || '');
        
        this.userForm.patchValue({
          id: this.userId,
          email: currentUser.email || ''
        });

        if (this.userRole === 'ADMIN') {
          // Adjust validators for Admin
          this.userForm.get('course')?.clearValidators();
          this.userForm.get('course')?.updateValueAndValidity();
          this.userForm.get('address')?.clearValidators();
          this.userForm.get('address')?.updateValueAndValidity();
          this.fetchAdminProfile();
        } else {
          // Validators for Student
          this.userForm.get('course')?.setValidators(Validators.required);
          this.userForm.get('course')?.updateValueAndValidity();
          this.userForm.get('address')?.setValidators(Validators.required);
          this.userForm.get('address')?.updateValueAndValidity();
          this.fetchStudentProfile();
        }
      } else {
        this.toastService.warning('Please login first.');
        this.router.navigate(['/login']);
      }
    }
  }

  // DATA FETCHING
  fetchStudentProfile(): void {
    this.isLoading = true;
    this.userService.getUserByDisabilityId(this.userId).subscribe(
      (user: any) => {
        this.isLoading = false;
        if (user) {
          this.originalProfileData = user;
          this.allowedFieldsToEdit = user.allowedFieldsToEdit ? user.allowedFieldsToEdit.split(',') : [];
          
          this.userForm.patchValue({
            name: user.name || '',
            course: user.course || '',
            phone: user.phone || '',
            email: user.email || '',
            address: user.address || '',
            profileImage: user.profileImage || '',
            incomeCertificate: user.incomeCertificate || ''
          });

          // Parse multiple security questions and answers
          this.securityPairs = [];
          console.log('[FORM] Student securityQuestion raw:', user.securityQuestion);
          console.log('[FORM] Student securityAnswer raw:', user.securityAnswer);
          if (user.securityQuestion) {
            try {
              const parsed = JSON.parse(user.securityQuestion);
              if (Array.isArray(parsed)) {
                this.securityPairs = parsed;
              } else if (parsed && typeof parsed === 'object') {
                Object.keys(parsed).forEach(q => {
                  this.securityPairs.push({ question: q, answer: parsed[q] });
                });
              } else {
                const dbQs = user.securityQuestion.split('||');
                const dbAs = user.securityAnswer ? user.securityAnswer.split('||') : [];
                for (let i = 0; i < Math.max(dbQs.length, 1); i++) {
                  this.securityPairs.push({
                    question: dbQs[i] || '',
                    answer: dbAs[i] || ''
                  });
                }
              }
            } catch (e) {
              // Not valid JSON - try || delimited format
              const dbQs = user.securityQuestion.split('||');
              const dbAs = user.securityAnswer ? user.securityAnswer.split('||') : [];
              for (let i = 0; i < Math.max(dbQs.length, 1); i++) {
                this.securityPairs.push({
                  question: (dbQs[i] || '').trim(),
                  answer: (dbAs[i] || '').trim()
                });
              }
            }
          }
          console.log('[FORM] Parsed securityPairs:', this.securityPairs);
          if (this.securityPairs.length === 0) {
            this.securityPairs.push({ question: '', answer: '' });
          }

          this.loadStudentEditRequests();
          this.updateFormControlsDisableState();
          this.focusProfileTitle();
        }
      },
      (error: any) => {
        console.error('Error fetching student profile:', error);
        this.isLoading = false;
        this.toastService.error('Failed to load profile details.');
      }
    );
  }

  fetchAdminProfile(): void {
    this.isLoading = true;
    this.adminService.getAdminById(this.userId).subscribe(
      (admin: any) => {
        this.isLoading = false;
        if (admin) {
          this.originalProfileData = admin;
          this.userForm.patchValue({
            name: admin.username || '',
            phone: admin.phone || '',
            email: admin.email || '',
            profileImage: admin.profileImage || ''
          });

          // Parse multiple security questions and answers
          this.securityPairs = [];
          console.log('[FORM] Admin securityQuestion raw:', admin.securityQuestion);
          console.log('[FORM] Admin securityAnswer raw:', admin.securityAnswer);
          if (admin.securityQuestion) {
            try {
              const parsed = JSON.parse(admin.securityQuestion);
              if (Array.isArray(parsed)) {
                this.securityPairs = parsed;
              } else if (parsed && typeof parsed === 'object') {
                Object.keys(parsed).forEach(q => {
                  this.securityPairs.push({ question: q, answer: parsed[q] });
                });
              } else {
                const dbQs = admin.securityQuestion.split('||');
                const dbAs = admin.securityAnswer ? admin.securityAnswer.split('||') : [];
                for (let i = 0; i < Math.max(dbQs.length, 1); i++) {
                  this.securityPairs.push({
                    question: (dbQs[i] || '').trim(),
                    answer: (dbAs[i] || '').trim()
                  });
                }
              }
            } catch (e) {
              // Not valid JSON - try || delimited format
              const dbQs = admin.securityQuestion.split('||');
              const dbAs = admin.securityAnswer ? admin.securityAnswer.split('||') : [];
              for (let i = 0; i < Math.max(dbQs.length, 1); i++) {
                this.securityPairs.push({
                  question: (dbQs[i] || '').trim(),
                  answer: (dbAs[i] || '').trim()
                });
              }
            }
          }
          console.log('[FORM] Parsed admin securityPairs:', this.securityPairs);
          if (this.securityPairs.length === 0) {
            this.securityPairs.push({ question: '', answer: '' });
          }
          this.focusProfileTitle();
        }
      },
      (error: any) => {
        console.error('Error fetching admin profile:', error);
        this.isLoading = false;
        this.toastService.error('Failed to load admin profile.');
      }
    );
  }

  loadStudentEditRequests(): void {
    this.userService.getStudentEditRequests(this.userId).subscribe(
      (data) => this.myEditRequests = data,
      (err) => console.error('Error loading edit requests:', err)
    );
  }

  // DYNAMIC FIELD LOCKS HELPERS
  isFieldLocked(fieldName: string): boolean {
    if (this.userRole === 'ADMIN') return false;
    if (fieldName !== 'incomeCertificate') return false;
    if (!this.originalProfileData) return false;

    const originalValue = this.originalProfileData[fieldName];
    const hasValue = originalValue !== null && originalValue !== undefined && String(originalValue).trim() !== '';
    
    if (!hasValue) {
      return false;
    }

    return !this.allowedFieldsToEdit.includes(fieldName);
  }

  isFieldApproved(fieldName: string): boolean {
    return this.userRole === 'STUDENT' && this.allowedFieldsToEdit.includes(fieldName);
  }

  isRequestPendingForField(fieldName: string): boolean {
    return this.myEditRequests.some(r => r.fieldName === fieldName && r.status === 'PENDING');
  }

  updateFormControlsDisableState(): void {
    const fields = ['name', 'course', 'phone', 'email', 'address', 'securityQuestion', 'securityAnswer', 'incomeCertificate'];
    fields.forEach(field => {
      const control = this.userForm.get(field);
      if (control) {
        if (this.isFieldLocked(field)) {
          control.disable();
        } else {
          control.enable();
        }
      }
    });
  }

  addSecurityPair(): void {
    this.securityPairs.push({ question: '', answer: '' });
  }

  removeSecurityPair(index: number): void {
    if (this.securityPairs.length > 1) {
      this.securityPairs.splice(index, 1);
    } else {
      this.securityPairs[0] = { question: '', answer: '' };
    }
  }

  isSecurityPairsValid(): boolean {
    return this.securityPairs.length > 0 && this.securityPairs.every(p => p.question.trim() !== '' && p.answer.trim() !== '');
  }

  // EDIT REQUEST MODAL ACTION
  openEditRequestModal(fieldName: string, label: string): void {
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.fieldNameForRequest = fieldName;
    this.fieldLabelForRequest = label;
    this.proposedValue = '';
    this.reasonForRequest = '';
    this.proofDocument = '';
    this.showEditRequestModal = true;
    this.focusModal();
  }

  closeEditRequestModal(): void {
    this.showEditRequestModal = false;
    this.restorePreviousFocus();
  }

  submitEditRequest(): void {
    if (this.fieldNameForRequest === 'incomeCertificate') {
      if (!this.proposedValue) {
        this.toastService.warning('Please upload the new Income Certificate file.');
        return;
      }
    } else {
      if (!this.proposedValue) {
        this.toastService.warning('Please enter the proposed value.');
        return;
      }
    }

    if (!this.reasonForRequest || !this.reasonForRequest.trim()) {
      this.toastService.warning('Please enter the reason for this edit request.');
      return;
    }

    const requestData = {
      userId: this.userId,
      fieldName: this.fieldNameForRequest,
      newValue: this.proposedValue,
      reason: this.reasonForRequest,
      proofDocument: this.proofDocument
    };

    this.isLoading = true;
    this.userService.submitEditRequest(requestData).subscribe(
      () => {
        this.isLoading = false;
        this.toastService.success(`Edit request for ${this.fieldLabelForRequest} submitted to Admin!`);
        this.closeEditRequestModal();
        this.loadStudentEditRequests();
      },
      (err) => {
        console.error('Error submitting edit request:', err);
        this.isLoading = false;
        this.toastService.error('Failed to submit edit request.');
      }
    );
  }

  // SAVING INDIVIDUAL FIELDS (DYNAMIC SAVE)
  saveSpecificField(fieldName: string): void {
    const control = this.userForm.get(fieldName);
    if (!control || control.invalid) {
      this.toastService.warning(`Please provide a valid value for ${fieldName}.`);
      return;
    }

    this.openConfirmModal(
      'Confirm Update',
      `Are you sure you want to update ${fieldName.toUpperCase()}?`,
      () => {
        this.executeSaveSpecificField(fieldName, control.value);
      }
    );
  }

  executeSaveSpecificField(fieldName: string, value: any): void {
    this.isLoading = true;
    const updatedData: any = {};
    if (fieldName === 'name') updatedData.name = value;
    else if (fieldName === 'course') updatedData.course = value;
    else if (fieldName === 'phone') updatedData.phone = value;
    else if (fieldName === 'email') updatedData.email = value;
    else if (fieldName === 'address') updatedData.address = value;
    else if (fieldName === 'securityQuestion') updatedData.securityQuestion = value;
    else if (fieldName === 'securityAnswer') updatedData.securityAnswer = value;
    else if (fieldName === 'profileImage') updatedData.profileImage = value;
    else if (fieldName === 'incomeCertificate') updatedData.incomeCertificate = value;

    this.userService.updateUser(this.userId, updatedData).subscribe(
      () => {
        this.isLoading = false;
        this.toastService.success(`${fieldName.toUpperCase()} updated successfully!`);
        this.fetchStudentProfile();
      },
      (err) => {
        console.error('Error updating specific field:', err);
        this.isLoading = false;
        this.toastService.error(`Failed to update ${fieldName}.`);
      }
    );
  }

  // MAIN SUBMISSION (FOR ALL UNLOCKED FIELDS / INITIAL SAVE / ADMIN SAVE)
  onSubmit(): void {
    if (this.userForm.invalid) {
      this.toastService.warning('Please complete all required fields correctly.');
      return;
    }

    if (!this.isSecurityPairsValid()) {
      this.toastService.warning('Please complete all security questions and answers.');
      return;
    }

    this.openConfirmModal(
      'Save Profile Changes',
      'Are you sure you want to save your profile changes?',
      () => {
        this.executeOnSubmit();
      }
    );
  }

  executeOnSubmit(): void {
    const rawValues = this.userForm.getRawValue();
    this.isLoading = true;

    const pairsMap: { [key: string]: string } = {};
    this.securityPairs.forEach(p => {
      if (p.question.trim() !== '' && p.answer.trim() !== '') {
        pairsMap[p.question.trim()] = p.answer.trim();
      }
    });
    const securityQuestionJoined = JSON.stringify(pairsMap);
    const securityAnswerJoined = '';

    if (this.userRole === 'ADMIN') {
      const updatedData = {
        username: rawValues.name,
        email: rawValues.email,
        phone: rawValues.phone,
        profileImage: rawValues.profileImage,
        securityQuestion: securityQuestionJoined,
        securityAnswer: securityAnswerJoined
      };

      this.adminService.updateAdmin(this.userId, updatedData).subscribe(
        (response: any) => {
          this.isLoading = false;
          this.toastService.success('Admin profile updated successfully!');
          const currentUser = this.userService.getCurrentUser();
          if (currentUser) {
            this.userService.login({
              ...currentUser,
              user: updatedData.username,
              email: updatedData.email,
              profileImage: updatedData.profileImage
            }, true);
          }
          this.fetchAdminProfile();
        },
        (error: any) => {
          console.error('Error updating admin profile:', error);
          this.toastService.error('Failed to update admin profile.');
          this.isLoading = false;
        }
      );
    } else {
      const updatedData: any = {};
      
      const fields = ['name', 'course', 'phone', 'email', 'address', 'profileImage', 'incomeCertificate'];
      let hasChanges = false;
      fields.forEach(field => {
        if (!this.isFieldLocked(field)) {
          // Compare with original data to only send changed fields
          if (rawValues[field] !== this.originalProfileData[field]) {
            updatedData[field] = rawValues[field];
            hasChanges = true;
          }
        }
      });

      if (securityQuestionJoined !== this.originalProfileData.securityQuestion) {
        updatedData.securityQuestion = securityQuestionJoined;
        updatedData.securityAnswer = securityAnswerJoined;
        hasChanges = true;
      }

      if (!hasChanges) {
        this.isLoading = false;
        this.toastService.info('No changes detected.');
        return;
      }

      this.userService.updateUser(this.userId, updatedData).subscribe(
        () => {
          this.isLoading = false;
          this.toastService.success('Profile saved successfully!');
          
          const currentUser = this.userService.getCurrentUser();
          if (currentUser) {
            this.userService.login({
              ...currentUser,
              user: rawValues.name || currentUser.user,
              email: rawValues.email || currentUser.email,
              profileImage: rawValues.profileImage || currentUser.profileImage
            }, true);
          }
          this.fetchStudentProfile();
        },
        (error: any) => {
          console.error('Error updating student profile:', error);
          const errorMsg = error.error || 'Failed to save profile. Make sure fields are not locked.';
          this.toastService.error(errorMsg);
          this.isLoading = false;
        }
      );
    }
  }

  // FILE UPLOAD HELPERS (BASE64 READERS)
  onProfileImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.readFileAsBase64(input.files[0]).then(base64 => {
        this.openConfirmModal(
          'Change Profile Picture',
          'Are you sure you want to change your profile picture?',
          () => {
            this.executeProfileImageUpload(base64);
          }
        );
      }).catch(err => {
        console.error(err);
        this.toastService.error('Failed to read profile picture.');
      });
    }
  }

  executeProfileImageUpload(base64: string): void {
    this.userForm.patchValue({ profileImage: base64 });
    
    if (this.isFieldLocked('profileImage')) {
      this.openEditRequestModal('profileImage', 'Profile Picture');
      this.userForm.patchValue({ profileImage: this.originalProfileData.profileImage });
    } else {
      this.isLoading = true;
      if (this.userRole === 'ADMIN') {
        const updatedData = {
          username: this.userForm.get('name')?.value || this.originalProfileData.username,
          profileImage: base64
        };
        this.adminService.updateAdmin(this.userId, updatedData).subscribe({
          next: () => {
            this.isLoading = false;
            this.toastService.success('Profile picture updated successfully!');
            const currentUser = this.userService.getCurrentUser();
            if (currentUser) {
              this.userService.login({
                ...currentUser,
                profileImage: base64
              }, true);
            }
            this.fetchAdminProfile();
          },
          error: (err) => {
            console.error(err);
            this.isLoading = false;
            this.toastService.error('Failed to update profile picture.');
          }
        });
      } else {
        this.userService.updateUser(this.userId, { profileImage: base64 }).subscribe({
          next: () => {
            this.isLoading = false;
            this.toastService.success('Profile picture updated successfully!');
            const currentUser = this.userService.getCurrentUser();
            if (currentUser) {
              this.userService.login({
                ...currentUser,
                profileImage: base64
              }, true);
            }
            this.fetchStudentProfile();
          },
          error: (err) => {
            console.error(err);
            this.isLoading = false;
            this.toastService.error('Failed to update profile picture.');
          }
        });
      }
    }
  }

  onIncomeCertificateSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.readFileAsBase64(input.files[0]).then(base64 => {
        const hasExisting = this.originalProfileData?.incomeCertificate;
        const confirmMsg = hasExisting 
          ? 'Are you sure you want to request a change to your income certificate? This will submit an edit request to the Admin.' 
          : 'Are you sure you want to upload this income certificate? Once uploaded, it will be locked and require Admin approval to change.';
        
        this.openConfirmModal(
          'Upload Income Certificate',
          confirmMsg,
          () => {
            this.executeIncomeCertificateUpload(base64);
          }
        );
      }).catch(err => {
        console.error(err);
        this.toastService.error('Failed to read certificate.');
      });
    }
  }

  executeIncomeCertificateUpload(base64: string): void {
    this.userForm.patchValue({ incomeCertificate: base64 });

    if (this.isFieldLocked('incomeCertificate')) {
      this.fieldNameForRequest = 'incomeCertificate';
      this.fieldLabelForRequest = 'Income Certificate';
      this.proposedValue = base64;
      this.proofDocument = base64;
      this.reasonForRequest = '';
      this.showEditRequestModal = true;
      this.userForm.patchValue({ incomeCertificate: this.originalProfileData.incomeCertificate });
    } else {
      this.isLoading = true;
      this.userService.updateUser(this.userId, { incomeCertificate: base64 }).subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.success('Income certificate uploaded and locked!');
          this.fetchStudentProfile();
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false;
          this.toastService.error('Failed to upload income certificate.');
        }
      });
    }
  }

  onModalProofSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.readFileAsBase64(input.files[0]).then(base64 => {
        this.proofDocument = base64;
        if (this.fieldNameForRequest === 'incomeCertificate') {
          this.proposedValue = base64;
        }
      }).catch(err => {
        console.error(err);
        this.toastService.error('Failed to read proof document.');
      });
    }
  }

  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  openImageInNewTab(base64Data: string): void {
    if (isPlatformBrowser(this.platformId)) {
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(`<iframe src="${base64Data}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      }
    }
  }

  onCancel(): void {
    if (this.userRole === 'ADMIN') {
      this.router.navigate(['/dashboard/admindashboard']);
    } else {
      this.router.navigate(['/dashboard/studentdashboard']);
    }
  }

  onCookieConsentChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const isChecked = input.checked;
    const newConsent = isChecked ? 'accepted' : 'rejected';
    this.cookieConsent = newConsent;
    
    this.isLoading = true;
    this.userService.updateCookieConsent(newConsent).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastService.success(isChecked ? 'Secure cookies enabled!' : 'Secure cookies disabled!');
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('Error updating cookie consent:', err);
        this.toastService.error('Failed to update cookie settings on the server.');
        // Revert change
        this.cookieConsent = isChecked ? 'rejected' : 'accepted';
      }
    });
  }
}
