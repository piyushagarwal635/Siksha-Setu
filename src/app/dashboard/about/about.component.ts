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
      year: '2023',
      title: 'Foundation Laid',
      desc: 'Siksha Setu was conceptualized to bridge the access gap in digital learning tools for specially-abled students across India.',
      icon: 'bi-lightbulb-fill'
    },
    {
      year: '2024',
      title: 'Voice Navigation Engine',
      desc: 'Released hands-free voice control navigation allowing visually and physically impaired learners to explore courses independently.',
      icon: 'bi-mic-fill'
    },
    {
      year: '2025',
      title: 'Adaptive Learning Core',
      desc: 'Launched gamified course environments, daily streak counters, and acoustic celebrations for successful completions.',
      icon: 'bi-fire'
    },
    {
      year: '2026',
      title: 'AI Roadmaps & Multi-Sensory Sync',
      desc: 'Implementing generative AI summaries, dynamic screen readers, and side-by-side sign language sync interpretations.',
      icon: 'bi-robot'
    },
    {
      year: '2027 (Future)',
      title: 'Tactile Braille Hardware Sync',
      desc: 'Developing integration protocols for physical refreshable 3D Braille displays and hardware haptic controllers.',
      icon: 'bi-cpu-fill'
    }
  ];

  constructor(private accService: AccessibilityService) {}

  public clickTone() {
    this.accService.playClickSound();
  }
}
