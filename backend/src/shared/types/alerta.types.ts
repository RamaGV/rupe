// backend/src/shared/types/alerta.types.ts
import { TipoContratacion, FamiliaArticulo } from './enums';

// Tipos de alerta que puede configurar un usuario
export enum TipoAlerta {
  NUEVO_LLAMADO = 'nuevo_llamado',
  ADJUDICACION = 'adjudicacion',
  VENCIMIENTO = 'vencimiento',
}

// Criterios de filtrado de una alerta
export interface CriteriosAlerta {
  palabrasClave?: string[];
  incisos?: number[];
  tiposContratacion?: TipoContratacion[];
  familias?: FamiliaArticulo[];
  montoMinimo?: number;
  montoMaximo?: number;
}

// Alerta configurada por un usuario
export interface Alerta {
  id: string;
  nombre: string;
  tipo: TipoAlerta;
  criterios: CriteriosAlerta;
  activa: boolean;
  creadaEn: Date;
}