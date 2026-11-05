import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HowKansbeWorksComponent } from './how-kansbe-works.component';

describe('HowKansbeWorksComponent', () => {
  let component: HowKansbeWorksComponent;
  let fixture: ComponentFixture<HowKansbeWorksComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [HowKansbeWorksComponent]
    });
    fixture = TestBed.createComponent(HowKansbeWorksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
