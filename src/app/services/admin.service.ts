import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private adminApiUrl = 'http://localhost:8080/api/admins';

  constructor(private http: HttpClient) {}

  getAdminById(adminId: string): Observable<any> {
    return this.http.get<any>(`${this.adminApiUrl}/${adminId}`);
  }

  updateAdmin(adminId: string, adminData: any): Observable<any> {
    return this.http.put(`${this.adminApiUrl}/update/${adminId}`, adminData);
  }

  forgotPasswordAdmin(resetData: any): Observable<any> {
    return this.http.post(`${this.adminApiUrl}/forgot-password`, resetData);
  }

  // Edit Requests Management
  getPendingEditRequests(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:8080/api/edit-requests');
  }

  approveEditRequest(id: number): Observable<any> {
    return this.http.put(`http://localhost:8080/api/edit-requests/${id}/approve`, {}, { responseType: 'text' });
  }

  rejectEditRequest(id: number, reason: string): Observable<any> {
    return this.http.put(`http://localhost:8080/api/edit-requests/${id}/reject`, { reason }, { responseType: 'text' });
  }


  publishScheme(schemeData: any): Observable<any> {
    return this.http.post('http://localhost:8080/api/schemes', schemeData);
  }

  deleteScheme(id: number): Observable<any> {
    return this.http.delete(`http://localhost:8080/api/schemes/${id}`, { responseType: 'text' });
  }

  // Broadcast / Notification Management
  getBroadcastHistory(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:8080/api/notifications/admin/broadcasts');
  }

  deleteBroadcast(message: string): Observable<any> {
    return this.http.delete(`http://localhost:8080/api/notifications/admin/broadcasts?message=${encodeURIComponent(message)}`, { responseType: 'text' });
  }

  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:8080/api/users/all-users');
  }

  getStudentAnalytics(userId: string): Observable<any> {
    return this.http.get<any>(`http://localhost:8080/api/student/${userId}/analytics`);
  }

  createCourse(courseData: any, file?: File): Observable<any> {
    const formData = new FormData();
    formData.append('course', JSON.stringify(courseData));
    
    if (file) {
      formData.append('image', file);
    }
    
    return this.http.post(`http://localhost:8080/api/courses`, formData);
  }

  updateCourse(id: string, courseData: any, file?: File): Observable<any> {
    const formData = new FormData();
    formData.append('course', JSON.stringify(courseData));
    
    if (file) {
      formData.append('image', file);
    }
    
    return this.http.put(`http://localhost:8080/api/courses/${id}`, formData);
  }

  deleteCourse(id: string): Observable<any> {
    return this.http.delete(`http://localhost:8080/api/courses/${id}`, { responseType: 'text' });
  }

  // Resource Management
  createResource(resourceData: any, courseId?: string, file?: File): Observable<any> {
    const formData = new FormData();
    formData.append('resource', JSON.stringify(resourceData));
    
    if (file) {
      formData.append('file', file);
    }
    
    let url = `http://localhost:8080/api/resources`;
    if (courseId) {
      url += `?courseId=${courseId}`;
    }
    return this.http.post(url, formData);
  }

  deleteResource(id: number): Observable<any> {
    return this.http.delete(`http://localhost:8080/api/resources/${id}`, { responseType: 'text' });
  }

  // Test Questions Management
  getTestQuestions(courseId: string): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:8080/api/courses/${courseId}/test-questions`);
  }

  addTestQuestion(courseId: string, question: any): Observable<any> {
    return this.http.post<any>(`http://localhost:8080/api/courses/${courseId}/test-questions`, question);
  }

  updateTestQuestion(courseId: string, questionId: number, question: any): Observable<any> {
    return this.http.put<any>(`http://localhost:8080/api/courses/${courseId}/test-questions/${questionId}`, question);
  }

  deleteTestQuestion(courseId: string, questionId: number): Observable<any> {
    return this.http.delete(`http://localhost:8080/api/courses/${courseId}/test-questions/${questionId}`, { responseType: 'text' });
  }
}
