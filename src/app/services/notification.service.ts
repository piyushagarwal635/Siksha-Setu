import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NotificationItem {
  id: number;
  userId: string;
  message: string;
  read: boolean;
  isRead: boolean;
  createdAt: string;
  type?: string; // 'BROADCAST' = admin sent to all, 'INFO' = personal system notification
  link?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/api/notifications`;

  constructor(private http: HttpClient) {}

  getNotifications(userId: string): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>(`${this.apiUrl}/student/${userId}`);
  }

  markAsRead(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/read`, {}, { responseType: 'text' });
  }

  broadcastNotification(message: string, type: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/broadcast`, { message, type }, { responseType: 'text' });
  }
}
