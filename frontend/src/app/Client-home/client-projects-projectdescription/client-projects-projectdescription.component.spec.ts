import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientProjectsProjectdescriptionComponent } from './client-projects-projectdescription.component';

describe('ClientProjectsProjectdescriptionComponent', () => {
  let component: ClientProjectsProjectdescriptionComponent;
  let fixture: ComponentFixture<ClientProjectsProjectdescriptionComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ClientProjectsProjectdescriptionComponent]
    });
    fixture = TestBed.createComponent(ClientProjectsProjectdescriptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
