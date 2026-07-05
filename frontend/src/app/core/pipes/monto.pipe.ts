// src/app/core/pipes/monto.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

// La moneda viene del backend con el nombre de la codiguera de ARCE
// ("Pesos Uruguayos") — para leer números al lado, la sigla alcanza.
const SIGLAS_MONEDA: Record<string, string> = {
  'Pesos Uruguayos': 'UYU',
  'Dólares': 'USD',
  'Euros': 'EUR',
  'Unidades Indexadas': 'UI',
};

// {{ 12345678 | monto:'Pesos Uruguayos' }} → "12.345.678 UYU"
// Intl.NumberFormat con es-UY: puntos de miles como se leen acá,
// sin registrar locales de Angular (el runtime del navegador ya lo sabe).
@Pipe({ name: 'monto', standalone: true })
export class MontoPipe implements PipeTransform {
  private formato = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 });

  transform(valor?: number | null, moneda?: string | null): string {
    if (valor === undefined || valor === null) return '—';
    const numero = this.formato.format(valor);
    if (!moneda) return numero;
    return `${numero} ${SIGLAS_MONEDA[moneda] ?? moneda}`;
  }
}
