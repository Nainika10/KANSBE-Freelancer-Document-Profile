import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AboutKansbeComponent } from './about-kansbe.component';

describe('AboutKansbeComponent', () => {
  let component: AboutKansbeComponent;
  let fixture: ComponentFixture<AboutKansbeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AboutKansbeComponent]
    });
    fixture = TestBed.createComponent(AboutKansbeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
