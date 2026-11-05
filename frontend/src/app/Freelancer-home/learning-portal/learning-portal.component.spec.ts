import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LearningPortalComponent } from './learning-portal.component';

describe('LearningPortalComponent', () => {
  let component: LearningPortalComponent;
  let fixture: ComponentFixture<LearningPortalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LearningPortalComponent]
    });
    fixture = TestBed.createComponent(LearningPortalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
