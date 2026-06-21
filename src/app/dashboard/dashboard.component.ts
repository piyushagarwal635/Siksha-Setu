import { Component, HostListener, Inject, PLATFORM_ID, OnInit, ElementRef } from '@angular/core';
import { RouterLink, RouterModule, RouterOutlet } from '@angular/router';
import { MatExpansionModule } from '@angular/material/expansion';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { UserService } from '../services/user.service';
import { AdminService } from '../services/admin.service';
import { LoginComponent } from '../login/login.component';
import { ToastService } from '../services/toast.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { SearchTelemetryService } from '../services/search-telemetry.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatExpansionModule, CommonModule, RouterModule, FormsModule, LoginComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  showChatbot: boolean = false;
  showWarning: boolean = false;
  allCourses: any[] = [];

  previousActiveElement: HTMLElement | null = null;

  focusModal() {
    setTimeout(() => {
      const modal = document.querySelector('.login-modal, .modal-container, .dropdown-menu.show, .chatbot-popup');
      if (modal) {
        const focusable = modal.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])') as NodeListOf<HTMLElement>;
        if (focusable.length > 0) {
          focusable[0].focus();
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

  toggleChatbot() {
    if (!this.showChatbot) {
      this.previousActiveElement = document.activeElement as HTMLElement;
    }
    this.showChatbot = !this.showChatbot;
    if (this.showChatbot) {
      this.focusModal();
    } else {
      this.restorePreviousFocus();
    }
  }

  skipToContent(event: MouseEvent) {
    event.preventDefault();
    const el = document.getElementById('main-content');
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        const firstFocusable = el.querySelector('h1, h2, h3, h4, h5, h6, button, a, input, [tabindex="0"]');
        if (firstFocusable) {
          (firstFocusable as HTMLElement).setAttribute('tabindex', '-1');
          (firstFocusable as HTMLElement).focus();
        }
      }, 100);
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (this.showLoginModal) {
        this.closeLoginModal();
        event.preventDefault();
      }
      if (this.showConfirmModal) {
        this.onConfirmCancel();
        event.preventDefault();
      }
      if (this.menuOpen) {
        this.menuOpen = false;
        this.restorePreviousFocus();
        event.preventDefault();
      }
      if (this.showChatbot) {
        this.showChatbot = false;
        this.restorePreviousFocus();
        event.preventDefault();
      }
    }

    if (event.key === 'Tab') {
      if (this.showLoginModal) {
        this.trapFocus('login-modal', event);
      } else if (this.showConfirmModal) {
        this.trapFocus('confirm-modal', event);
      }
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

  menuOpen = false;
  sidebarOpen = false;
  topMenuOpen = false;
  showLoginModal = false;
  
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

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleTopMenu() {
    this.topMenuOpen = !this.topMenuOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (isPlatformBrowser(this.platformId)) {
      const clickedInside = this.elementRef.nativeElement.querySelector('.search')?.contains(event.target);
      if (!clickedInside) {
        this.showSearchDropdown = false;
      }
    }
  }
  userName = '';
  disabilityId = '';
  defaultAvatar = 'avtar.jpeg';
  profileImage: string | null = null;
  userRole = 'student';
  isLoggedIn = false;
  
  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          setTimeout(() => {
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
              const heading = mainContent.querySelector('h1, h2, h3, h4, h5, h6') as HTMLElement;
              if (heading) {
                heading.setAttribute('tabindex', '-1');
                heading.focus();
              } else {
                mainContent.setAttribute('tabindex', '-1');
                mainContent.focus();
              }
            }
          }, 150);
        }
      });

      this.userService.currentUser$.subscribe(user => {
        if (user) {
          this.isLoggedIn = true;
          this.disabilityId = user.disabilityId || user.adminId || '';
          this.userName = user.user || '';
          this.profileImage = user.profileImage || null;
          this.userRole = this.userService.getUserRole(user);
          
          if (this.userRole === 'STUDENT' && this.disabilityId) {
            this.updateAndLoadStreak(this.disabilityId);
          }
        } else {
          this.isLoggedIn = false;
          this.disabilityId = '';
          this.userName = '';
          this.profileImage = null;
          this.userRole = 'student';
          this.currentStreak = 0;
        }
      });

      // Load fresh profile details from the database once on startup to update outer logo/avatar
      const currentUser = this.userService.getCurrentUser();
      if (currentUser) {
        const id = currentUser.disabilityId || currentUser.adminId || '';
        const role = this.userService.getUserRole(currentUser);
        if (role === 'ADMIN') {
          this.adminService.getAdminById(id).subscribe({
            next: (adminData) => {
              if (adminData) {
                const updatedUser = {
                  ...currentUser,
                  profileImage: adminData.profileImage || null,
                  user: adminData.username || currentUser.user
                };
                const isRemembered = localStorage.getItem('authUser') !== null;
                this.userService.login(updatedUser, isRemembered);
              }
            },
            error: (err) => console.error('Error fetching admin details on load:', err)
          });
        } else {
          this.userService.getUserByDisabilityId(id).subscribe({
            next: (userData) => {
              if (userData) {
                const updatedUser = {
                  ...currentUser,
                  profileImage: userData.profileImage || null,
                  user: userData.name || currentUser.user
                };
                const isRemembered = localStorage.getItem('authUser') !== null;
                this.userService.login(updatedUser, isRemembered);
              }
            },
            error: (err) => console.error('Error fetching student details on load:', err)
          });
          this.updateAndLoadStreak(id);
        }
      }
      // Fetch courses for search
      this.userService.getAllCourses().subscribe({
        next: (courses) => {
          this.allCourses = courses;
        },
        error: (err) => console.error('Error fetching courses for search:', err)
      });

      // Setup Search Debounce
      this.searchSubject.pipe(
        debounceTime(2000), // 2 seconds debounceTime
        distinctUntilChanged()
      ).subscribe(searchTerm => {
        this.executeSearch(searchTerm);
      });
    }
  }

  // Search Implementation
  searchQuery: string = '';
  showSearchDropdown: boolean = false;
  isSearchLoading: boolean = false;
  searchGroupedResults: any = {
    courses: [],
    resources: [],
    schemes: [],
    notifications: []
  };
  private searchSubject = new Subject<string>();

  onSearchInput() {
    this.searchSubject.next(this.searchQuery);
  }

  executeSearch(q: string) {
    if (!q || q.trim().length < 3) {
      this.showSearchDropdown = false;
      this.searchGroupedResults = { courses: [], resources: [], schemes: [], notifications: [] };
      return;
    }
    
    this.showSearchDropdown = true;
    this.isSearchLoading = true;

    this.telemetryService.search(q, 'ALL', this.disabilityId || undefined).subscribe({
      next: (res) => {
        this.isSearchLoading = false;
        this.searchGroupedResults = res || { courses: [], resources: [], schemes: [], notifications: [] };
      },
      error: (err) => {
        this.isSearchLoading = false;
        console.error('Global search error:', err);
      }
    });
  }

  isSearchResultsEmpty(): boolean {
    return !this.searchGroupedResults || (
      (!this.searchGroupedResults.courses || this.searchGroupedResults.courses.length === 0) &&
      (!this.searchGroupedResults.resources || this.searchGroupedResults.resources.length === 0) &&
      (!this.searchGroupedResults.schemes || this.searchGroupedResults.schemes.length === 0) &&
      (!this.searchGroupedResults.notifications || this.searchGroupedResults.notifications.length === 0)
    );
  }

  selectSearchItem(type: string, item: any) {
    this.showSearchDropdown = false;
    this.searchQuery = '';

    // Log telemetry for search selection click
    this.telemetryService.logTelemetry('SEARCH_CLICK', type, `Clicked matched item: ${item.title || item.message || item.id}`, this.disabilityId || undefined).subscribe();

    if (type === 'course') {
      if (this.isLoggedIn && this.userRole === 'STUDENT') {
        this.userService.getEnrollment(this.disabilityId, item.id).subscribe({
          next: (en) => {
            if (en && en.id) {
              this.router.navigate(['/dashboard/courses']); 
            } else {
              this.router.navigate(['/dashboard/courses']);
            }
          },
          error: () => this.router.navigate(['/dashboard/courses'])
        });
      } else {
        this.router.navigate(['/dashboard/courses']);
      }
    } else if (type === 'resource') {
      this.router.navigate(['/dashboard/courses']);
    } else if (type === 'scheme') {
      if (item.link) {
        window.open(item.link, '_blank');
      } else {
        this.router.navigate(['/dashboard/studentdashboard']);
      }
    } else if (type === 'notification') {
      this.router.navigate([this.userRole === 'ADMIN' ? '/dashboard/admindashboard' : '/dashboard/studentdashboard']);
    }
  }

  currentStreak = 0;
  bestStreak = 0;

  updateAndLoadStreak(userId: string): void {
    this.userService.updateLoginStreak(userId).subscribe({
      next: (progress: any) => {
        this.currentStreak = progress.currentStreak || 0;
        this.bestStreak = progress.longestStreak || 0;
      },
      error: (err) => console.error('Error updating streak:', err)
    });
  }



  
  constructor(
    private router: Router, 
    private userService: UserService, 
    private adminService: AdminService,
    private toastService: ToastService, 
    private telemetryService: SearchTelemetryService,
    private elementRef: ElementRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}
  
  toggleMenu() {
    if (!this.menuOpen) {
      this.previousActiveElement = document.activeElement as HTMLElement;
    }
    this.menuOpen = !this.menuOpen;
    if (this.menuOpen) {
      this.focusModal();
    } else {
      this.restorePreviousFocus();
    }
  }

  openLoginModal() {
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.showLoginModal = true;
    this.sidebarOpen = false;
    this.topMenuOpen = false;
    this.focusModal();
  }

  closeLoginModal() {
    this.showLoginModal = false;
    this.restorePreviousFocus();
  }

  onLoginSuccess(role: string) {
    this.showLoginModal = false;
    if (role === 'ADMIN') {
      this.router.navigate(['/dashboard/admindashboard']).then(() => {
        window.location.reload();
      });
    } else {
      this.router.navigate(['/dashboard/studentdashboard']).then(() => {
        window.location.reload();
      });
    }
  }

  editProfile() {
    this.menuOpen = false;
    this.topMenuOpen = false;
    this.router.navigate(['/dashboard/profile']);
  }
  
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        this.openConfirmModal('Change Profile Picture', 'Are you sure you want to change your profile picture?', () => {
          this.executeChangeProfilePicture(base64);
        });
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  executeChangeProfilePicture(base64: string) {
    this.profileImage = base64;
    this.updateUserData({ profileImage: base64 });
    
    const currentUser = this.userService.getCurrentUser();
    const isRemembered = isPlatformBrowser(this.platformId) && localStorage.getItem('authUser') !== null;
    
    if (this.userRole === 'ADMIN') {
      const adminId = currentUser?.adminId || this.disabilityId;
      const updatedData = {
        username: this.userName,
        profileImage: base64
      };
      this.adminService.updateAdmin(adminId, updatedData).subscribe({
        next: () => {
          this.toastService.success('Profile picture updated successfully!');
          if (currentUser) {
            this.userService.login({ ...currentUser, profileImage: base64 }, isRemembered);
          }
        },
        error: (err) => {
          console.error(err);
          this.toastService.error('Failed to save profile picture.');
        }
      });
    } else {
      this.userService.updateUser(this.disabilityId, { profileImage: base64 }).subscribe({
        next: () => {
          this.toastService.success('Profile picture updated successfully!');
          if (currentUser) {
            this.userService.login({ ...currentUser, profileImage: base64 }, isRemembered);
          }
        },
        error: (err) => {
          console.error(err);
          this.toastService.error('Failed to save profile picture.');
        }
      });
    }
  }
  
  removeProfileImage() {
    this.openConfirmModal(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      () => {
        this.executeRemoveProfileImage();
      }
    );
  }

  executeRemoveProfileImage() {
    const defaultImage = this.defaultAvatar;
    this.profileImage = defaultImage;
    this.updateUserData({ profileImage: defaultImage });
    
    const currentUser = this.userService.getCurrentUser();
    const isRemembered = isPlatformBrowser(this.platformId) && localStorage.getItem('authUser') !== null;
    
    if (this.userRole === 'ADMIN') {
      const adminId = currentUser?.adminId || this.disabilityId;
      const updatedData = {
        username: this.userName,
        profileImage: defaultImage
      };
      this.adminService.updateAdmin(adminId, updatedData).subscribe({
        next: () => {
          this.toastService.success('Profile picture removed!');
          if (currentUser) {
            this.userService.login({ ...currentUser, profileImage: defaultImage }, isRemembered);
          }
        },
        error: (err) => {
          console.error(err);
          this.toastService.error('Failed to remove profile picture.');
        }
      });
    } else {
      this.userService.updateUser(this.disabilityId, { profileImage: defaultImage }).subscribe({
        next: () => {
          this.toastService.success('Profile picture removed!');
          if (currentUser) {
            this.userService.login({ ...currentUser, profileImage: defaultImage }, isRemembered);
          }
        },
        error: (err) => {
          console.error(err);
          this.toastService.error('Failed to remove profile picture.');
        }
      });
    }
  }
  
  updateUserData(updatedData: any) {
    if (isPlatformBrowser(this.platformId)) {
      const currentUser = this.userService.getCurrentUser();
      if (currentUser) {
        const isRemembered = localStorage.getItem('authUser') !== null;
        const updatedUser = { ...currentUser, ...updatedData };
        this.userService.login(updatedUser, isRemembered);
      }
    }
  }
  
  logout() {
    this.toastService.success('Logged out successfully!');
    this.userService.logout();
    this.router.navigate(['/dashboard/main']);
  }
  
  @HostListener('document:click', ['$event'])
  closeMenu(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.position-relative') && !target.closest('.avatar-button')) {
      this.menuOpen = false;
    }
    if (!target.closest('.search')) {
      this.showSearchDropdown = false;
    }
  }
  about(){
    this.router.navigate(['/dashboard/about']);
  }
  resources(){
    this.router.navigate(['/dashboard/courses']);
  }
  cources(){
    this.router.navigate(['/dashboard/courses']);
  }
  contact(){
    this.router.navigate(['/dashboard/contact']);
  }

  goHome() {
    this.sidebarOpen = false;
    this.menuOpen = false;
    if (this.isLoggedIn) {
      if (this.userRole === 'ADMIN') {
        this.router.navigate(['/dashboard/admindashboard']);
      } else {
        this.router.navigate(['/dashboard/studentdashboard']);
      }
    } else {
      this.router.navigate(['/dashboard/main']);
    }
  }

  goToStreak() {
    this.sidebarOpen = false;
    this.menuOpen = false;
    this.router.navigate(['/dashboard/streak']);
  }

  goToProfile() {
    this.sidebarOpen = false;
    this.menuOpen = false;
    this.router.navigate(['/dashboard/profile']);
  }

}
