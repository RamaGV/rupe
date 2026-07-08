// src/app/features/glosario/glosario.ts
import { Component } from '@angular/core';

@Component({ selector: 'app-glosario', standalone: true, templateUrl: './glosario.html' })
export class Glosario {
  terminos = [
    ['Licitación Pública (LP)', 'El procedimiento más abierto: cualquier empresa puede ofertar. Obligatorio a partir de ciertos montos.'],
    ['Licitación Abreviada (LA)', 'Como la pública pero con plazos y montos menores; el organismo invita y también se puede ofertar.'],
    ['Compra Directa (CD)', 'Compras de bajo monto sin competencia formal. Son la gran mayoría en cantidad (no en dinero).'],
    ['Llamado / Convocatoria', 'La publicación con la que un organismo anuncia qué quiere comprar y hasta cuándo recibe ofertas.'],
    ['Adjudicación', 'La resolución que dice quién ganó y por cuánto. Puede ser total, parcial o declararse desierta.'],
    ['Inciso', 'El código presupuestal de cada organismo del Estado (ej: 66 = OSE, 98 = Intendencia de Montevideo).'],
    ['Unidad Ejecutora (UE)', 'La repartición del organismo que ejecuta la compra (ej: dentro del inciso 2, la OPP es la UE 4).'],
    ['RUPE', 'Registro Único de Proveedores del Estado: toda empresa que quiera venderle al Estado debe inscribirse.'],
    ['ARCE', 'Agencia Reguladora de Compras Estatales: publica los datos oficiales que usa este boletín.'],
    ['Apertura electrónica', 'Las ofertas se presentan y abren en línea, sin acto presencial.'],
    ['Pliego', 'El documento con las condiciones del llamado: qué se compra, requisitos, criterios de evaluación.'],
    ['Vigente', 'En este boletín: que todavía se puede ofertar (el plazo de recepción no venció).'],
  ];
}
