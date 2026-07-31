import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ComponentDescriptor } from './ai-descriptor.protocol';

@Injectable({
  providedIn: 'root'
})
export class ComponentRegistry {
  private components = new Map<string, () => ComponentDescriptor>();
  private stateSubject = new BehaviorSubject<ComponentDescriptor[]>([]);
  public components$: Observable<ComponentDescriptor[]> = this.stateSubject.asObservable();

  register(id: string, getStateFn: () => ComponentDescriptor) {
    console.log(`[Diagnostic] ComponentRegistry: REGISTER [${id}]`);
    this.components.set(id, getStateFn);
    this.publish();
  }

  unregister(id: string) {
    console.log(`[Diagnostic] ComponentRegistry: UNREGISTER [${id}]`);
    this.components.delete(id);
    this.publish();
  }

  public publish() {
    // Only capture state if semantic engine is active to save computation
    const currentState = Array.from(this.components.values()).map(fn => fn());
    console.log(`[Diagnostic] ComponentRegistry: Active Component List Size: ${currentState.length}`);
    this.stateSubject.next(currentState);
  }
}
