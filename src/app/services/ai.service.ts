import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private apiUrl = `${environment.apiUrl}/api/chat`;

  constructor(private http: HttpClient) {}

  askQuestion(userId: string, message: string): Observable<{response: string}> {
    return this.http.post<{response: string}>(`${this.apiUrl}/ask`, {
      userId,
      message
    });
  }
}
