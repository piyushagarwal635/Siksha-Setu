import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { AccessibilityService } from '../../services/accessibility.service';
import { getRandomTest, TestQuestion } from '../../shared/test-pool';

@Component({
  selector: 'app-secure-test-environment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './secure-test-environment.component.html',
  styleUrls: ['./secure-test-environment.component.css']
})
export class SecureTestEnvironmentComponent implements OnInit, OnDestroy {
  userId: string | null = null;
  courseId: string | null = null;

  testQuestions: TestQuestion[] = [];
  currentTestIndex: number = 0;
  testAnswers: number[] = [];
  testFinished: boolean = false;
  testScore: number = 0;
  testPassed: boolean = false;

  // Timers
  globalTimerSeconds: number = 30 * 60; // 30 minutes
  questionTimerSeconds: number = 90; // 90 seconds
  globalTimerInterval: any;
  questionTimerInterval: any;

  // Anti-Cheat tracking
  tabSwitches: number = 0;
  fullscreenExits: number = 0;
  suspiciousEvents: string[] = [];
  MAX_TAB_SWITCHES: number = 3;
  
  private boundVisibilityChange = this.handleVisibilityChange.bind(this);
  private boundFullscreenChange = this.handleFullscreenChange.bind(this);

  constructor(private route: ActivatedRoute, private router: Router, private userService: UserService, private accService: AccessibilityService) { const user = this.userService.getCurrentUser(); this.userId = user ? (user.disabilityId || user.adminId || null) : null; }

  ngOnInit() {
    this.courseId = this.route.snapshot.paramMap.get('courseId');
    if (!this.userId || !this.courseId) {
      
      this.router.navigate(['/dashboard']);
      return;
    }

    this.userService.getTestQuestions(this.courseId).subscribe({
      next: (questions) => {
        this.testQuestions = questions;
        if (this.testQuestions.length === 0) {
          
          this.router.navigate(['/dashboard']);
          return;
        }
        this.testAnswers = new Array(this.testQuestions.length).fill(-1);

        this.restoreAutoSave();
        this.requestFullscreen();
        this.startTimers();

        document.addEventListener('visibilitychange', this.boundVisibilityChange);
        document.addEventListener('fullscreenchange', this.boundFullscreenChange);
        
        // Announce start
        this.accService.speakText('Secure test mode started. You have 90 seconds per question.');
        this.focusQuestionText();
      },
      error: (err) => {
        console.error('Failed to load test questions', err);
        
        this.router.navigate(['/dashboard']);
      }
    });
  }

  ngOnDestroy() {
    this.clearTimers();
    document.removeEventListener('visibilitychange', this.boundVisibilityChange);
    document.removeEventListener('fullscreenchange', this.boundFullscreenChange);
  }

  // --- Browser Lock & Anti-Cheating ---

  @HostListener('contextmenu', ['$event'])
  onRightClick(event: Event) {
    event.preventDefault();
    this.logSuspicious('Right click attempted');
  }

  @HostListener('copy', ['$event'])
  @HostListener('paste', ['$event'])
  @HostListener('cut', ['$event'])
  onClipboard(event: Event) {
    event.preventDefault();
    this.logSuspicious('Clipboard action blocked');
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Block Ctrl+C, Ctrl+V, Ctrl+P, F12, etc
    if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'p', 's', 'x', 'a', 'u'].includes(event.key.toLowerCase())) {
      event.preventDefault();
      this.logSuspicious(`Blocked shortcut: Ctrl+${event.key}`);
    }
    if (event.key === 'F12') {
      event.preventDefault();
      this.logSuspicious('Blocked shortcut: F12');
    }
    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  private trapFocus(event: KeyboardEvent) {
    const wrapper = document.querySelector('.secure-test-wrapper');
    if (!wrapper) return;
    const focusable = wrapper.querySelectorAll('button, [tabindex="0"]');
    const focusableFiltered = Array.from(focusable).filter(el => {
      const style = window.getComputedStyle(el as HTMLElement);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             (el as HTMLElement).offsetWidth > 0 && 
             (el as HTMLElement).offsetHeight > 0 && 
             !(el as HTMLButtonElement).disabled;
    }) as HTMLElement[];
    
    if (focusableFiltered.length === 0) return;
    
    const first = focusableFiltered[0];
    const last = focusableFiltered[focusableFiltered.length - 1];
    
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

  handleVisibilityChange() {
    if (document.hidden) {
      this.tabSwitches++;
      this.logSuspicious(`Tab switched/minimized (Count: ${this.tabSwitches})`);
      
      if (this.tabSwitches >= this.MAX_TAB_SWITCHES) {
        this.logSuspicious('Max tab switches exceeded. Auto-submitting.');
        this.submitTest();
      }
    }
  }

  handleFullscreenChange() {
    if (!document.fullscreenElement) {
      this.fullscreenExits++;
      this.logSuspicious(`Exited fullscreen (Count: ${this.fullscreenExits})`);
      
      this.requestFullscreen();
    }
  }

  logSuspicious(eventDetails: string) {
    const timestamp = new Date().toISOString();
    this.suspiciousEvents.push(`[${timestamp}] ${eventDetails}`);
    console.warn('Security Alert:', eventDetails);
  }

  requestFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => {
        console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    }
  }

  // --- Timers & Auto-Save ---

  startTimers() {
    this.clearTimers();
    
    

    this.questionTimerInterval = setInterval(() => {
      this.questionTimerSeconds--;
      if (this.questionTimerSeconds <= 0) {
        this.nextQuestion();
      }
    }, 1000);
  }

  clearTimers() {
    
    if (this.questionTimerInterval) clearInterval(this.questionTimerInterval);
  }

  autoSave() {
    if (this.testFinished) return;
    const saveState = {
      courseId: this.courseId,
      currentTestIndex: this.currentTestIndex,
      testAnswers: this.testAnswers,
      
      suspiciousEvents: this.suspiciousEvents,
      tabSwitches: this.tabSwitches,
      fullscreenExits: this.fullscreenExits
    };
    sessionStorage.setItem(`test_save_${this.courseId}`, JSON.stringify(saveState));
  }

  restoreAutoSave() {
    const saved = sessionStorage.getItem(`test_save_${this.courseId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.courseId === this.courseId) {
          this.currentTestIndex = parsed.currentTestIndex || 0;
          this.testAnswers = parsed.testAnswers || this.testAnswers;
          
          this.suspiciousEvents = parsed.suspiciousEvents || [];
          this.tabSwitches = parsed.tabSwitches || 0;
          this.fullscreenExits = parsed.fullscreenExits || 0;
        }
      } catch(e) {}
    }
  }



  // --- Test Logic ---

  selectOption(index: number) {
    this.testAnswers[this.currentTestIndex] = index;
    this.autoSave();
  }

  nextQuestion() {
    if (this.currentTestIndex < this.testQuestions.length - 1) {
      this.currentTestIndex++;
      this.questionTimerSeconds = 90; // Reset question timer
      this.autoSave();
      
      this.accService.speakText(`Question ${this.currentTestIndex + 1}: ${this.testQuestions[this.currentTestIndex].question}`);
      this.focusQuestionText();
    } else {
      this.submitTest();
    }
  }

  submitTest() {
    if (this.testFinished) return;
    
    this.clearTimers();
    this.testFinished = true;
    
    // Calculate Score
    let correctCount = 0;
    for (let i = 0; i < this.testQuestions.length; i++) {
      if (this.testAnswers[i] === this.testQuestions[i].correctIndex) {
        correctCount++;
      }
    }
    
    this.testScore = (correctCount / this.testQuestions.length) * 100;
    this.testPassed = this.testScore >= 80;

    // Build Payload
    const payload = {
      score: this.testScore,
      tabSwitches: this.tabSwitches,
      fullscreenExits: this.fullscreenExits,
      suspiciousEvents: this.suspiciousEvents.join('\n')
    };

    this.userService.submitTest(this.userId!, this.courseId!, payload).subscribe(
      (res) => {
        sessionStorage.removeItem(`test_save_${this.courseId}`);
        if(document.fullscreenElement) {
          document.exitFullscreen().catch(()=>{});
        }
        
        let msg = `Test Submitted. You scored ${this.testScore}%. `;
        msg += this.testPassed ? "Congratulations, you passed!" : "Unfortunately, you did not pass.";
        this.accService.speakText(msg);

        // Programmatically focus result title
        setTimeout(() => {
          const resHeading = document.getElementById('test-result-heading');
          if (resHeading) {
            resHeading.setAttribute('tabindex', '-1');
            resHeading.focus();
          }
        }, 200);
      },
      (err) => {
        console.error("Error submitting test", err);
      }
    );
  }

  exitToDashboard() {
    if(document.fullscreenElement) {
      document.exitFullscreen().catch(()=>{});
    }
    this.router.navigate(['/dashboard/studentdashboard/course', this.courseId]);
  }

  focusQuestionText() {
    setTimeout(() => {
      const qText = document.getElementById('test-question-text');
      if (qText) {
        qText.setAttribute('tabindex', '-1');
        qText.focus();
      }
    }, 150);
  }
}



