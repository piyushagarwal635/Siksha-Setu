import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EducatorDashboardComponent } from './educator-dashboard.component';

describe('EducatorDashboardComponent', () => {
  let component: EducatorDashboardComponent;
  let fixture: ComponentFixture<EducatorDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EducatorDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EducatorDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
