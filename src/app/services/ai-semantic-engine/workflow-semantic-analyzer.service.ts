import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface WorkflowDescriptor {
  workflowId: string;
  currentStep: number;
  totalSteps: number;
  stepName: string;
  isMultiStep: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WorkflowSemanticAnalyzer {
  private state = new BehaviorSubject<WorkflowDescriptor | null>(null);
  public workflowState$: Observable<WorkflowDescriptor | null> = this.state.asObservable();

  setWorkflow(workflow: WorkflowDescriptor | null) {
    this.state.next(workflow);
  }
}
