// backend/src/licitaciones/parsers/ocds-release.parser.spec.ts
//
// Fixtures = releases REALES del dump ocds-2025.zip de ARCE
// (catalogodatos.gub.uy, dataset "Datos Históricos de Compras").

import {
  mapearTenderALicitacion,
  mapearAwardALicitacion,
  extraerIdDeOcid,
  OcdsRelease,
} from './ocds-release.parser';
import {
  TipoContratacion,
  EstadoLlamado,
  EstadoResolucion,
  Moneda,
} from '../../shared/types/enums';

// Release real: llamado importado de OSE (l-01-2025.json)
const tenderReal: OcdsRelease = {
  initiationType: 'tender',
  parties: [
    {
      id: '66-1',
      roles: ['buyer', 'procuringEntity'],
      name: 'Administración de las Obras Sanitarias del Estado',
      contactPoint: {
        name: 'Gcia.Gest. Laborat',
        telephone: '19521402',
        email: ' ', // así viene: espacio = vacío
      },
    },
  ],
  tag: ['tender'],
  date: '2025-01-01T23:00:00Z',
  ocid: 'ocds-yfs5dr-i455644',
  id: 'llamado-i455644',
  tender: {
    id: 'i455644',
    procurementMethodDetails: 'Compra Directa',
    title: 'Compra Directa 10082748/2025',
    description: '  Materiales de referencia para Laboratorio',
    tenderPeriod: {
      endDate: '2025-01-10T15:00:00Z',
      startDate: '2025-01-01T23:00:00Z',
    },
    status: 'active',
  },
  buyer: { id: '66-1', name: 'Administración de las Obras Sanitarias del Estado' },
} as OcdsRelease;

// Release real: adjudicación del BSE (a-01-2025.json)
const awardReal: OcdsRelease = {
  parties: [
    { id: '53-1', roles: ['buyer', 'procuringEntity'], name: 'Banco de Seguros del Estado' },
    { id: 'R/214365280014', roles: ['supplier'], name: 'FUNDACION GONZALO (GONCHI) RODRIGUEZ' },
  ],
  tag: ['award'],
  date: '2025-01-01T08:01:00Z',
  ocid: 'ocds-yfs5dr-i455643',
  id: 'adjudicacion-i455643',
  buyer: { id: '53-1', name: 'Banco de Seguros del Estado' },
  awards: [
    {
      id: 'R/214365280014',
      date: '2024-12-31T00:00:00Z',
      status: 'active',
      items: [
        {
          id: 1,
          quantity: 1.0,
          classification: {
            id: '0',
            description: 'SERVICIOS RESPONSABILIDAD SOCIAL - FUNDACIÓN GONZALO RODRIGUEZ',
          },
          unit: { id: '22', name: 'UNIDAD', value: { amount: 320000.0, currency: 'UYU' } },
        },
      ],
      suppliers: [{ id: 'R/214365280014', name: 'FUNDACION GONZALO (GONCHI) RODRIGUEZ' }],
    },
  ],
} as OcdsRelease;

describe('extraerIdDeOcid', () => {
  it('extrae el id del portal desde el ocid (importado)', () => {
    expect(extraerIdDeOcid('ocds-yfs5dr-i455644')).toBe('i455644');
  });

  it('extrae ids numéricos (nativos)', () => {
    expect(extraerIdDeOcid('ocds-yfs5dr-1352393')).toBe('1352393');
  });

  it('lanza error ante un ocid irreconocible', () => {
    expect(() => extraerIdDeOcid('cualquier-cosa')).toThrow(/ocid/);
  });
});

describe('mapearTenderALicitacion', () => {
  it('mapea un tender real completo', () => {
    const lic = mapearTenderALicitacion(tenderReal);

    expect(lic.id).toBe('i455644'); // mismo espacio de ids que el RSS
    expect(lic.numeroCompra).toBe('10082748/2025'); // reusa el parser de BUG-3
    expect(lic.anio).toBe(2025);
    expect(lic.tipo).toBe(TipoContratacion.COMPRA_DIRECTA); // match exacto de codiguera
    expect(lic.estado).toBe(EstadoLlamado.VIGENTE);
    expect(lic.descripcion).toBe('Materiales de referencia para Laboratorio');
    expect(lic.fechaRecepcionOfertas).toEqual(new Date('2025-01-10T15:00:00Z'));
  });

  it('resuelve el inciso real desde el código de party ("66-1" → 66)', () => {
    const lic = mapearTenderALicitacion(tenderReal);
    expect(lic.organismo?.inciso).toBe(66); // el TODO inciso:0 del RSS, resuelto
    expect(lic.organismo?.nombreInciso).toBe(
      'Administración de las Obras Sanitarias del Estado',
    );
  });

  it('normaliza el contacto (email " " → vacío, no basura)', () => {
    const lic = mapearTenderALicitacion(tenderReal);
    expect(lic.contacto?.nombre).toBe('Gcia.Gest. Laborat');
    expect(lic.contacto?.telefono).toBe('19521402');
    expect(lic.contacto?.email).toBe('');
  });

  it('NO setea estado si el release no trae status (tenderUpdate parcial)', () => {
    const update = {
      ...tenderReal,
      tag: ['tenderUpdate'],
      tender: { ...tenderReal.tender!, status: undefined },
    } as OcdsRelease;
    // estado undefined → el servicio lo filtra y el $set no pisa el guardado
    expect(mapearTenderALicitacion(update).estado).toBeUndefined();
  });
});

describe('mapearAwardALicitacion', () => {
  it('mapea una adjudicación real: proveedor, monto y moneda', () => {
    const patch = mapearAwardALicitacion(awardReal);

    expect(patch.id).toBe('i455643');
    expect(patch.estado).toBe(EstadoLlamado.ADJUDICADO);
    expect(patch.adjudicacion?.estado).toBe(EstadoResolucion.ADJUDICADA_TOTALMENTE);
    expect(patch.adjudicacion?.montoTotal).toBe(320000);
    expect(patch.adjudicacion?.moneda).toBe(Moneda.PESOS_URUGUAYOS);
  });

  it('el proveedor queda con la MISMA clave que RUPE (join natural)', () => {
    const patch = mapearAwardALicitacion(awardReal);
    expect(patch.adjudicacion?.proveedor).toEqual({
      tipoDocumento: 'RUT',
      numeroDocumento: '214365280014', // == numeroDocumento en la colección RUPE
      razonSocial: 'FUNDACION GONZALO (GONCHI) RODRIGUEZ',
    });
  });

  it('mapea los items adjudicados', () => {
    const patch = mapearAwardALicitacion(awardReal);
    expect(patch.items).toHaveLength(1);
    expect(patch.items?.[0]).toMatchObject({
      numero: 1,
      cantidad: 1,
      unidad: 'UNIDAD',
      precioUnitario: 320000,
      moneda: Moneda.PESOS_URUGUAYOS,
    });
  });

  it('no inventa montoTotal si los items mezclan monedas', () => {
    const mezclado = JSON.parse(JSON.stringify(awardReal)) as OcdsRelease;
    mezclado.awards![0].items!.push({
      id: 2,
      quantity: 1,
      unit: { name: 'UNIDAD', value: { amount: 100, currency: 'USD' } },
    });
    const patch = mapearAwardALicitacion(mezclado);
    expect(patch.adjudicacion?.montoTotal).toBeUndefined(); // sumar UYU+USD sería mentir
  });
});

// El caso que destapó el bug del organismo vacío: releases SIN buyer
// (aparecen en los dumps reales — el a239659 reportado por el autor).
describe('releases sin buyer', () => {
  it('un award sin buyer NO devuelve organismo (devolver vacio pisaria el bueno)', () => {
    const sinBuyer = JSON.parse(JSON.stringify(awardReal)) as OcdsRelease;
    delete sinBuyer.buyer;

    const patch = mapearAwardALicitacion(sinBuyer);
    expect(patch.organismo).toBeUndefined();
  });

  it('un tender sin buyer tampoco (los minimos del upsert cubren la insercion)', () => {
    const sinBuyer = JSON.parse(JSON.stringify(tenderReal)) as OcdsRelease;
    delete sinBuyer.buyer;

    const lic = mapearTenderALicitacion(sinBuyer);
    expect(lic.organismo).toBeUndefined();
  });
});

// El bug de la ingesta histórica que cazó el autor: 292 llamados viejos
// quedaron como anio=2026 por el fallback "año actual".
describe('tender sin número de compra parseable', () => {
  it('toma el año de la FECHA del llamado, no del reloj de la ingesta', () => {
    const sinNumero = JSON.parse(JSON.stringify(tenderReal)) as OcdsRelease;
    sinNumero.tender!.title = 'Llamado histórico sin número legible';
    sinNumero.tender!.tenderPeriod = { startDate: '2008-05-10T12:00:00Z' };

    const lic = mapearTenderALicitacion(sinNumero);
    expect(lic.numeroCompra).toBe('');
    expect(lic.anio).toBe(2008);
  });
});
