import { TestBed } from '@angular/core/testing';

import { ServiciosQuiniela } from './servicios-quiniela';

describe('ServiciosQuiniela', () => {
  let service: ServiciosQuiniela;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiciosQuiniela);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
