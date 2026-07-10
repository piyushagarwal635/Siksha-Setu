import { Component, OnInit } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ToastService } from '../../services/toast.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [MatExpansionModule, CommonModule, MatTabsModule, RouterModule],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {

  courses: any[] = [];
  
  // Design fallbacks
  defaultIcons = ['bi-code-slash', 'bi-chat-dots', 'bi-calculator', 'bi-journal-text', 'bi-laptop', 'bi-palette'];
  defaultColors = ['text-primary bg-primary', 'text-info bg-info', 'text-warning bg-warning', 'text-success bg-success', 'text-danger bg-danger', 'text-secondary bg-secondary'];

  constructor(private router: Router, private toastService: ToastService, private userService: UserService) {}

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.userService.getAllCourses().subscribe({
      next: (data) => {
        // Show up to 6 courses on the main page
        this.courses = (data || []).slice(0, 6);
      },
      error: (err) => console.error('Error loading courses on main page:', err)
    });
  }

  getIconClass(course: any, index: number): string {
    if (course.image && course.image.startsWith('bi-')) {
      return course.image;
    }
    return this.defaultIcons[index % this.defaultIcons.length];
  }

  getColorClass(index: number): string {
    return this.defaultColors[index % this.defaultColors.length];
  }

  navigateToDashboard(): void {
    this.router.navigate(['/dashboard/studentdashboard']);
  }

  navigateToCourses(): void {
    this.router.navigate(['/dashboard/courses']);
  }

  navigateToResources(): void {
    this.router.navigate(['/dashboard/courses']);
  }

  promptLogin(courseId?: string): void {
    const user = this.userService.getCurrentUser();
    if (user && user.disabilityId) {
      if (courseId) {
        this.userService.enrollInCourse(user.disabilityId, courseId, 'GENERAL').subscribe({
          next: () => {
            this.toastService.success('Successfully enrolled in course!');
            this.router.navigate(['/dashboard/studentdashboard']);
          },
          error: (err) => {
            this.toastService.error('Failed to enroll in course');
            console.error(err);
          }
        });
      } else {
        this.router.navigate(['/dashboard/studentdashboard']);
      }
    } else {
      this.toastService.warning('Please log in or register to access this feature.', 'Login Required');
    }
  }
}
