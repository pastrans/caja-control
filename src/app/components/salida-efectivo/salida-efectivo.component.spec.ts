import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalidaEfectivoComponent } from './salida-efectivo.component';

describe('SalidaEfectivoComponent', () => {
  let component: SalidaEfectivoComponent;
  let fixture: ComponentFixture<SalidaEfectivoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalidaEfectivoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SalidaEfectivoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
