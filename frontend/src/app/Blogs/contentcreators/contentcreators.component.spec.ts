import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContentcreatorsComponent } from './contentcreators.component';

describe('ContentcreatorsComponent', () => {
  let component: ContentcreatorsComponent;
  let fixture: ComponentFixture<ContentcreatorsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ContentcreatorsComponent]
    });
    fixture = TestBed.createComponent(ContentcreatorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
