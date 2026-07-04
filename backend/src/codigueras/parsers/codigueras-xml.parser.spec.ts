// backend/src/codigueras/parsers/codigueras-xml.parser.spec.ts
//
// Fixtures COPIADAS TAL CUAL de las codigueras reales descargadas de
// comprasestatales.gub.uy (2026-07-03), ya decodificadas de latin1 —
// incluyen los vicios reales: doble espacio en nombres oficiales,
// espacios al borde, y las variantes del marcador "NO VIGENTE".

import {
  normalizarNombreOrganismo,
  parsearIncisosXml,
  parsearUnidadesEjecutorasXml,
} from './codigueras-xml.parser';

const XML_INCISOS = `<?xml version="1.0" encoding="ISO-8859-1"?>
<!DOCTYPE incisos SYSTEM "http://www.comprasestatales.gub.uy/Documentos/DTD/incisos.dtd">
<incisos><inciso id-inciso="2" nom-inciso="Presidencia de la República" /><inciso id-inciso="8" nom-inciso="Ministerio de Industria, Energía  y Minería" /><inciso id-inciso="66" nom-inciso="Administración de las Obras Sanitarias del Estado" /></incisos>`;

const XML_UNIDADES = `<?xml version="1.0" encoding="ISO-8859-1"?>
<!DOCTYPE unidades-ejecutoras SYSTEM "http://www.comprasestatales.gub.uy/Documentos/DTD/unidades-ejecutoras.dtd">
<unidades-ejecutoras><unidad-ejecutora id-inciso="2" id-ue="1" nom-ue=" Presidencia de la República y Unidades Dependientes" /><unidad-ejecutora id-inciso="2" id-ue="5" nom-ue="NO VIGENTE - Dirección de Proyectos de Desarrollo" /><unidad-ejecutora id-inciso="26" id-ue="4" nom-ue="Ex-Comisión Nacional de Educación Física NO VIGENTE" /></unidades-ejecutoras>`;

describe('parsearIncisosXml', () => {
  it('extrae código y nombre de cada inciso', () => {
    const incisos = parsearIncisosXml(XML_INCISOS);

    expect(incisos).toHaveLength(3);
    expect(incisos[0]).toEqual({ codigo: 2, nombre: 'Presidencia de la República' });
    expect(incisos[2]).toEqual({
      codigo: 66,
      nombre: 'Administración de las Obras Sanitarias del Estado',
    });
  });

  it('lanza error si el XML no es la codiguera (alarma de calidad de datos)', () => {
    expect(() => parsearIncisosXml('<html>error 500</html>')).toThrow(
      /no tiene la estructura/,
    );
  });
});

describe('parsearUnidadesEjecutorasXml', () => {
  it('extrae inciso, código y nombre recortado', () => {
    const ues = parsearUnidadesEjecutorasXml(XML_UNIDADES);

    expect(ues).toHaveLength(3);
    // el nombre real viene con espacio inicial en la codiguera
    expect(ues[0]).toEqual({
      inciso: 2,
      codigo: 1,
      nombre: 'Presidencia de la República y Unidades Dependientes',
      vigente: true,
    });
  });

  it('marca vigente:false con el prefijo "NO VIGENTE - " (la variante más común)', () => {
    const ues = parsearUnidadesEjecutorasXml(XML_UNIDADES);

    expect(ues[1].vigente).toBe(false);
    // el nombre se conserva tal cual: hay 6 variantes reales del marcador
    // y extirparlas con regex corrompería nombres en silencio
    expect(ues[1].nombre).toBe('NO VIGENTE - Dirección de Proyectos de Desarrollo');
  });

  it('detecta el marcador incrustado al FINAL del nombre (variante real)', () => {
    const ues = parsearUnidadesEjecutorasXml(XML_UNIDADES);

    expect(ues[2].vigente).toBe(false);
  });
});

describe('normalizarNombreOrganismo', () => {
  it('hace matchear el RSS viejo sin tilde contra la codiguera oficial', () => {
    // par REAL: título viejo del RSS vs nom-inciso de la codiguera
    expect(normalizarNombreOrganismo('Presidencia de la Republica')).toBe(
      normalizarNombreOrganismo('Presidencia de la República'),
    );
  });

  it('colapsa el doble espacio que trae la codiguera oficial', () => {
    // "Energía  y" (doble espacio) es literal de la codiguera real
    expect(normalizarNombreOrganismo('Ministerio de Industria, Energía  y Minería')).toBe(
      'ministerio de industria, energia y mineria',
    );
  });

  it('ignora mayúsculas y espacios al borde', () => {
    expect(normalizarNombreOrganismo('  PODER JUDICIAL ')).toBe('poder judicial');
  });
});
