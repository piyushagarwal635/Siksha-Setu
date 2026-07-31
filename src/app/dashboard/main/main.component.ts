import { Component, OnInit, AfterViewInit, HostListener } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ToastService } from '../../services/toast.service';
import { UserService } from '../../services/user.service';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [MatExpansionModule, CommonModule, MatTabsModule, RouterModule],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit, AfterViewInit {

  courses: any[] = [];
  bgTransform: string = 'translate3d(0px, 0px, 0px) scale(1.05)';
  
  
  // Design fallbacks
  defaultIcons = ['bi-code-slash', 'bi-chat-dots', 'bi-calculator', 'bi-journal-text', 'bi-laptop', 'bi-palette'];
  defaultColors = ['text-primary bg-primary', 'text-info bg-info', 'text-warning bg-warning', 'text-success bg-success', 'text-danger bg-danger', 'text-secondary bg-secondary'];

  constructor(private router: Router, private toastService: ToastService, private userService: UserService) {}

  ngOnInit(): void {
    this.loadCourses();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    // 3D dynamic parallax effect
    const xAxis = (window.innerWidth / 2 - event.clientX) / 45;
    const yAxis = (window.innerHeight / 2 - event.clientY) / 45;
    this.bgTransform = `translate3d(${xAxis}px, ${yAxis}px, 0px) scale(1.1)`;
  }

  ngAfterViewInit(): void {
    this.initGsapAnimations();
  }

  initGsapAnimations(): void {
    // Hero Section Animations
    const tl = gsap.timeline();
    tl.from('.hero-badge', { y: -20, opacity: 0, duration: 0.6, ease: 'back.out(1.7)' })
      .from('.hero-title', { y: 30, opacity: 0, duration: 0.8, ease: 'power3.out' }, '-=0.4')
      .from('.hero-subtitle', { y: 20, opacity: 0, duration: 0.6, ease: 'power2.out' }, '-=0.4')
      .from('.hero-section .btn', { y: 20, opacity: 0, duration: 0.5, stagger: 0.2, ease: 'power2.out' }, '-=0.3');

    // Bento Cards Scroll Animation
    gsap.utils.toArray('.bento-card').forEach((card: any, i) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 90%',
        },
        y: 50,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out'
      });
    });

    // Feature Cards Scroll Animation (Ecosystem)
    gsap.utils.toArray('.hover-effect').forEach((card: any, i) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 90%',
        },
        y: 40,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out'
      });
    });

    // Journey Timeline Animation
    gsap.utils.toArray('.journey-item').forEach((item: any) => {
      gsap.from(item, {
        scrollTrigger: {
          trigger: item,
          start: 'top 85%',
        },
        x: -30,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out'
      });
    });

    // Course Cards Animation
    gsap.utils.toArray('.course-card').forEach((card: any, i) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 90%',
        },
        scale: 0.95,
        y: 30,
        opacity: 0,
        duration: 0.6,
        ease: 'back.out(1.2)'
      });
    });
  }

  loadCourses(): void {
    this.userService.getAllCourses(true).subscribe({
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
