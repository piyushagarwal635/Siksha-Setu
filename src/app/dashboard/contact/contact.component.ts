import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccessibilityService } from '../../services/accessibility.service';
import { ToastService } from '../../services/toast.service';
import { UserService } from '../../services/user.service';
import { MatExpansionModule } from '@angular/material/expansion';

interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  time: string;
}

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, MatExpansionModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent {
  // Contact Form data
  public name: string = '';
  public email: string = '';
  public disabilityType: string = 'none';
  public message: string = '';
  public formSubmitted: boolean = false;

  // Chatbot state machine properties
  public chatMessageText: string = '';
  public chatState: 'ASK_NAME' | 'ASK_CONTACT' | 'ASK_ISSUE' | 'CHAT' = 'ASK_NAME';
  public chatUserName: string = '';
  public chatUserContact: string = '';
  public chatUserIssue: string = '';
  
  public chatMessages: ChatMessage[] = [
    {
      id: 1,
      text: 'Hello there! Welcome to Siksha Setu Help Desk. To assist you better, could you please enter your Full Name?',
      sender: 'bot',
      time: 'Just now'
    }
  ];
  public isTyping: boolean = false;
  public isLoading: boolean = false;
  private isBrowser: boolean;

  constructor(
    private accService: AccessibilityService,
    private toastService: ToastService,
    private userService: UserService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  // Speak input prompts for accessibility
  public speakPrompt(promptText: string) {
    this.accService.playClickSound();
    this.accService.speakText(promptText);
  }

  // Handle Contact Form Submit
  public submitForm() {
    if (!this.name || !this.email || !this.message) {
      this.toastService.warning('Please fill in all required fields.');
      this.accService.speakText('Please fill in all required fields.');
      return;
    }

    const payload = {
      name: this.name,
      email: this.email,
      subject: `Accessibility Need: ${this.disabilityType}`,
      message: this.message
    };

    this.userService.submitContactForm(payload).subscribe({
      next: () => {
        this.formSubmitted = true;
        this.accService.playSuccessSound();
        this.toastService.success('Feedback submitted successfully!');
        this.accService.speakText('Thank you! Your feedback has been received. We will get back to you shortly.');

        // Clear form
        setTimeout(() => {
          this.name = '';
          this.email = '';
          this.disabilityType = 'none';
          this.message = '';
          this.formSubmitted = false;
        }, 5000);
      },
      error: (err) => {
        console.error('Contact error:', err);
        this.toastService.error('Failed to send message. Please try again.');
        this.accService.speakText('Failed to send message. Please try again later.');
      }
    });
  }

  // Handle Chat message send
  public sendChatMessage() {
    const text = this.chatMessageText.trim();
    if (!text) return;

    this.accService.playClickSound();
    this.chatMessages.push({
      id: this.chatMessages.length + 1,
      text: text,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    this.chatMessageText = '';
    this.isTyping = true;
    this.scrollToBottom();

    // Mock bot response delay
    setTimeout(() => {
      if (!this.isBrowser) return;
      this.isTyping = false;
      this.accService.playSuccessSound();

      let reply = '';
      if (this.chatState === 'ASK_NAME') {
        this.chatUserName = text;
        this.chatState = 'ASK_CONTACT';
        reply = `Thank you, ${this.chatUserName}! Please provide your Email Address or Phone Number so we can get in touch with you.`;
      } else if (this.chatState === 'ASK_CONTACT') {
        this.chatUserContact = text;
        this.chatState = 'ASK_ISSUE';
        reply = `Great! Please describe the main issue, question, or reason why you are reaching out to us today.`;
      } else if (this.chatState === 'ASK_ISSUE') {
        this.chatUserIssue = text;
        this.chatState = 'CHAT';
        reply = `Got it. Let me answer that or anything else you need. (You can click the "Email Chat to Support" button at any time to send this chat directly to our volunteer team).`;
        
        // Push this transition reply
        this.chatMessages.push({
          id: this.chatMessages.length + 1,
          text: reply,
          sender: 'bot',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        this.accService.speakText(reply);
        this.scrollToBottom();

        // Also reply to their issue immediately
        this.isTyping = true;
        setTimeout(() => {
          this.isTyping = false;
          const initialAnswer = this.getBotReply(text);
          this.chatMessages.push({
            id: this.chatMessages.length + 1,
            text: initialAnswer,
            sender: 'bot',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
          this.accService.speakText(initialAnswer);
          this.scrollToBottom();
        }, 1000);
        return;
      } else {
        reply = this.getBotReply(text);
      }

      this.chatMessages.push({
        id: this.chatMessages.length + 1,
        text: reply,
        sender: 'bot',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      this.accService.speakText(reply);
      this.scrollToBottom();
    }, 1200);
  }

  private getBotReply(text: string): string {
    let reply = 'I have noted that down! Our volunteers will address your question shortly. Click the "Email Chat to Support" button to send this chat directly to us.';
    const lower = text.toLowerCase();
    if (lower.includes('course') || lower.includes('study')) {
      reply = 'We have courses in BCA, B.Sc IT, MCA, MBA, and B.Tech. You can find them under the Courses page!';
    } else if (lower.includes('contrast') || lower.includes('zoom') || lower.includes('accessibility')) {
      reply = 'You can toggle high-contrast, dyslexia fonts, large cursors, or text-to-speech from our floating Accessibility desk at the bottom-right!';
    } else if (lower.includes('contact') || lower.includes('phone') || lower.includes('email')) {
      reply = 'You can call us at +91 9897673276 or write to piyushagarwal352006@gmail.com.';
    }
    return reply;
  }

  public emailChatToSupport() {
    if (this.chatState !== 'CHAT') {
      this.toastService.warning('Please complete the details onboarding (Name, Contact, and Issue) first.');
      return;
    }

    this.isLoading = true;
    const historyPayload = this.chatMessages.map(m => ({
      sender: m.sender,
      text: m.text,
      time: m.time
    }));

    const payload = {
      name: this.chatUserName,
      contact: this.chatUserContact,
      issue: this.chatUserIssue,
      history: historyPayload
    };

    this.userService.submitChatHistory(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastService.success('Chat history successfully emailed to support!');
        this.chatMessages.push({
          id: this.chatMessages.length + 1,
          text: `Success! I have emailed this full conversation along with your details to our support team at piyushagarwal352006@gmail.com. We will contact you soon.`,
          sender: 'bot',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        this.scrollToBottom();
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('Error sending chat email:', err);
        this.toastService.error('Failed to email chat history. Please try again.');
      }
    });
  }

  private scrollToBottom() {
    if (!this.isBrowser) return;
    setTimeout(() => {
      const area = document.querySelector('.chat-history');
      if (area) {
        area.scrollTop = area.scrollHeight;
      }
    }, 50);
  }
}
