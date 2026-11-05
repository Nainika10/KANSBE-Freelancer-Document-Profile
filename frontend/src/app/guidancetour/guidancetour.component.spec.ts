import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuidancetourComponent } from './guidancetour.component';

describe('GuidancetourComponent', () => {
  let component: GuidancetourComponent;
  let fixture: ComponentFixture<GuidancetourComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GuidancetourComponent]
    });
    fixture = TestBed.createComponent(GuidancetourComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
