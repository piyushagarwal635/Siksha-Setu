import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ComponentRegistry } from './component-registry.service';
import { RouteSemanticAnalyzer, PageDescriptor } from './route-semantic-analyzer.service';
import { FormSemanticAnalyzer, FormDescriptor } from './form-semantic-analyzer.service';
import { WorkflowSemanticAnalyzer, WorkflowDescriptor } from './workflow-semantic-analyzer.service';
import { ComponentDescriptor } from './ai-descriptor.protocol';

export interface SemanticContext {
  capturedAt: string;
  currentPage: PageDescriptor | null;
  visibleComponents: ComponentDescriptor[];
  activeForms: FormDescriptor[];
  workflowState: WorkflowDescriptor | null;
  version?: number;
  availableActions?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class ReactiveContextService implements OnDestroy {
  private contextSubject = new BehaviorSubject<SemanticContext | null>(null);
  public context$: Observable<SemanticContext | null> = this.contextSubject.asObservable();
  private destroy$ = new Subject<void>();
  private versionCounter = 1;

  constructor(
    private registry: ComponentRegistry,
    private routeAnalyzer: RouteSemanticAnalyzer,
    private formAnalyzer: FormSemanticAnalyzer,
    private workflowAnalyzer: WorkflowSemanticAnalyzer
  ) {
    combineLatest([
      this.routeAnalyzer.pageState$,
      this.registry.components$,
      this.formAnalyzer.formState$,
      this.workflowAnalyzer.workflowState$
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([page, components, forms, workflow]) => {
      
      // Filter out invisible and take top priority to save tokens
      const visibleComponents = components
        .filter(c => c.isVisible)
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 6);

      const context: SemanticContext = {
        capturedAt: new Date().toISOString(),
        currentPage: page,
        visibleComponents,
        activeForms: forms,
        workflowState: workflow,
        version: this.versionCounter++
      };
      
      // DIAGNOSTIC FIX: If no components registered yet, provide a DOM fallback
      if (visibleComponents.length === 0) {
        context.availableActions = this.scrapeDOMForActions();
      }
      
      this.contextSubject.next(context);
    });
  }

  private scrapeDOMForActions(): any[] {
    const actions: any[] = [];
    const elements = document.querySelectorAll('button, a, input, select, textarea, [data-ai-id]');
    elements.forEach((el: any) => {
      // Ignore UI elements that the AI does not need to interact with
      if (el.closest('app-accessibility-widget, app-navbar, nav, header, footer, app-sidebar, .sidebar, .accessibility-widget, aside')) {
          return;
      }
      
      let name = el.getAttribute('aria-label') || el.title || el.innerText || el.placeholder || el.name;
      if (name) name = name.trim().replace(/\s+/g, ' ').substring(0, 50);
      const target = el.id ? `#${el.id}` : (el.getAttribute('data-ai-id') ? `[data-ai-id="${el.getAttribute('data-ai-id')}"]` : null);
      if (name && target) {
        actions.push({ name, target, type: el.tagName.toLowerCase() });
      }
    });
    return actions;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public getLatestContext(): SemanticContext | null {
    return this.contextSubject.value;
  }
}
