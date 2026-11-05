import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlSignupComponent } from './fl-signup.component';

describe('FlSignupComponent', () => {
  let component: FlSignupComponent;
  let fixture: ComponentFixture<FlSignupComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FlSignupComponent]
    });
    fixture = TestBed.createComponent(FlSignupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
