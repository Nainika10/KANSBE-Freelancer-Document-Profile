import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientPostProjectComponent } from './client-post-project.component';

describe('ClientPostProjectComponent', () => {
  let component: ClientPostProjectComponent;
  let fixture: ComponentFixture<ClientPostProjectComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ClientPostProjectComponent]
    });
    fixture = TestBed.createComponent(ClientPostProjectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
