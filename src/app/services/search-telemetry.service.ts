import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SearchTelemetryService {
  private apiUrl = `${environment.apiUrl}/api`;
  private searchCache: { [key: string]: any } = {};

  constructor(private http: HttpClient) {}

  // Search API call with client-side caching
  search(query: string, category?: string, userId?: string, extraParams: any = {}): Observable<any> {
    const cacheKey = `${query}_${category || 'all'}_${userId || 'anonymous'}_${JSON.stringify(extraParams)}`;
    if (this.searchCache[cacheKey]) {
      return of(this.searchCache[cacheKey]);
    }

    let params: any = { q: query };
    if (category) params.category = category;
    if (userId) params.userId = userId;
    
    // Merge extra filter parameters
    params = { ...params, ...extraParams };

    return this.http.get<any>(`${this.apiUrl}/search`, { params }).pipe(
      tap(results => {
        this.searchCache[cacheKey] = results;
      })
    );
  }

  // Clear search cache
  clearCache() {
    this.searchCache = {};
  }

  // Log Telemetry Event
  logTelemetry(action: string, relatedEntity?: string, details?: string, disabilityId?: string): Observable<any> {
    const payload = {
      action,
      relatedEntity,
      details,
      disabilityId
    };
    return this.http.post<any>(`${this.apiUrl}/telemetry/log`, payload);
  }

  // Admin Analytics - summary stats
  getAdminSummary(days?: number): Observable<any> {
    let params: any = {};
    if (days !== undefined) params.days = days;
    return this.http.get<any>(`${this.apiUrl}/analytics/admin-summary`, { params });
  }

  // Admin Analytics - detailed course stats
  getCourseAnalytics(days?: number): Observable<any[]> {
    let params: any = {};
    if (days !== undefined) params.days = days;
    return this.http.get<any[]>(`${this.apiUrl}/analytics/courses`, { params });
  }

  // Admin Analytics - detailed resource stats
  getResourceAnalytics(days?: number): Observable<any> {
    let params: any = {};
    if (days !== undefined) params.days = days;
    return this.http.get<any>(`${this.apiUrl}/analytics/resources`, { params });
  }

  // Admin Analytics - telemetry insights
  getTelemetryStats(days?: number): Observable<any> {
    let params: any = {};
    if (days !== undefined) params.days = days;
    return this.http.get<any>(`${this.apiUrl}/telemetry/stats`, { params });
  }
}
