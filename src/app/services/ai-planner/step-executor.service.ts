import { Injectable, inject } from '@angular/core';
import { TaskPlan, TaskStep } from './task-plan.model';
import { VerificationLayer } from '../ai-verification/verification-layer.service';
import { TaskMemoryService } from '../ai-memory/task-memory.service';

@Injectable({
  providedIn: 'root'
})
export class StepExecutor {
  private verificationLayer = inject(VerificationLayer);
  private taskMemory = inject(TaskMemoryService);
  
  /**
   * Executes a TaskPlan sequentially.
   * Note: Full Verification layer (Phase 3) will later wrap the executeActionFn.
   * For Phase 2, we execute and assume success if it doesn't throw.
   */
  public async executePlan(plan: TaskPlan, executeActionFn: (action: any) => Promise<boolean>): Promise<void> {
    plan.status = 'IN_PROGRESS';
    this.taskMemory.saveActivePlan(plan);
    
    console.group(`[Diagnostic] StepExecutor: Executing Plan ${plan.taskId || 'unknown'}`);
    for (let i = plan.currentStepIndex; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      console.log(`[Diagnostic] StepExecutor: Executing Step ${i + 1} - ${step.stepDescription}`);
      
      const actionPayload = {
        type: step.actionType,
        target: step.actionTarget,
        value: step.actionValue
      };
      
      try {
        const actionExecuted = await executeActionFn(actionPayload);
        console.log(`[Diagnostic] StepExecutor: Action Execution Result = ${actionExecuted}`);
        
        if (actionExecuted) {
          // Phase 3: Wait for Verification
          console.log(`[Diagnostic] VerificationLayer: Verifying step outcome: ${step.expectedOutcomeType}`);
          const verificationResult = await this.verificationLayer.verifyAction(actionPayload, step.expectedOutcomeType);
          console.log(`[Diagnostic] VerificationLayer Result: ${JSON.stringify(verificationResult)}`);
          
          if (verificationResult.success) {
            step.status = 'DONE';
            plan.currentStepIndex = i + 1;
            this.taskMemory.saveActivePlan(plan);
          } else {
            console.warn(`Step verification failed: ${verificationResult.message}`);
            step.status = 'FAILED';
            plan.status = 'FAILED';
            this.taskMemory.saveActivePlan(plan);
            break;
          }
        } else {
          step.status = 'FAILED';
          plan.status = 'FAILED';
          this.taskMemory.saveActivePlan(plan);
          break;
        }
      } catch (err) {
        step.status = 'FAILED';
        plan.status = 'FAILED';
        this.taskMemory.saveActivePlan(plan);
        break;
      }
    }
    
    if (plan.currentStepIndex === plan.steps.length) {
      console.log(`[Diagnostic] StepExecutor: Plan completed successfully.`);
      plan.status = 'COMPLETED';
      this.taskMemory.saveActivePlan(plan);
    } else {
      console.log(`[Diagnostic] StepExecutor: Plan failed at step ${plan.currentStepIndex + 1}.`);
    }
    console.groupEnd();
  }
}
