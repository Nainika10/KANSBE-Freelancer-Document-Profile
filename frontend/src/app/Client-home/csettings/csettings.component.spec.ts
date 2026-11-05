import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CsettingsComponent } from './csettings.component';

describe('CsettingsComponent', () => {
  let component: CsettingsComponent;
  let fixture: ComponentFixture<CsettingsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CsettingsComponent]
    });
    fixture = TestBed.createComponent(CsettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
