import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccessibilityService } from '../../services/accessibility.service';

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
export class AboutComponent {
  public milestones: Milestone[] = [
    {
      year: 'Inception',
      title: 'The Spark',
      desc: 'Piyush recognized the massive gap in digital education for specially-abled students and began conceptualizing Siksha Setu as a unified platform.',
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
      icon: 'bi-grid-3x3-gap-fill'
    },
    {
      year: 'Future',
      title: 'Hardware & AI',
      desc: 'Working towards physical refreshable Braille hardware synchronization and AI-driven adaptive learning paths for personalized education.',
      icon: 'bi-rocket-takeoff-fill'
    }
  ];

  constructor(private accService: AccessibilityService) {}

  public clickTone() {
    this.accService.playClickSound();
  }
}
