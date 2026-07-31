import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { IPlanner } from './iplanner.interface';
import { TaskPlan } from './task-plan.model';
import { SemanticContext } from '../ai-semantic-engine/reactive-context.service';
import { SemanticContextSerializer } from '../ai-semantic-engine/semantic-context-serializer.service';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LlmTaskPlanner implements IPlanner {
  
  constructor(
    private http: HttpClient,
    private serializer: SemanticContextSerializer
  ) {}

  async generatePlan(userIntent: string, context: SemanticContext | null, diagnosticId?: string): Promise<TaskPlan> {
    const payload = {
      transcript: userIntent,
      pageContext: this.serializer.serialize(context),
      isPlanningRequest: true,
      diagnosticId: diagnosticId
    };
    
    // Calls the new backend endpoint for planning
    const response = await firstValueFrom(
      this.http.post<TaskPlan>(`${environment.apiUrl}/api/voice/plan`, payload)
    );
    
    console.group(`[Diagnostic] Planner Output (${diagnosticId})`);
    console.log(response);
    console.groupEnd();
    
    return response;
  }
}
