import { FormArray, FormBuilder } from '@angular/forms';

export class DenominationsUtils {
  
  /**
   * Construye el FormArray con el orden adecuado dependiendo de la pantalla.
   * Se considera 'Desktop' a pantallas mayores a 576px (Breakpoint 'sm' de Bootstrap)
   */
  static build(fb: FormBuilder): FormArray {
    const isDesktop = window.innerWidth >= 576; 

    // Orden en Zig-Zag para 2 columnas vs Orden descendente para 1 columna
    const valores = isDesktop 
      ? [100.00, 1.00, 50.00, 0.25, 20.00, 0.10, 10.00, 0.05, 5.00, 0.01]
      : [100.00, 50.00, 20.00, 10.00, 5.00, 1.00, 0.25, 0.10, 0.05, 0.01];

    return fb.array(
      valores.map(valor => fb.group({ valor: [valor], cantidad: [0] }))
    );
  }

  /**
   * Reinicia a 0 todas las cantidades sin destruir los controles
   * ni alterar el orden en el que fueron creados.
   */
  static clear(formArray: FormArray): void {
    formArray.controls.forEach(ctrl => {
      ctrl.get('cantidad')?.setValue(0);
    });
  }
}