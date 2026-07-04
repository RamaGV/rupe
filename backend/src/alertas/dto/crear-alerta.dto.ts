// backend/src/alertas/dto/crear-alerta.dto.ts
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { TipoContratacion } from '../../shared/types/enums';

// Criterios que el motor SABE matchear (ver alerta.schema.ts: monto y
// familias quedan fuera a propósito — el RSS no los trae).
export class CriteriosAlertaDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  palabrasClave?: string[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  incisos?: number[];

  @IsOptional()
  @IsArray()
  @IsEnum(TipoContratacion, { each: true })
  tiposContratacion?: TipoContratacion[];
}

export class CrearAlertaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  // El tipo NO se pide: hoy el único motor implementado es NUEVO_LLAMADO
  // (vencimiento/adjudicación llegarán con su propio motor). Aceptarlo
  // en el body sería dejar crear alertas que nunca disparan.

  @ValidateNested()
  @Type(() => CriteriosAlertaDto)
  criterios: CriteriosAlertaDto;
}

export class ActualizarAlertaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => CriteriosAlertaDto)
  criterios?: CriteriosAlertaDto;
}
