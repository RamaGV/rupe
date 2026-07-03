// backend/src/proveedores/proveedores.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { PROVEEDORES_REPOSITORY } from '../ingesta/repositories/proveedores-repository.interface';
import type {
  ProveedoresRepository,
  FiltrosProveedor,
  PaginaProveedores,
} from '../ingesta/repositories/proveedores-repository.interface';
import { LicitacionesService } from '../licitaciones/licitaciones.service';
import { ProveedorRupe, PerfilEmpresa } from '../shared/types';
import { EstadoProveedor, TipoDocumento } from '../shared/types/enums';

@Injectable()
export class ProveedoresService {
  constructor(
    @Inject(PROVEEDORES_REPOSITORY)
    private readonly repository: ProveedoresRepository,
    private readonly licitacionesService: LicitacionesService,
  ) {}

  buscar(filtros: FiltrosProveedor): Promise<PaginaProveedores> {
    return this.repository.buscar(filtros);
  }

  findByDocumento(numeroDocumento: string): Promise<ProveedorRupe | null> {
    return this.repository.findByDocumento(numeroDocumento);
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

    const identidad: ProveedorRupe = proveedor ?? {
      tipoDocumento: TipoDocumento.GENERICO,
      numeroDocumento,
      razonSocial:
        resumen.ultimasAdjudicaciones[0]?.razonSocial ?? '(no inscripto en RUPE)',
      estado: EstadoProveedor.DESCONOCIDO,
      pais: '',
      urlOrigen: '',
      fechaIngesta: new Date(),
    };

    return { ...identidad, ...resumen };
  }
}