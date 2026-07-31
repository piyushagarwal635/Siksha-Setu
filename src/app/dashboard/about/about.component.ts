import { Component, AfterViewInit, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AccessibilityService } from '../../services/accessibility.service';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface Milestone {
  year: string;
  title: string;
  desc: string;
  icon: string;
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent implements AfterViewInit {
  bgTransform: string = 'translate3d(0px, 0px, 0px) scale(1.05)';

  public milestones: Milestone[] = [
    {
      year: 'Inception',
      title: 'The Spark',
      desc: 'Piyush recognized the massive gap in digital education for specially-abled students and began conceptualizing Divya Mitra as a unified platform.',
      icon: 'bi-lightbulb-fill'
    },
    {
      year: 'Development',
      title: 'Building the Core',
      desc: 'Started developing the main LMS (Learning Management System) features, including gamified courses, streak tracking, and secure testing environments.',
      icon: 'bi-code-slash'
    },
    {
      year: 'Integration',
      title: 'Accessibility First',
      desc: 'Implemented deep accessibility features: voice navigation, text-to-speech, high contrast modes, and custom cursor profiles for visually impaired users.',
      icon: 'bi-universal-access'
    },
    {
      year: 'Innovation',
      title: 'Virtual Braille Display',
      desc: 'Developed a cutting-edge 3D virtual Braille display and liblouis integration, allowing real-time translation of study materials into readable Braille cells.',
      icon: 'bi-grid-fill'
    },
    {
      year: 'Future',
      title: 'Hardware & AI',
      desc: 'Working towards physical refreshable Braille hardware synchronization and AI-driven adaptive learning paths for personalized education.',
      icon: 'bi-rocket-takeoff-fill'
    }
  ];

  private isBrowser: boolean;

  constructor(
    public accService: AccessibilityService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      setTimeout(() => {
        this.initGsapAnimations();
      }, 100);
    }
  }

  initGsapAnimations(): void {
    // Header Animation
    gsap.from('.about-header', { y: -50, opacity: 0, duration: 1, ease: 'power3.out' });
    gsap.from('.about-header h1', { y: 20, opacity: 0, duration: 0.8, delay: 0.2, ease: 'power2.out' });
    gsap.from('.about-header p', { y: 20, opacity: 0, duration: 0.8, delay: 0.4, ease: 'power2.out' });

    // Pillar Cards
    gsap.utils.toArray('.pillar-card').forEach((card: any, i) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 90%',
        },
        scale: 0.9,
        y: 40,
        opacity: 0,
        duration: 0.6,
        ease: 'back.out(1.5)',
        delay: i * 0.15
      });
    });

    // Feature Cards
    gsap.utils.toArray('.feature-card').forEach((card: any, i) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 90%',
        },
        x: i % 2 === 0 ? -40 : 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out'
      });
    });

    // Founder Section
    gsap.from('.founder-section', {
      scrollTrigger: {
        trigger: '.founder-section',
        start: 'top 85%',
      },
      y: 50,
      opacity: 0,
      duration: 1,
      ease: 'power3.out'
    });

    // Timeline Items
    gsap.utils.toArray('.milestone-card, .timeline-item').forEach((item: any, i) => {
      gsap.from(item, {
        scrollTrigger: {
          trigger: item,
          start: 'top 85%',
        },
        x: item.classList.contains('left') || i % 2 === 0 ? -50 : 50,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out'
      });
    });
  }

  public clickTone() {
    this.accService.playClickSound();
  }
}
