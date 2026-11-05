import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClSignupComponent } from './cl-signup.component';

describe('ClSignupComponent', () => {
  let component: ClSignupComponent;
  let fixture: ComponentFixture<ClSignupComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ClSignupComponent]
    });
    fixture = TestBed.createComponent(ClSignupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
