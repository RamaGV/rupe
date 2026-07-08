// backend/src/licitaciones/dto/radar-precios.dto.ts
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RadarPreciosDto {
  // mínimo 3 caracteres: "a" matchearía media base y el unwind lo paga Mongo
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  texto: string;
}
