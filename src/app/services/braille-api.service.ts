import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BrailleContentArea,
  BrailleTranslation,
  BrailleTranslationRequest
} from '../braille/braille.models';

@Injectable({ providedIn: 'root' })
export class BrailleApiService {
  private readonly apiUrl = 'http://localhost:8080/api/braille';

  constructor(private readonly http: HttpClient) {}

  translate(request: BrailleTranslationRequest): Observable<BrailleTranslation> {
    return this.http.post<BrailleTranslation>(`${this.apiUrl}/translate`, request);
  }

  translateResource(
    resourceId: number,
    contentArea: BrailleContentArea,
    dotMode: 6 | 8
  ): Observable<BrailleTranslation> {
    return this.http.post<BrailleTranslation>(
      `${this.apiUrl}/resources/${resourceId}/translate`,
      { contentArea, dotMode }
    );
  }

  health(): Observable<{ available: boolean; engine: string; version: string }> {
    return this.http.get<{ available: boolean; engine: string; version: string }>(
      `${this.apiUrl}/health`
    );
  }
}
