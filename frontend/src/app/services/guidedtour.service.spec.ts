import { TestBed } from '@angular/core/testing';

import { GuidedtourService } from './guidedtour.service';

describe('GuidedtourService', () => {
  let service: GuidedtourService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GuidedtourService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
