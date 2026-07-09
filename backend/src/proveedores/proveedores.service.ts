// backend/src/proveedores/proveedores.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { PROVEEDORES_REPOSITORY } from '../ingesta/repositories/proveedores-repository.interface';
import type {
  ProveedoresRepository,
  FiltrosProveedor,
} from '../ingesta/repositories/proveedores-repository.interface';
import { ProveedorRupe, ProveedorPublico, PerfilEmpresa } from '../shared/types';
import { EstadoProveedor, TipoDocumento } from '../shared/types/enums';
import { LicitacionesService } from '../licitaciones/licitaciones.service';

// El repositorio habla el idioma del DOMINIO (ProveedorRupe completo,
// con fechaIngesta); este service es la frontera con la API y traduce
// a la vista pública. El rest operator excluye el campo sin listar los
// demás a mano — si el dominio gana campos, la vista los hereda sola.
function aPublico({ fechaIngesta: _, ...publico }: ProveedorRupe): ProveedorPublico {
  return publico;
}

@Injectable()
export class ProveedoresService {
  constructor(
    @Inject(PROVEEDORES_REPOSITORY)
    private readonly repository: ProveedoresRepository,
    private readonly licitacionesService: LicitacionesService,
  ) {}

  async buscar(filtros: FiltrosProveedor) {
    const pagina = await this.repository.buscar(filtros);
    return { ...pagina, datos: pagina.datos.map(aPublico) };
  }

  async findByDocumento(numeroDocumento: string): Promise<ProveedorPublico | null> {
    const proveedor = await this.repository.findByDocumento(numeroDocumento);
    return proveedor && aPublico(proveedor);
  }

  // Para el informe de empresa: historial completo (hasta 500)
  adjudicaciones(numeroDocumento: string) {
    return this.licitacionesService.adjudicacionesDeProveedor(numeroDocumento);
  }

  // CSV del historial — dialecto reportero (; y BOM, como el export)
  async adjudicacionesCsv(numeroDocumento: string): Promise<string> {
    const filas = await this.adjudicaciones(numeroDocumento);
    const celda = (v: unknown): string => {
      if (v === undefined || v === null) return '';
      const s = v instanceof Date ? v.toISOString() : String(v);
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const cabecera = ['licitacionId', 'numeroCompra', 'anio', 'tipo', 'descripcion', 'organismo', 'montoTotal', 'moneda', 'fechaAdjudicacion'].join(';');
    const cuerpo = filas.map((l: any) => [
      l.id, l.numeroCompra, l.anio, l.tipo, l.descripcion,
      l.organismo?.nombreInciso, l.adjudicacion?.montoTotal,
      l.adjudicacion?.moneda, l.adjudicacion?.fechaAdjudicacion,
    ].map(celda).join(';'));
    return '﻿' + [cabecera, ...cuerpo].join('\r\n');
  }

  // El perfil de empresa: identidad desde RUPE (CSV) + historial de
  // adjudicaciones desde Mongo (dumps OCDS). Dos fuentes, una vista.
  async getPerfil(numeroDocumento: string): Promise<PerfilEmpresa | null> {
    const [proveedor, resumen] = await Promise.all([
      this.repository.findByDocumento(numeroDocumento),
      this.licitacionesService.resumenAdjudicacionesPorProveedor(numeroDocumento),
    ]);

    // Si no está en RUPE pero SÍ ganó licitaciones (empresas extranjeras,
    // registros viejos), armamos la identidad desde las adjudicaciones —
    // perder el historial por no estar en el CSV sería tirar información.
    if (!proveedor && resumen.totalLicitacionesGanadas === 0) return null;

    const identidad: ProveedorPublico = proveedor
      ? aPublico(proveedor)
      : {
          tipoDocumento: TipoDocumento.GENERICO,
          numeroDocumento,
          razonSocial:
            resumen.ultimasAdjudicaciones[0]?.razonSocial ?? '(no inscripto en RUPE)',
          estado: EstadoProveedor.DESCONOCIDO,
          pais: '',
          urlOrigen: '',
        };

    return { ...identidad, ...resumen };
  }
}
