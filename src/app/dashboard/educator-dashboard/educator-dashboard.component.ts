import { Component, AfterViewInit } from '@angular/core';
import { Chart, registerables } from 'chart.js/auto';

Chart.register(...registerables);

@Component({
  selector: 'app-educator-dashboard',
  imports: [],
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
  }
}
