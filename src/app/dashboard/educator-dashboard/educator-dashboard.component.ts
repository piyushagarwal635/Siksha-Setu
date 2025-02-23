import { Component } from '@angular/core';
import { Chart, registerables } from 'chart.js/auto';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';


Chart.register(...registerables);

@Component({
  selector: 'app-educator-dashboard',
  imports: [FormsModule,CommonModule],
  templateUrl: './educator-dashboard.component.html',
  styleUrl: './educator-dashboard.component.css'
})
export class EducatorDashboardComponent {

  readContent() {
    const text = document.body.innerText;
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'en-US';
    window.speechSynthesis.speak(speech);
  }

  ngAfterViewInit() {
    this.loadChart();
  }

  viewTextResources() {
    alert('Opening text resources...');
  }

  loadChart() {
    const ctx = document.getElementById('dataChart') as HTMLCanvasElement;
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Concept 1', 'Concept 2', 'Concept 3'],
        datasets: [
          {
            label: 'Understanding Levels',
            data: [75, 50, 90],
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          },
        ],
      },
    });
  };
  courses = ["JavaScript", "Angular", "Python", "Java"];
  selectedCourse = "";
  resourceTypes = ["all", "text", "video", "audio"];
  selectedResource= "";
  filteredResources: Resource[] = [];  // Yaha pe filtered data store hoga


  // Course-wise resources data with file paths
  resources: { [key: string]: Resource[] } = {
    JavaScript: [
      { type: "text", name: "JS Guide", path: "assets/texts/js-guide.pdf" },
      { type: "text", name: "ES6 Tutorial", path: "assets/texts/es6-tutorial.pdf" },
      { type: "video", name: "Intro to JS", path: "assets/videos/intro-js.mp4" },
      { type: "video", name: "Advanced JS", path: "assets/videos/advanced-js.mp4" },
      { type: "audio", name: "JS Podcast Ep1", path: "assets/audios/js-podcast-1.mp3" },
      { type: "audio", name: "JS Podcast Ep2", path: "assets/audios/js-podcast-2.mp3" }
    ],
    Angular: [
      { type: "text", name: "Angular Docs", path: "assets/texts/angular-docs.pdf" },
      { type: "text", name: "Component Guide", path: "assets/texts/component-guide.pdf" },
      { type: "video", name: "Angular Basics", path: "assets/videos/angular-basics.mp4" },
      { type: "video", name: "RxJS Guide", path: "assets/videos/rxjs-guide.mp4" },
      { type: "audio", name: "Angular Podcast Ep1", path: "assets/audios/angular-podcast-1.mp3" },
      { type: "audio", name: "Angular Podcast Ep2", path: "assets/audios/angular-podcast-2.mp3" }
    ],
    Python: [],
    Java: []
  };

  // Function to filter resources dynamically
  filterResources() {
    if (!this.selectedCourse || !this.selectedResource) {
      this.filteredResources = [];
      return;
    }

    if (this.selectedResource === "all") {
      this.filteredResources = this.resources[this.selectedCourse];
    } else {
      this.filteredResources = this.resources[this.selectedCourse]
      .filter((r: Resource) => r.type === this.selectedResource);
    }
  }
}
interface Resource {
  type: string;
  name: string;
  path: string;
}

