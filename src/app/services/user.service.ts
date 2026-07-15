import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { SecureStorageService } from './secure-storage.service';
import { environment } from '../../environments/environment';

export interface AuthUser {
  user: string;
  disabilityId?: string;
  adminId?: string;
  role: string;
  token: string;
  email?: string;
  profileImage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private apiUrl = `${environment.apiUrl}/api/users`;

  private currentUser = new BehaviorSubject<AuthUser | null>(null);
  public currentUser$ = this.currentUser.asObservable();

  private isAuthenticated = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticated.asObservable();

  constructor(
    private http: HttpClient,
    private secureStorage: SecureStorageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.restoreSession();
  }

  createUser(userData: any): Observable<any> {
    return this.http.post(this.apiUrl, userData);
  }

  checkUserExists(disabilityId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/check/${disabilityId}`);
  }

  updateUser(disabilityId: string, userData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/update/${disabilityId}`, userData, { responseType: 'text' });
  }

  loginUser(loginData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, loginData);
  }

  forgotPasswordStudent(resetData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, resetData);
  }

  updatePassword(disabilityId: string, passwordData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/update-password/${disabilityId}`, passwordData, { responseType: 'text' });
  }

  updateNotificationPreferences(disabilityId: string, preferences: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/update-notifications/${disabilityId}`, preferences, { responseType: 'text' });
  }

  submitContactForm(contactData: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/contact`, contactData, { responseType: 'text' });
  }

  login(user: AuthUser, rememberMe: boolean = false): void {
    this.currentUser.next(user);
    this.isAuthenticated.next(true);
    if (isPlatformBrowser(this.platformId)) {
      this.secureStorage.setItem('authUser', JSON.stringify(user), rememberMe);
      if (user.token) {
        this.secureStorage.setItem('token', user.token, rememberMe);
      }
    }
  }

  logout(): void {
    this.currentUser.next(null);
    this.isAuthenticated.next(false);
    if (isPlatformBrowser(this.platformId)) {
      this.secureStorage.clearAll();
    }
    this.http.post(`${this.apiUrl}/logout`, {}, { responseType: 'text' }).subscribe({
      next: () => console.log('Session cookie cleared on backend.'),
      error: (err) => console.error('Error clearing session cookie on backend:', err)
    });
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated.getValue();
  }

  restoreSession(): void {
    if (isPlatformBrowser(this.platformId)) {
      const storedUserStr = this.secureStorage.getItem('authUser');
      if (storedUserStr) {
        try {
          const user = JSON.parse(storedUserStr) as AuthUser;
          this.currentUser.next(user);
          this.isAuthenticated.next(true);
        } catch (e) {
          console.error('Failed to parse stored authUser', e);
          this.logout();
        }
      }
    }
  }

  updateCookieConsent(consent: string): Observable<any> {
    const user = this.currentUser.getValue();
    const userId = user ? (user.disabilityId || user.adminId || '') : '';
    if (isPlatformBrowser(this.platformId) && userId) {
      localStorage.setItem(`cookieConsent_${userId}`, consent);
    }
    return this.http.post(`${this.apiUrl}/cookie-consent`, { consent }, { responseType: 'text' });
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser.getValue();
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return this.secureStorage.getItem('token');
    }
    return null;
  }

  getDisabilityId(): string | null {
    const user = this.currentUser.getValue();
    return user ? user.disabilityId || null : null;
  }

  getUsername(): string | null {
    const user = this.currentUser.getValue();
    return user ? user.user : null;
  }

  getUserByDisabilityId(disabilityId: string, silent: boolean = false): Observable<any> {
    let url = `${this.apiUrl}/${disabilityId}`;
    if (silent) url += '?silent=true';
    return this.http.get<any>(url);
  }

  getUserRole(user: AuthUser | null): string {
    return user?.role || 'STUDENT';
  }

  // Student Edit Requests
  submitEditRequest(requestData: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/edit-requests`, requestData);
  }

  getStudentEditRequests(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/edit-requests/student/${userId}`);
  }

  // Security Question Recovery Workflow
  getForgotPasswordQuestion(userId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/auth/forgot-password/question/${userId}`);
  }

  resetPasswordWithSecurityQuestion(resetData: { userId: string; securityAnswer: string; newPassword: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/auth/forgot-password/answer`, resetData, { responseType: 'text' });
  }

  updateLoginStreak(userId: string, silent: boolean = false): Observable<any> {
    let url = `${environment.apiUrl}/api/student/${userId}/login-streak`;
    if (silent) url += '?silent=true';
    return this.http.post(url, null);
  }

  restoreStreak(userId: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/student/${userId}/restore-streak`, null);
  }

  getStudentAnalytics(userId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/student/${userId}/analytics`);
  }

  getSchemes(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/schemes`);
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) {
      return true;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  // Course and Resource Endpoints
  getAllCourses(silent: boolean = false): Observable<any[]> {
    let url = `${environment.apiUrl}/api/courses`;
    if (silent) {
      url += '?silent=true';
    }
    return this.http.get<any[]>(url);
  }

  getAllResources(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/resources`);
  }

  enrollInCourse(userId: string, courseId: string, preference: string): Observable<any> {
    const params = new HttpParams().set('preference', preference);
    return this.http.post(`${environment.apiUrl}/api/student/${userId}/enroll/${courseId}`, null, { params });
  }

  getResourcesByCourse(courseId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/resources/course/${courseId}`);
  }

  getEnrollment(userId: string, courseId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/student/${userId}/course/${courseId}/enrollment`);
  }

  completeResource(userId: string, courseId: string, resourceId: number): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/student/${userId}/course/${courseId}/complete-resource/${resourceId}`, null);
  }

  submitTest(userId: string, courseId: string, payload: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/student/${userId}/course/${courseId}/submit-test`, payload);
  }

  generateCertificate(userId: string, courseId: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/student/${userId}/enroll/${courseId}/certificate`, {});
  }

  unenrollFromCourse(userId: string, courseId: string, review?: string): Observable<any> {
    let params = new HttpParams();
    if (review) {
      params = params.set('review', review);
    }
    return this.http.delete(`${environment.apiUrl}/api/student/${userId}/unenroll/${courseId}`, { params, responseType: 'text' });
  }

  submitChatHistory(payload: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/contact/chat`, payload);
  }

  getFileContent(url: string): Observable<string> {
    let targetUrl = url;
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      targetUrl = `${environment.apiUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    return this.http.get(targetUrl, { responseType: 'text' });
  }

  // Test Questions
  getTestQuestions(courseId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/courses/${courseId}/test-questions`);
  }
}
