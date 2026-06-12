import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AbrirCajaComponent } from './abrir-caja.component';

describe('AbrirCajaComponent', () => {
  let component: AbrirCajaComponent;
  let fixture: ComponentFixture<AbrirCajaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbrirCajaComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AbrirCajaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
