import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WhyKansbeFreelancersComponent } from './why-kansbe-freelancers.component';

describe('WhyKansbeFreelancersComponent', () => {
  let component: WhyKansbeFreelancersComponent;
  let fixture: ComponentFixture<WhyKansbeFreelancersComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WhyKansbeFreelancersComponent]
    });
    fixture = TestBed.createComponent(WhyKansbeFreelancersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
