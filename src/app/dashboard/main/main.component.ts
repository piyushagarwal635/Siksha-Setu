import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-main',
  imports: [MatExpansionModule,CommonModule,MatTabsModule],
  templateUrl: './main.component.html',
  styleUrl: './main.component.css'
})
export class MainComponent {

  navigateToDashboard(): void {
    alert('Navigating to Dashboard...');
    // Add routing logic if required
  }

  navigateToCourses(): void {
    alert('Navigating to Courses...');
    // Add routing logic if required
  }

  navigateToResources(): void {
    alert('Navigating to Study Resources...');
    // Add routing logic if required
  }

  navigateToAnalytics(): void {
    alert('Navigating to Analytics...');
    // Add routing logic if required
  }

}
