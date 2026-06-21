import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AccessibilityService } from './accessibility.service';
import { UserService } from './user.service';

describe('AccessibilityService', () => {
  let service: AccessibilityService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AccessibilityService, UserService]
    });
    service = TestBed.inject(AccessibilityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
