import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

export interface FormFieldDescriptor {
  fieldId: string;
  type: string;
  isValid: boolean | null;
  currentValue: string | null;
  options?: string[]; // For selects
}

export interface FormDescriptor {
  formId: string;
  validationState: 'VALID' | 'INVALID' | 'PENDING';
  fields: FormFieldDescriptor[];
}

@Injectable({
  providedIn: 'root'
})
export class FormSemanticAnalyzer {
  private activeForms = new Map<string, { group: FormGroup, sub?: Subscription }>();
  private state = new BehaviorSubject<FormDescriptor[]>([]);
  public formState$: Observable<FormDescriptor[]> = this.state.asObservable();

  registerForm(id: string, group: FormGroup) {
    // Unsubscribe if previously registered
    if (this.activeForms.has(id)) {
       this.unregisterForm(id);
    }
    const sub = group.valueChanges.subscribe(() => this.publish());
    this.activeForms.set(id, { group, sub });
    this.publish();
  }

  unregisterForm(id: string) {
    const entry = this.activeForms.get(id);
    if (entry && entry.sub) {
      entry.sub.unsubscribe();
    }
    this.activeForms.delete(id);
    this.publish();
  }

  private publish() {
    const forms: FormDescriptor[] = [];
    this.activeForms.forEach((value, key) => {
      const group = value.group;
      const fields: FormFieldDescriptor[] = [];
      Object.keys(group.controls).forEach(controlName => {
        const control = group.controls[controlName];
        let val = control.value;
        // Mask passwords natively at the semantic extraction layer
        if (controlName.toLowerCase().includes('pass')) val = '***';
        
        fields.push({
          fieldId: controlName,
          type: 'input',
          isValid: control.valid,
          currentValue: val
        });
      });
      forms.push({
        formId: key,
        validationState: group.valid ? 'VALID' : 'INVALID',
        fields
      });
    });
    this.state.next(forms);
  }
}
