import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubDomainComponent } from './sub-domain.component';

describe('SubDomainComponent', () => {
  let component: SubDomainComponent;
  let fixture: ComponentFixture<SubDomainComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SubDomainComponent]
    });
    fixture = TestBed.createComponent(SubDomainComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
