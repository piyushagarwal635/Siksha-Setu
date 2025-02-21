import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-student-dashboard',
  imports: [CommonModule,FormsModule],
  templateUrl: './student-dashboard.component.html',
  styleUrl: './student-dashboard.component.css'
})
export class StudentDashboardComponent {

  studentInfo = {
    name: '',
    disabilityId: '',
    course: 'B.Sc Computer Science',
    semester: '5th Semester',
    dues: '₹ 5,000',
  };

  ngOnInit(): void {
    this.studentInfo.name = localStorage.getItem('username') || 'Unknown';
    this.studentInfo.disabilityId =
      localStorage.getItem('disabilityId') || 'Not Provided';
  }

  notifications = [
    'Mid-semester exams start on 15th Feb.',
    'Library book submission extended to 10th Feb.',
    'Fee payment deadline: 28th Feb.',
    'New elective course registration starts from 5th Feb.',
    'Internship applications open till 1st March.',
  ];

  recentActivities = [
    { date: '1st Feb', activity: 'Attended "AI and ML Workshop"' },
    { date: '25th Jan', activity: 'Paid Library Fine' },
    { date: '20th Jan', activity: 'Submitted Assignment 3' },
    { date: '18th Jan', activity: 'Participated in Hackathon' },
  ];

  quickLinks = ['View Grades', 'Attendance Records', 'Library History', 'Pay Fees'];

  studyResources = [
    { title: 'Data Structures Notes', link: '#' },
    { title: 'Operating Systems PPTs', link: '#' },
    { title: 'AI Video Lectures', link: '#' },
    { title: 'ML Practice Problems', link: '#' },
  ];

}
