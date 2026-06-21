import { Component, HostListener, Inject, PLATFORM_ID, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccessibilityService, ContrastMode, LetterSpacingMode, LineHeightMode } from '../../../services/accessibility.service';
import { ToastService } from '../../../services/toast.service';
import { UserService } from '../../../services/user.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-accessibility-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './accessibility-widget.component.html',
  styleUrls: ['./accessibility-widget.component.css']
})
export class AccessibilityWidgetComponent implements OnInit, OnDestroy {
  public isOpen: boolean = false;
  public rulerTop: number = 0;
  public showVoiceModal: boolean = false;
  public recognizedText: string = '';
  public lastExecutedCommand: string = '';
  private isBrowser: boolean;
  private voiceSubscription: any = null;
  private boundGlobalMouseOver = this.onGlobalMouseOver.bind(this);

  constructor(
    public accService: AccessibilityService,
    private router: Router,
    private toastService: ToastService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private userService: UserService,
    private notificationService: NotificationService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      // Listen to voice commands
      this.voiceSubscription = this.accService.voiceCommandDetected.subscribe((command: string) => {
        this.handleVoiceCommand(command);
      });

      // Global hover speaker listener
      document.addEventListener('mouseover', this.boundGlobalMouseOver);
    }
  }

  ngOnDestroy() {
    if (this.voiceSubscription) {
      this.voiceSubscription.unsubscribe();
    }
    if (this.isBrowser) {
      document.removeEventListener('mouseover', this.boundGlobalMouseOver);
      this.accService.stopSpeechRecognition();
    }
  }

  // Toggle Accessibility Panel Drawer
  public togglePanel() {
    this.isOpen = !this.isOpen;
    this.accService.playClickSound();
    if (this.isOpen) {
      this.accService.speakText('Accessibility settings panel opened. Press escape or click toggle to close.');
    } else {
      this.accService.stopSpeaking();
    }
  }

  // Toggle Voice Recognition Modal
  public toggleVoiceRecognition() {
    this.accService.playClickSound();
    if (this.showVoiceModal) {
      this.showVoiceModal = false;
      this.accService.stopSpeechRecognition();
    } else {
      this.showVoiceModal = true;
      this.recognizedText = 'Listening... Speak now.';
      this.lastExecutedCommand = '';
      this.accService.startSpeechRecognition();
      this.accService.speakText('Voice commands activated. Say a command like "home", "courses", or "contrast".');
    }
  }

  // Text-To-Speech Global Hover Reader
  private onGlobalMouseOver(event: MouseEvent) {
    if (!this.accService.ttsEnabled) return;

    const target = event.target as HTMLElement;
    if (!target) return;

    // Speak text of headers, paragraphs, buttons, input labels, links
    const matches = target.matches('h1, h2, h3, h4, h5, h6, p, button, a, span, label, input, select');
    if (matches) {
      // Avoid speaking long parent blocks if we hovered a child
      event.stopPropagation();
      
      let speakText = '';
      if (target.tagName === 'INPUT') {
        const inputEl = target as HTMLInputElement;
        speakText = (inputEl.placeholder || 'Input text box') + (inputEl.value ? ', current value: ' + inputEl.value : '');
      } else {
        speakText = target.innerText || target.getAttribute('aria-label') || '';
      }

      if (speakText) {
        this.accService.playHoverSound();
        this.accService.speakText(speakText);
      }
    }
  }

  // Accessibility actions
  public setContrast(mode: ContrastMode) {
    this.accService.contrastMode = mode;
    this.accService.saveSettings();
    this.accService.playClickSound();
    this.accService.speakText(`Contrast mode set to ${mode}`);
  }

  public adjustFontSize(delta: number) {
    let size = this.accService.fontSize + delta;
    if (size < 12) size = 12;
    if (size > 28) size = 28;
    this.accService.fontSize = size;
    this.accService.saveSettings();
    this.accService.playClickSound();
    this.accService.speakText(`Font size set to ${size} pixels`);
  }

  public setSpacing(mode: LetterSpacingMode) {
    this.accService.letterSpacing = mode;
    this.accService.saveSettings();
    this.accService.playClickSound();
    this.accService.speakText(`Letter spacing set to ${mode}`);
  }

  public setLineHeight(mode: LineHeightMode) {
    this.accService.lineHeight = mode;
    this.accService.saveSettings();
    this.accService.playClickSound();
    this.accService.speakText(`Line height set to ${mode === 'double' ? 'double' : 'normal'}`);
  }

  public toggleDyslexia() {
    this.accService.dyslexiaFont = !this.accService.dyslexiaFont;
    this.accService.saveSettings();
    this.accService.playClickSound();
    this.accService.speakText(`Dyslexia font ${this.accService.dyslexiaFont ? 'enabled' : 'disabled'}`);
  }

  public toggleCursor() {
    this.accService.largeCursor = !this.accService.largeCursor;
    this.accService.saveSettings();
    this.accService.playClickSound();
    this.accService.speakText(`Large cursor ${this.accService.largeCursor ? 'enabled' : 'disabled'}`);
  }

  public toggleRuler() {
    this.accService.focusRuler = !this.accService.focusRuler;
    this.accService.saveSettings();
    this.accService.playClickSound();
    this.accService.speakText(`Focus guide ruler ${this.accService.focusRuler ? 'enabled' : 'disabled'}`);
  }

  public toggleSounds() {
    this.accService.soundsEnabled = !this.accService.soundsEnabled;
    this.accService.saveSettings();
    this.accService.playClickSound();
    this.accService.speakText(`Interactive sound cues ${this.accService.soundsEnabled ? 'enabled' : 'disabled'}`);
  }

  public toggleTts() {
    this.accService.ttsEnabled = !this.accService.ttsEnabled;
    this.accService.saveSettings();
    this.accService.playClickSound();
    if (this.accService.ttsEnabled) {
      this.accService.speakText('Screen reader assistant activated. Hover mouse over any text to read aloud.');
    } else {
      this.accService.stopSpeaking();
    }
  }

  public resetAll() {
    this.accService.contrastMode = 'normal';
    this.accService.fontSize = 16;
    this.accService.letterSpacing = 'normal';
    this.accService.lineHeight = 'normal';
    this.accService.dyslexiaFont = false;
    this.accService.largeCursor = false;
    this.accService.focusRuler = false;
    this.accService.soundsEnabled = true;
    this.accService.ttsEnabled = false;
    this.accService.saveSettings();
    this.accService.playSuccessSound();
    this.accService.speakText('All accessibility settings have been reset to default.');
  }

  // Mouse Move Event Listener for Focus Ruler
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.accService.focusRuler) {
      this.rulerTop = event.clientY;
    }
  }

  // Keyboard Shortcuts (Alt + A / Alt + V / Escape)
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.altKey && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      this.togglePanel();
    }
    if (event.altKey && event.key.toLowerCase() === 'v') {
      event.preventDefault();
      this.toggleVoiceRecognition();
    }
    if (event.key === 'Escape') {
      if (this.isOpen) this.togglePanel();
      if (this.showVoiceModal) this.toggleVoiceRecognition();
    }
  }

  // Helper to speak and update modal text
  private speakAndReply(spoken: string, reply: string, autoClose: boolean = false) {
    this.recognizedText = `You said: "${spoken}"`;
    this.lastExecutedCommand = reply;
    this.accService.playSuccessSound();
    this.toastService.info(reply);
    this.accService.speakText(reply, true);

    if (autoClose) {
      setTimeout(() => {
        this.showVoiceModal = false;
        this.accService.stopSpeechRecognition();
      }, 2000);
    }
  }

  // Process voice commands
  private handleVoiceCommand(cmd: string) {
    const normalizedCmd = cmd.toLowerCase().trim();
    if (!normalizedCmd) return;

    this.recognizedText = `Listening...`;
    this.accService.playClickSound();

    const currentUser = this.userService.getCurrentUser();
    const userId = currentUser ? (currentUser.disabilityId || currentUser.adminId) : null;
    const role = currentUser ? currentUser.role : 'STUDENT';

    // 1. DYNAMIC DATA QUERIES
    // A. Course count
    if (normalizedCmd.includes('how many course') || normalizedCmd.includes('course count') || normalizedCmd.includes('total course')) {
      this.userService.getAllCourses().subscribe({
        next: (courses) => {
          const count = courses ? courses.length : 0;
          this.speakAndReply(cmd, `There are ${count} courses currently available on Siksha Setu.`);
        },
        error: () => {
          this.speakAndReply(cmd, "Sorry, I could not fetch the course count right now.");
        }
      });
      return;
    }
    // B. Course names / types
    if (normalizedCmd.includes('course name') || normalizedCmd.includes('name type') || normalizedCmd.includes('list course') || normalizedCmd.includes('what are the course') || normalizedCmd.includes('which course') || normalizedCmd.includes('course type')) {
      this.userService.getAllCourses().subscribe({
        next: (courses) => {
          if (courses && courses.length > 0) {
            const names = courses.map(c => c.title).join(', ');
            this.speakAndReply(cmd, `The courses available are: ${names}.`);
          } else {
            this.speakAndReply(cmd, "There are no courses available at the moment.");
          }
        },
        error: () => {
          this.speakAndReply(cmd, "Sorry, I could not retrieve the course names right now.");
        }
      });
      return;
    }
    // C. Scheme count
    if (normalizedCmd.includes('how many scheme') || normalizedCmd.includes('scheme count') || normalizedCmd.includes('total scheme')) {
      this.userService.getSchemes().subscribe({
        next: (schemes) => {
          const count = schemes ? schemes.length : 0;
          this.speakAndReply(cmd, `There are ${count} government schemes available.`);
        },
        error: () => {
          this.speakAndReply(cmd, "Sorry, I could not retrieve the schemes count right now.");
        }
      });
      return;
    }
    // D. Scheme names / list
    if (normalizedCmd.includes('what scheme') || normalizedCmd.includes('list scheme') || normalizedCmd.includes('scheme name') || normalizedCmd.includes('available scheme')) {
      this.userService.getSchemes().subscribe({
        next: (schemes) => {
          if (schemes && schemes.length > 0) {
            const names = schemes.map(s => s.title).join(', ');
            this.speakAndReply(cmd, `The government schemes are: ${names}.`);
          } else {
            this.speakAndReply(cmd, "There are no government schemes available at the moment.");
          }
        },
        error: () => {
          this.speakAndReply(cmd, "Sorry, I could not fetch the schemes list right now.");
        }
      });
      return;
    }
    // E. Notification count
    if (normalizedCmd.includes('how many notification') || normalizedCmd.includes('notification count') || normalizedCmd.includes('unread notification') || normalizedCmd.includes('total notification')) {
      if (userId) {
        this.notificationService.getNotifications(userId).subscribe({
          next: (notifs) => {
            const count = notifs ? notifs.filter(n => !n.isRead && !n.read).length : 0;
            this.speakAndReply(cmd, `You have ${count} unread notifications.`);
          },
          error: () => {
            this.speakAndReply(cmd, "Sorry, I could not check your notifications count right now.");
          }
        });
      } else {
        this.speakAndReply(cmd, "Please log in to check your notifications count.");
      }
      return;
    }

    // 2. NAVIGATIONS & ROUTING
    // A. Open notifications
    if (normalizedCmd.includes('open notification') || normalizedCmd.includes('show notification') || normalizedCmd.includes('go to notification') || normalizedCmd.includes('view notification') || normalizedCmd === 'notifications') {
      if (role === 'ADMIN') {
        this.router.navigate(['/dashboard/admindashboard'], { queryParams: { section: 'notifications' } });
        this.speakAndReply(cmd, "Opening Admin notification desk.", true);
      } else {
        this.router.navigate(['/dashboard/studentdashboard'], { queryParams: { section: 'notifications' } });
        this.speakAndReply(cmd, "Opening your notification box.", true);
      }
      return;
    }
    // B. Open schemes
    if (normalizedCmd.includes('open scheme') || normalizedCmd.includes('show scheme') || normalizedCmd.includes('go to scheme') || normalizedCmd.includes('view scheme') || normalizedCmd === 'schemes') {
      if (role === 'ADMIN') {
        this.router.navigate(['/dashboard/admindashboard'], { queryParams: { section: 'notifications' } }).then(() => {
          setTimeout(() => {
            const el = document.getElementById('government-schemes');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 600);
        });
        this.speakAndReply(cmd, "Opening schemes management.", true);
      } else {
        this.router.navigate(['/dashboard/studentdashboard'], { queryParams: { section: 'overview' } }).then(() => {
          setTimeout(() => {
            const el = document.getElementById('government-schemes');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 600);
        });
        this.speakAndReply(cmd, "Scrolling to Government Schemes.", true);
      }
      return;
    }
    // C. Dashboard / Home / Other links
    if (normalizedCmd.includes('home') || normalizedCmd.includes('main') || normalizedCmd.includes('start') || normalizedCmd.includes('front page')) {
      this.router.navigate(['/dashboard/main']);
      this.speakAndReply(cmd, "Navigating to Home Page.", true);
      return;
    }
    if (normalizedCmd.includes('student dashboard') || normalizedCmd.includes('my progress') || normalizedCmd.includes('student panel')) {
      this.router.navigate(['/dashboard/studentdashboard']);
      this.speakAndReply(cmd, "Navigating to Student Dashboard.", true);
      return;
    }
    if (normalizedCmd.includes('admin') || normalizedCmd.includes('administrator') || normalizedCmd.includes('admin panel') || normalizedCmd.includes('admin dashboard')) {
      this.router.navigate(['/dashboard/admindashboard']);
      this.speakAndReply(cmd, "Navigating to Admin Dashboard.", true);
      return;
    }
    if (normalizedCmd.includes('course') || normalizedCmd.includes('learn') || normalizedCmd.includes('study') || normalizedCmd.includes('class') || normalizedCmd.includes('lesson')) {
      this.router.navigate(['/dashboard/courses']);
      this.speakAndReply(cmd, "Navigating to Courses Page.", true);
      return;
    }
    if (normalizedCmd.includes('resource') || normalizedCmd.includes('material') || normalizedCmd.includes('library') || normalizedCmd.includes('pdf') || normalizedCmd.includes('video')) {
      this.router.navigate(['/dashboard/courses']);
      this.speakAndReply(cmd, "Navigating to Resources and Courses Page.", true);
      return;
    }
    if (normalizedCmd.includes('about') || normalizedCmd.includes('who we are') || normalizedCmd.includes('info')) {
      this.router.navigate(['/dashboard/about']);
      this.speakAndReply(cmd, "Navigating to About Page.", true);
      return;
    }
    if (normalizedCmd.includes('contact') || normalizedCmd.includes('support') || normalizedCmd.includes('help') || normalizedCmd.includes('message')) {
      this.router.navigate(['/dashboard/contact']);
      this.speakAndReply(cmd, "Navigating to Contact Page.", true);
      return;
    }
    if (normalizedCmd.includes('profile') || normalizedCmd.includes('edit profile') || normalizedCmd.includes('settings') || normalizedCmd.includes('account setting')) {
      this.router.navigate(['/dashboard/profile']);
      this.speakAndReply(cmd, "Navigating to Profile Settings.", true);
      return;
    }
    if (normalizedCmd.includes('streak') || normalizedCmd.includes('fire') || normalizedCmd.includes('contribution')) {
      this.router.navigate(['/dashboard/streak']);
      this.speakAndReply(cmd, "Navigating to Streak Board.", true);
      return;
    }

    // 3. ACCESSIBILITY CONTROLS
    if (normalizedCmd.includes('yellow contrast') || normalizedCmd.includes('yellow theme')) {
      this.setContrast('yellow-black');
      this.speakAndReply(cmd, "High contrast yellow-black activated.");
      return;
    }
    if (normalizedCmd.includes('white contrast') || normalizedCmd.includes('contrast white') || normalizedCmd.includes('white theme') || normalizedCmd.includes('light on dark')) {
      this.setContrast('white-black');
      this.speakAndReply(cmd, "Contrast white-black activated.");
      return;
    }
    if (normalizedCmd.includes('normal contrast') || normalizedCmd.includes('reset contrast') || normalizedCmd.includes('default contrast') || normalizedCmd.includes('standard contrast')) {
      this.setContrast('normal');
      this.speakAndReply(cmd, "Contrast reset to default.");
      return;
    }
    if (normalizedCmd.includes('gray') || normalizedCmd.includes('grayscale') || normalizedCmd.includes('black and white')) {
      this.setContrast('grayscale');
      this.speakAndReply(cmd, "Grayscale filter activated.");
      return;
    }
    if (normalizedCmd.includes('large font') || normalizedCmd.includes('increase font') || normalizedCmd.includes('bigger text') || normalizedCmd.includes('zoom in')) {
      this.adjustFontSize(2);
      this.speakAndReply(cmd, "Font size increased.");
      return;
    }
    if (normalizedCmd.includes('small font') || normalizedCmd.includes('decrease font') || normalizedCmd.includes('smaller text') || normalizedCmd.includes('zoom out')) {
      this.adjustFontSize(-2);
      this.speakAndReply(cmd, "Font size decreased.");
      return;
    }
    if (normalizedCmd.includes('dyslexia') || normalizedCmd.includes('dyslexic') || normalizedCmd.includes('reading font')) {
      this.toggleDyslexia();
      this.speakAndReply(cmd, `Dyslexia friendly font ${this.accService.dyslexiaFont ? 'enabled' : 'disabled'}.`);
      return;
    }
    if (normalizedCmd.includes('cursor') || normalizedCmd.includes('pointer') || normalizedCmd.includes('mouse') || normalizedCmd.includes('big pointer')) {
      this.toggleCursor();
      this.speakAndReply(cmd, `Large helper cursor ${this.accService.largeCursor ? 'enabled' : 'disabled'}.`);
      return;
    }
    if (normalizedCmd.includes('ruler') || normalizedCmd.includes('guide') || normalizedCmd.includes('focus line') || normalizedCmd.includes('reading line')) {
      this.toggleRuler();
      this.speakAndReply(cmd, `Reading focus ruler ${this.accService.focusRuler ? 'enabled' : 'disabled'}.`);
      return;
    }
    if (normalizedCmd.includes('reader') || normalizedCmd.includes('speak') || normalizedCmd.includes('speech') || normalizedCmd.includes('voice') || normalizedCmd.includes('narrator') || normalizedCmd.includes('text to speech')) {
      this.toggleTts();
      this.speakAndReply(cmd, `Screen reader voice ${this.accService.ttsEnabled ? 'enabled' : 'disabled'}.`);
      return;
    }
    if (normalizedCmd.includes('reset all') || normalizedCmd.includes('default settings') || normalizedCmd.includes('normal settings')) {
      this.resetAll();
      this.speakAndReply(cmd, "All accessibility settings reset to standard.");
      return;
    }
    if (normalizedCmd.includes('close') || normalizedCmd.includes('stop') || normalizedCmd.includes('exit') || normalizedCmd.includes('quit') || normalizedCmd.includes('cancel')) {
      this.showVoiceModal = false;
      this.accService.stopSpeechRecognition();
      this.speakAndReply(cmd, "Voice assistant closed.", true);
      return;
    }

    // 4. FALLBACK FOR UNRECOGNIZED COMMAND (AS REQUESTED BY USER)
    this.speakAndReply(cmd, "Command not found. Please try again.");
  }
}
