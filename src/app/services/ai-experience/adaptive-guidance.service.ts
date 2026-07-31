import { Injectable, inject } from '@angular/core';
import { ExperienceEngine } from './experience-engine.service';
import { ReactiveContextService } from '../ai-semantic-engine/reactive-context.service';

@Injectable({
  providedIn: 'root'
})
export class AdaptiveGuidanceService {
  private experienceEngine = inject(ExperienceEngine);
  private reactiveContext = inject(ReactiveContextService);

  public buildAdaptiveContextPayload(): any {
    const rawContext = this.reactiveContext.getLatestContext();
    const profile = this.experienceEngine.getProfile();

    return {
      ...rawContext,
      experienceModifiers: {
        guidanceDepth: profile.guidanceDepth,
        confirmationStyle: profile.confirmationStyle,
        speechSpeed: profile.speechSpeed
      }
    };
  }
}
