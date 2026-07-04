// backend/src/alertas/dto/crear-alerta.dto.ts
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { TipoContratacion } from '../../shared/types/enums';
import { TipoAlerta } from '../../shared/types';

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

  // Solo los tipos CON MOTOR: adjudicación existe en el dominio pero
  // sus datos llegan por el dump OCDS anual — aceptarla sería dejar
  // crear alertas que disparan un año tarde.
  @IsOptional()
  @IsIn([TipoAlerta.NUEVO_LLAMADO, TipoAlerta.VENCIMIENTO])
  tipo?: TipoAlerta;

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
