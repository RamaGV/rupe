// backend/src/licitaciones/parsers/rss-llamado.parser.spec.ts
//
// Los fixtures son items REALES del feed de ARCE (auditoría 2026-07),
// no ejemplos inventados — disciplina "datos reales, no supuestos".

import {
  extraerIdDeLink,
  extraerNumeroYAnio,
  extraerOrganismo,
  mapearItemALicitacion,
  RssItemRaw,
} from './rss-llamado.parser';

describe('extraerIdDeLink', () => {
  it('extrae un id numérico (llamado nativo del SICE)', () => {
    expect(
      extraerIdDeLink('http://www.comprasestatales.gub.uy/consultas/detalle/id/1352393'),
    ).toBe('1352393');
  });

  it('extrae un id con prefijo "i" (llamado importado — BUG-1)', () => {
    // 156 items del feed real usan este formato (IM, OSE, ANP, ANCAP...)
    expect(
      extraerIdDeLink('http://www.comprasestatales.gub.uy/consultas/detalle/id/i494938'),
    ).toBe('i494938');
  });

  it('conserva el prefijo: el id es un identificador externo opaco', () => {
    // "i495595" y "495595" podrían ser llamados DISTINTOS (espacios de
    // numeración independientes) — quitar la "i" rompería la unicidad
    // del upsert y la reconstrucción de la URL de detalle.
    expect(
      extraerIdDeLink('http://www.comprasestatales.gub.uy/consultas/detalle/id/i495595'),
    ).not.toBe('495595');
  });

  it('soporta el formato viejo con segmentos intermedios', () => {
    expect(
      extraerIdDeLink(
        'http://www.comprasestatales.gub.uy/consultas/detalle/mostrar-llamado/1/id/35538',
      ),
    ).toBe('35538');
  });

  it('tolera una barra final', () => {
    expect(
      extraerIdDeLink('http://www.comprasestatales.gub.uy/consultas/detalle/id/1352393/'),
    ).toBe('1352393');
  });

  it('lanza error si el link no tiene segmento /id/ (alarma de calidad de datos)', () => {
    expect(() =>
      extraerIdDeLink('http://www.comprasestatales.gub.uy/consultas/detalle/otro/123'),
    ).toThrow(/No se pudo extraer el id/);
  });
});

describe('extraerNumeroYAnio', () => {
  // Formas reales del feed 2026-07: 827 solo dígitos (1 a 10 de largo),
  // 132 con prefijo de letra, 8 con prefijo y sufijo, 4 de 10 dígitos (ANCAP).

  it('extrae un número estándar', () => {
    expect(extraerNumeroYAnio('Licitación Abreviada 28907/2026 - ANP | ANP')).toEqual({
      numeroCompra: '28907/2026',
      anio: 2026,
    });
  });

  it('extrae números cortos (antes quedaban vacíos)', () => {
    expect(
      extraerNumeroYAnio('Licitación Pública 2/2025 - Ministerio de Economía y Finanzas | DNA'),
    ).toEqual({ numeroCompra: '2/2025', anio: 2025 });
  });

  it('conserva el prefijo de letra de los importados', () => {
    expect(
      extraerNumeroYAnio('Licitación Abreviada A190700/2026 - Intendencia de Montevideo | IM'),
    ).toEqual({ numeroCompra: 'A190700/2026', anio: 2026 });
  });

  it('conserva prefijo Y sufijo de letra', () => {
    expect(
      extraerNumeroYAnio('Licitación Abreviada A185165A/2026 - Intendencia de Montevideo | IM'),
    ).toEqual({ numeroCompra: 'A185165A/2026', anio: 2026 });
  });

  it('no trunca números de 10 dígitos (antes: "2341046600" → "1046600")', () => {
    expect(
      extraerNumeroYAnio('Compra Directa 2341046600/2026 - ANCAP | ANCAP'),
    ).toEqual({ numeroCompra: '2341046600/2026', anio: 2026 });
  });

  it('devuelve numeroCompra vacío si no hay número (degradación tolerable, no error)', () => {
    const resultado = extraerNumeroYAnio('Título sin número de compra | Organismo');
    expect(resultado.numeroCompra).toBe('');
  });
});

describe('extraerOrganismo', () => {
  it('aísla el nombre del inciso con el separador " - " actual (antes quedaba "- " colgando)', () => {
    expect(
      extraerOrganismo(
        'Licitación Abreviada 28907/2026 - Administración Nacional de Puertos | Administración Nacional de Puertos',
      ),
    ).toEqual({
      inciso: 0,
      nombreInciso: 'Administración Nacional de Puertos',
      unidadEjecutora: 'Administración Nacional de Puertos',
    });
  });

  it('sigue soportando el formato viejo sin guion', () => {
    expect(
      extraerOrganismo(
        'Licitación Abreviada 202606/2026 Presidencia de la Republica | Presidencia de la República y Unidades Dependientes',
      ),
    ).toEqual({
      inciso: 0,
      nombreInciso: 'Presidencia de la Republica',
      unidadEjecutora: 'Presidencia de la República y Unidades Dependientes',
    });
  });

  it('maneja títulos con guiones previos al número (ej. "PFI - ...")', () => {
    const resultado = extraerOrganismo(
      'PFI - Licitación pública nacional 25551/2026 - Administración de las Obras Sanitarias del Estado | Administración de las Obras Sanitarias del Estado',
    );
    expect(resultado.nombreInciso).toBe('Administración de las Obras Sanitarias del Estado');
  });

  it('conserva el prefijo de letra al cortar (no debe quedar la "A" huérfana)', () => {
    const resultado = extraerOrganismo(
      'Licitación Abreviada A190700/2026 - Intendencia de Montevideo | Intendencia de Montevideo',
    );
    expect(resultado.nombreInciso).toBe('Intendencia de Montevideo');
  });
});

describe('mapearItemALicitacion', () => {
  // Item real del feed: llamado nativo (Intendencia de Colonia)
  const itemNativo: RssItemRaw = {
    title:
      'Llamado a Expresiones de Interés 14339/2026 - Intendencia de Colonia | Intendencia de Colonia',
    link: 'http://www.comprasestatales.gub.uy/consultas/detalle/id/1352393',
    description:
      'Terminal de ómnibus de la ciudad de Carmelo\n Recepción de ofertas hasta: 30/09/2026 15:00hs',
    pubDate: 'Tue, 30 Jun 2026 11:55:16 -0300',
  };

  // Item real del feed: llamado importado (OSE) — los que fallaban en BUG-1
  const itemImportado: RssItemRaw = {
    title:
      'PFI - Licitación pública nacional 25551/2026 - Administración de las Obras Sanitarias del Estado | Administración de las Obras Sanitarias del Estado',
    link: 'http://www.comprasestatales.gub.uy/consultas/detalle/id/i494938',
    description:
      'LICITACION PÚBLICA NACIONAL Nº 25.551 ,, OBRAS DE SISTEMAS DE POTABILIZACIÓN\n Recepción de ofertas hasta: 10/08/2026 11:00hs',
    pubDate: 'Mon, 22 Jun 2026 14:24:24 -0300',
  };

  it('mapea un llamado nativo completo', () => {
    const resultado = mapearItemALicitacion(itemNativo);

    expect(resultado.id).toBe('1352393');
    expect(resultado.numeroCompra).toBe('14339/2026');
    expect(resultado.anio).toBe(2026);
    expect(resultado.urlOrigen).toBe(itemNativo.link);
    expect(resultado.fechaRecepcionOfertas).toEqual(new Date(2026, 8, 30, 15, 0));
  });

  it('mapea un llamado importado sin lanzar error (fix BUG-1)', () => {
    const resultado = mapearItemALicitacion(itemImportado);

    expect(resultado.id).toBe('i494938');
    expect(resultado.urlOrigen).toBe(itemImportado.link);
  });
});
