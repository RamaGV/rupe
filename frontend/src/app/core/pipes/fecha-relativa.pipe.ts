// src/app/core/pipes/fecha-relativa.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

// {{ lic.fechaRecepcionOfertas | fechaRelativa }} → "en 3 días" / "mañana"
// / "hoy" / "hace 2 días". Complementa a la fecha absoluta, no la
// reemplaza: el ojo decide urgencia con la relativa y agenda con la exacta.
@Pipe({ name: 'fechaRelativa', standalone: true })
export class FechaRelativaPipe implements PipeTransform {
  transform(fecha?: string | Date | null): string {
    if (!fecha) return '';
    const objetivo = new Date(fecha).getTime();
    if (Number.isNaN(objetivo)) return '';

    // diferencia en días CALENDARIO (medianoche a medianoche), no en
    // bloques de 24h: a las 23:00, "mañana 9:00" debe decir "mañana",
    // no "hoy" por estar a menos de 24 horas.
    const hoy = new Date();
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
    const f = new Date(fecha);
    const inicioObjetivo = new Date(f.getFullYear(), f.getMonth(), f.getDate()).getTime();
    const dias = Math.round((inicioObjetivo - inicioHoy) / 86_400_000);

    if (dias === 0) return 'hoy';
    if (dias === 1) return 'mañana';
    if (dias === -1) return 'ayer';
    if (dias > 1) return `en ${dias} días`;
    return `hace ${-dias} días`;
  }
}
