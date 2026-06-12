import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-moneda-billetes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './moneda-billetes.component.html',
  styles: ``
})
export class MonedaBilletesComponent {
  @Input() denominationsArray!: FormArray;

  cambiarCantidad(index: number, cambio: number) {
    const control = this.denominationsArray.at(index).get('cantidad');
    if (control) {
      const nuevaCantidad = Math.max(0, control.value + cambio);
      control.setValue(nuevaCantidad);
    }
  }
}
