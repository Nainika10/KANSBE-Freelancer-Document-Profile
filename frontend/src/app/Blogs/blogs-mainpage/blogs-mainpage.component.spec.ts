import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlogsMainpageComponent } from './blogs-mainpage.component';

describe('BlogsMainpageComponent', () => {
  let component: BlogsMainpageComponent;
  let fixture: ComponentFixture<BlogsMainpageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BlogsMainpageComponent]
    });
    fixture = TestBed.createComponent(BlogsMainpageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
