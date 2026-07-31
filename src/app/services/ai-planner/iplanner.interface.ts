import { TaskPlan } from './task-plan.model';
import { SemanticContext } from '../ai-semantic-engine/reactive-context.service';

export interface IPlanner {
  /**
   * Generates a step-by-step task plan based on the user's intent and current semantic context.
   */
  generatePlan(userIntent: string, context: SemanticContext | null): Promise<TaskPlan>;
}
