import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoEditorsComponent } from './video-editors.component';

describe('VideoEditorsComponent', () => {
  let component: VideoEditorsComponent;
  let fixture: ComponentFixture<VideoEditorsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VideoEditorsComponent]
    });
    fixture = TestBed.createComponent(VideoEditorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
