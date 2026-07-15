import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private adminApiUrl = `${environment.apiUrl}/api/admins`;

  constructor(private http: HttpClient) {}

  getAdminById(adminId: string, silent: boolean = false): Observable<any> {
    let url = `${this.adminApiUrl}/${adminId}`;
    if (silent) url += '?silent=true';
    return this.http.get<any>(url);
  }

  updateAdmin(adminId: string, adminData: any): Observable<any> {
    return this.http.put(`${this.adminApiUrl}/update/${adminId}`, adminData);
  }

  forgotPasswordAdmin(resetData: any): Observable<any> {
    return this.http.post(`${this.adminApiUrl}/forgot-password`, resetData);
  }

  // Edit Requests Management
  getPendingEditRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/edit-requests`);
  }

  approveEditRequest(id: number): Observable<any> {
    return this.http.put(`${environment.apiUrl}/api/edit-requests/${id}/approve`, {}, { responseType: 'text' });
  }

  rejectEditRequest(id: number, reason: string): Observable<any> {
    return this.http.put(`${environment.apiUrl}/api/edit-requests/${id}/reject`, { reason }, { responseType: 'text' });
  }


  publishScheme(schemeData: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/schemes`, schemeData);
  }

  deleteScheme(id: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/api/schemes/${id}`, { responseType: 'text' });
  }

  // Broadcast / Notification Management
  getBroadcastHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/notifications/admin/broadcasts`);
  }

  deleteBroadcast(message: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/api/notifications/admin/broadcasts?message=${encodeURIComponent(message)}`, { responseType: 'text' });
  }

  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/users/all-users`);
  }

  getStudentAnalytics(userId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/student/${userId}/analytics`);
  }

  createCourse(courseData: any, file?: File): Observable<any> {
    const formData = new FormData();
    formData.append('course', JSON.stringify(courseData));
    
    if (file) {
      formData.append('image', file);
    }
    
    return this.http.post(`${environment.apiUrl}/api/courses`, formData);
  }

  updateCourse(id: string, courseData: any, file?: File): Observable<any> {
    const formData = new FormData();
    formData.append('course', JSON.stringify(courseData));
    
    if (file) {
      formData.append('image', file);
    }
    
    return this.http.put(`${environment.apiUrl}/api/courses/${id}`, formData);
  }

  deleteCourse(id: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/api/courses/${id}`, { responseType: 'text' });
  }

  // Resource Management
  createResource(resourceData: any, courseId?: string, file?: File): Observable<any> {
    const formData = new FormData();
    formData.append('resource', JSON.stringify(resourceData));
    
    if (file) {
      formData.append('file', file);
    }
    
    let url = `${environment.apiUrl}/api/resources`;
    if (courseId) {
      url += `?courseId=${courseId}`;
    }
    return this.http.post(url, formData);
  }

  deleteResource(id: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/api/resources/${id}`, { responseType: 'text' });
  }

  // Test Questions Management
  getTestQuestions(courseId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/courses/${courseId}/test-questions`);
  }

  addTestQuestion(courseId: string, question: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/courses/${courseId}/test-questions`, question);
  }

  updateTestQuestion(courseId: string, questionId: number, question: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/api/courses/${courseId}/test-questions/${questionId}`, question);
  }

  deleteTestQuestion(courseId: string, questionId: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/api/courses/${courseId}/test-questions/${questionId}`, { responseType: 'text' });
  }
}
