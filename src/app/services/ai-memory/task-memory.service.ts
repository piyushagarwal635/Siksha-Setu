import { Injectable } from '@angular/core';
import { TaskPlan } from '../ai-planner/task-plan.model';

@Injectable({
  providedIn: 'root'
})
export class TaskMemoryService {
  private readonly STORAGE_KEY = 'ai_active_task_plan';

  public saveActivePlan(plan: TaskPlan): void {
    if (plan.status === 'COMPLETED' || plan.status === 'FAILED') {
      this.clearActivePlan();
    } else {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(plan));
    }
  }

  public getActivePlan(): TaskPlan | null {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (data) {
      try {
        return JSON.parse(data) as TaskPlan;
      } catch (e) {
        this.clearActivePlan();
      }
    }
    return null;
  }

  public clearActivePlan(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
