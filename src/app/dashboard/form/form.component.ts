import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-form',
  imports: [ReactiveFormsModule],
  templateUrl: './form.component.html',
  styleUrl: './form.component.css'
})
export class FormComponent {

  userForm: FormGroup;

  // Example prefilled data
  loginData = {
    id: 'DIS123456', 
    name: 'Piyush Agarwal',
  };

  courses = ['BCA', 'B.Sc IT', 'MCA', 'MBA', 'B.Tech'];

  constructor(private fb: FormBuilder) {
    this.userForm = this.fb.group({
      id: [{ value: this.loginData.id, disabled: true }],
      name: [{ value: this.loginData.name, disabled: true }],
      course: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern('^[6-9][0-9]{9}$')]],
      email: ['', [Validators.required, Validators.email]],
      incomeCertificate: ['', Validators.required],
    });
  }

  onSubmit() {
    if (this.userForm.valid) {
      alert('Form submitted successfully!');
      console.log(this.userForm.getRawValue());
    } else {
      alert('Please complete all required fields.');
    }
  }
}
