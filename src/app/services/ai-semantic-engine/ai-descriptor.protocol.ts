import { InjectionToken } from '@angular/core';

export enum ComponentPriority {
  CRITICAL = 1,
  HIGH = 3,
  NORMAL = 5,
  LOW = 8,
  BACKGROUND = 10
}

export interface ActionDescriptor {
  actionId: string;
  naturalLanguageLabel: string;
  triggerPhrase?: string[];
  selector?: string;
  requiresConfirmation?: boolean;
}

export interface ComponentDescriptor {
  componentId: string;
  componentType: string; // e.g. COURSE_CARD, VIDEO_PLAYER, FORM_FIELD
  displayName: string;
  state: 'DEFAULT' | 'IN_PROGRESS' | 'COMPLETED' | 'ERROR' | 'UNTOUCHED' | 'VALID' | 'INVALID';
  properties: Record<string, any>;
  availableActions: ActionDescriptor[];
  focusTarget: string; // CSS selector
  isVisible: boolean; // TODO: Replace hardcoded visibility with IntersectionObserver viewport detection
  isInteractive: boolean;
  priority: ComponentPriority;
}

export const AI_DESCRIPTOR_TOKEN = new InjectionToken<AiDescriptorProtocol>('AI_DESCRIPTOR_TOKEN');

export interface AiDescriptorProtocol {
  /**
   * Generates a semantic descriptor for the component's current state.
   */
  getSemanticState(): ComponentDescriptor;
}
