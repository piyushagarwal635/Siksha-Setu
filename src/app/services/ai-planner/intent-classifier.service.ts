import { Injectable } from '@angular/core';

export enum IntentType {
  SIMPLE = 'SIMPLE',
  COMPLEX = 'COMPLEX'
}

@Injectable({
  providedIn: 'root'
})
export class IntentClassifier {
  
  /**
   * Classifies the user's intent. 
   * In the future, this can be backed by a lightweight fast LLM call.
   * For Phase 2, we use a heuristic based on intent keywords.
   */
  public classify(transcript: string): IntentType {
    const text = transcript.toLowerCase();
    
    // Workflows that require a sequence of steps rather than a single direct action
    const complexKeywords = [
      'enroll', 'register', 'sign up', 'create account', 
      'pay', 'fee', 'upload assignment', 'submit quiz', 
      'reset password', 'buy course', 'take test',
      'fill form', 'complete profile'
    ];
    
    for (const keyword of complexKeywords) {
      if (text.includes(keyword)) {
        return IntentType.COMPLEX;
      }
    }
    
    return IntentType.SIMPLE;
  }
}
