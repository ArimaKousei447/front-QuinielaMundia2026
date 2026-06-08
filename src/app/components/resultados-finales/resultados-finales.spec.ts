import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultadosFinales } from './resultados-finales';

describe('ResultadosFinales', () => {
  let component: ResultadosFinales;
  let fixture: ComponentFixture<ResultadosFinales>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultadosFinales]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResultadosFinales);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
