import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonedaBilletesComponent } from './moneda-billetes.component';

describe('MonedaBilletesComponent', () => {
  let component: MonedaBilletesComponent;
  let fixture: ComponentFixture<MonedaBilletesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonedaBilletesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MonedaBilletesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
