export interface TaskStep {
  stepId: string;
  stepDescription: string;
  actionType: 'NAVIGATE' | 'FOCUS' | 'INPUT_TEXT' | 'CLICK' | 'SELECT' | 'WAIT';
  actionTarget?: string;
  actionValue?: string;
  expectedOutcomeType: 'ROUTE_CHANGED' | 'ELEMENT_APPEARED' | 'FORM_VALID' | 'TOAST_SHOWN' | 'USER_CONFIRMED' | 'NONE';
  retryLimit: number;
  retryCount: number;
  status: 'PENDING' | 'DONE' | 'FAILED';
}

export interface TaskPlan {
  taskId: string;
  taskType: string;
  userIntent: string;
  steps: TaskStep[];
  currentStepIndex: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ABORTED';
}
