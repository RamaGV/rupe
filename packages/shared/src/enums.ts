// backend/src/shared/types/enums.ts

export enum TipoContratacion {
  ARRENDAMIENTO_OBRA = 'Arrendamiento de Obra',
  COMPRA_PUBLICA_INNOVADORA = 'Compra Pública Innovadora',
  COMPRA_DIRECTA = 'Compra Directa',
  COMPRA_POR_EXCEPCION = 'Compra por Excepción',
  CONCESION = 'Concesión',
  CONCURSO_DE_PRECIOS = 'Concurso de Precios',
  CONVENIO_MARCO = 'Convenio Marco',
  DIALOGO_TECNICO = 'Diálogo Técnico',
  LICITACION_ABREVIADA = 'Licitación Abreviada',
  LICITACION_PUBLICA = 'Licitación Pública',
  EXPRESIONES_DE_INTERES = 'Llamado a Expresiones de Interés',
  PREGON = 'Pregón',
  PROCEDIMIENTO_ESPECIAL = 'Procedimiento Especial',
  SOLICITUD_DE_INFORMACION = 'Solicitud de Información',
  VENTA_CONCURSO = 'Venta/Arrendamiento Concurso de Precios',
  VENTA_DIRECTA = 'Venta/Arrendamiento Directa',
  VENTA_LICITACION_ABREVIADA = 'Venta/Arrendamiento Licitación Abreviada',
  VENTA_LICITACION_PUBLICA = 'Venta/Arrendamiento Licitación Pública',
  VENTA_POR_EXCEPCION = 'Venta/Arrendamiento por Excepción',
  VENTA_POR_REMATE = 'Venta/Arrendamiento por Remate',
  // Variantes PFI (financiamiento internacional) — aparecen en los dumps
  // OCDS 2025 (107 llamados) y en el RSS con el prefijo "PFI - "
  PFI_COMPARACION_PRECIOS = 'PFI - Comparación de precios',
  PFI_CONTRATACION_DIRECTA = 'PFI - Contratación directa',
  PFI_LICITACION_PUBLICA_NACIONAL = 'PFI - Licitación pública nacional',
  PFI_LICITACION_PUBLICA_INTERNACIONAL = 'PFI - Licitación pública internacional',
}

// Estados de resolución reales del portal ARCE
export enum EstadoResolucion {
  ADJUDICADA_TOTALMENTE = 'Adjudicada totalmente',
  ADJUDICADA_PARCIALMENTE = 'Adjudicada parcialmente',
  DECLARADA_DESIERTA = 'Declarada desierta',
  DECLARADA_SIN_EFECTO = 'Declarada sin efecto',
  LISTA_CORTA_SELECCIONADA = 'Lista corta seleccionada',
  RESULTADO_CONVOCATORIA = 'Resultado de la convocatoria',
  OFERTAS_RECHAZADAS = 'Todas las ofertas rechazadas',
  ADJUDICACION_HABILITADOS = 'Adjudicación de Proveedores habilitados',
}

// Estado general del llamado (se infiere del portal)
export enum EstadoLlamado {
  VIGENTE = 'vigente',
  ADJUDICADO = 'adjudicado',
  DESIERTO = 'desierto',
  SIN_EFECTO = 'sin_efecto',
}

// Monedas utilizadas en Uruguay
export enum Moneda {
  PESOS_URUGUAYOS = 'Pesos Uruguayos',
  DOLARES = 'Dólares',
  EUROS = 'Euros',
  UI = 'Unidades Indexadas',
}

// Familias de artículos reales del catálogo ARCE
export enum FamiliaArticulo {
  MATERIALES_SUMINISTROS = 2,
  SERVICIOS_NO_PERSONALES = 3,
  MAQUINAS_EQUIPOS_MOBILIARIOS = 4,
  TIERRAS_EDIFICIOS = 5,
  CONSTRUCCIONES_MEJORAS = 6,
  BIENES_TIC = 10,
  EXCLUIDOS_CATALOGO = 12,
}

// Tipo de documento para proveedores
export enum TipoDocumento {
  RUT = 'RUT',
  CEDULA = 'Cédula',
  CEDULA_EXTRANJERA = 'Cédula Extranjera',
  PASAPORTE = 'Pasaporte',
  EMPRESA_EXTRANJERA = 'Empresa Extranjera',
  GENERICO = 'Genérico',
}

// Estado del proveedor en RUPE
export enum EstadoProveedor {
  ACTIVO = 'ACTIVO',
  EN_INGRESO = 'EN INGRESO',
  BAJA_DGI = 'BAJA DGI',
  DESCONOCIDO = 'DESCONOCIDO',
}