import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SecureTestEnvironmentComponent } from './secure-test-environment.component';

describe('SecureTestEnvironmentComponent', () => {
  let component: SecureTestEnvironmentComponent;
  let fixture: ComponentFixture<SecureTestEnvironmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecureTestEnvironmentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SecureTestEnvironmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
