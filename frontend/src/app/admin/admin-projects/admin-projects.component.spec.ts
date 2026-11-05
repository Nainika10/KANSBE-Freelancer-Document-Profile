import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminProjectsComponent } from './admin-projects.component';

describe('AdminProjectsComponent', () => {
  let component: AdminProjectsComponent;
  let fixture: ComponentFixture<AdminProjectsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdminProjectsComponent]
    });
    fixture = TestBed.createComponent(AdminProjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
