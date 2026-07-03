// backend/src/ingesta/repositories/proveedores-csv.repository.ts
import { Injectable, Logger } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { ProveedoresRepository } from './proveedores-repository.interface';
import type { FiltrosProveedor, PaginaProveedores } from './proveedores-repository.interface';
import { ProveedorRupe } from '../../shared/types';
import { parsearFilaRupe, FilaCsvRupe  } from '../parsers/rupe-csv.parser';

@Injectable()
export class ProveedoresCsvRepository implements ProveedoresRepository {
  private readonly logger = new Logger(ProveedoresCsvRepository.name);
  private readonly dataDir = join(process.cwd(), 'data', 'rupe');

  // Cache en memoria: leemos el CSV una sola vez al arrancar,
  // no en cada request. Los archivos CSV fijos no cambian en runtime.
  private cache: ProveedorRupe[] | null = null;

  async buscar(filtros: FiltrosProveedor): Promise<PaginaProveedores> {
    const { page = 1, limit = 20, texto } = filtros;
    const todos = await this.todosEnCache();

    // Filtro en memoria: aceptable mientras la fuente sea el CSV cacheado.
    // En el adaptador Mongo esto será un find() con índice de texto.
    const termino = texto?.trim().toLowerCase();
    const filtrados = termino
      ? todos.filter(
          (p) =>
            p.razonSocial.toLowerCase().includes(termino) ||
            p.numeroDocumento.includes(termino),
        )
      : todos;

    const inicio = (page - 1) * limit;
    return {
      datos: filtrados.slice(inicio, inicio + limit),
      total: filtrados.length,
      page,
      totalPaginas: Math.ceil(filtrados.length / limit),
    };
  }

  async findByDocumento(numeroDocumento: string): Promise<ProveedorRupe | null> {
    const todos = await this.todosEnCache();
    return todos.find((p) => p.numeroDocumento === numeroDocumento) ?? null;
  }

  private async todosEnCache(): Promise<ProveedorRupe[]> {
    if (!this.cache) {
      this.cache = this.cargarDesdeDisco();
    }
    return this.cache;
  }

  private cargarDesdeDisco(): ProveedorRupe[] {
    const archivos = readdirSync(this.dataDir).filter((f) => f.endsWith('.csv'));

    if (archivos.length === 0) {
      this.logger.warn(`No se encontraron archivos CSV en ${this.dataDir}`);
      return [];
    }

    const resultado: ProveedorRupe[] = [];

    for (const archivo of archivos) {
      const rutaCompleta = join(this.dataDir, archivo);
      const contenido = readFileSync(rutaCompleta, 'latin1');

        const filas: FilaCsvRupe[] = parse(contenido, {
            columns: true,
            delimiter: ';',
            skip_empty_lines: true,
            trim: true,
        });


      for (const fila of filas) {
        resultado.push(parsearFilaRupe(fila, `file://${archivo}`));
      }

      this.logger.log(`Cargadas ${filas.length} filas desde ${archivo}`);
    }

    return resultado;
  }
}