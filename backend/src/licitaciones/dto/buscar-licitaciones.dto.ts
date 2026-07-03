// backend/src/licitaciones/dto/buscar-licitaciones.dto.ts
//
// DTO = Data Transfer Object: la forma DECLARADA de la query. Con el
// ValidationPipe global (main.ts), NestJS valida y convierte cada request
// contra esta clase ANTES de que llegue al controller:
//   - ?page=abc        → 400 con mensaje claro, el controller ni se entera
//   - ?estado=vigente  → llega tipado como EstadoLlamado
//   - ?hack=1          → se elimina (whitelist: true)
// Los query params llegan siempre como string: @Type(() => Number) le dice
// a class-transformer cómo convertirlos antes de validar.

import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EstadoLlamado, TipoContratacion } from '../../shared/types/enums';

export enum OrdenLicitaciones {
  RECIENTES = 'recientes', // fecha de publicación, nuevas primero
  CIERRE = 'cierre', // próximas a cerrar primero
  MONTO = 'monto', // mayor monto adjudicado primero
}

export class BuscarLicitacionesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100) // nadie necesita más de 100 por página; protege a Mongo
  limit: number = 20;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  texto?: string;

  @IsOptional()
  @IsEnum(EstadoLlamado, { message: 'estado debe ser: vigente, adjudicado, desierto o sin_efecto' })
  estado?: EstadoLlamado;

  @IsOptional()
  @IsEnum(TipoContratacion)
  tipo?: TipoContratacion;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2002) // los dumps OCDS arrancan en 2002
  @Max(2100)
  anio?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  inciso?: number;

  @IsOptional()
  @IsEnum(OrdenLicitaciones)
  orden: OrdenLicitaciones = OrdenLicitaciones.RECIENTES;
}
