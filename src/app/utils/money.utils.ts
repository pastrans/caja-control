// Cálculos de dinero en centavos (enteros) para evitar errores de redondeo como 0.1 + 0.2 = 0.30000000000000004.
// Se convierte a dólares solo al mostrar o enviar el resultado.
export class MoneyUtils {

  /**
   * Convierte un monto en dólares (número o texto de un input) a centavos enteros.
   * Valores vacíos o inválidos cuentan como 0.
   */
  static aCentavos(monto: number | string | null | undefined): number {
    const valor = Number(monto);
    return Number.isFinite(valor) ? Math.round(valor * 100) : 0;
  }

  static aDolares(centavos: number): number {
    return centavos / 100;
  }

  /** Suma montos en dólares sin errores de redondeo. */
  static sumar(montos: (number | string | null | undefined)[]): number {
    return this.aDolares(montos.reduce<number>((total, monto) => total + this.aCentavos(monto), 0));
  }

  /** a - b en dólares, exacto a 2 decimales. */
  static restar(a: number | string | null | undefined, b: number | string | null | undefined): number {
    return this.aDolares(this.aCentavos(a) - this.aCentavos(b));
  }

  /** Total de un desglose de billetes y monedas ({ valor, cantidad }). */
  static totalDenominaciones(denominaciones: { valor?: number | null; cantidad?: number | null }[]): number {
    const centavos = denominaciones.reduce(
      (total, d) => total + this.aCentavos(d.valor) * Math.trunc(Number(d.cantidad) || 0),
      0
    );
    return this.aDolares(centavos);
  }
}
