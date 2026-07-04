// backend/src/alertas/matcher/alerta-matcher.spec.ts
//
// El llamado de fixture es REAL: item del feed de ARCE (2026-07-03,
// id 1352393, Intendencia de Colonia), con la forma que deja el parser
// del RSS + el enriquecimiento de inciso de la codiguera.

import { matcheaCriterios, LlamadoMatcheable } from './alerta-matcher';
import { TipoContratacion } from '../../shared/types/enums';

const LLAMADO_REAL: LlamadoMatcheable = {
  tipo: TipoContratacion.EXPRESIONES_DE_INTERES,
  descripcion: 'Terminal de Ómnibus de la ciudad de Carmelo',
  organismo: {
    inciso: 83,
    nombreInciso: 'Intendencia de Colonia',
    unidadEjecutora: 'Intendencia de Colonia',
  },
};

describe('matcheaCriterios', () => {
  describe('palabras clave', () => {
    it('matchea sin importar tildes ni mayúsculas ("omnibus" vs "Ómnibus")', () => {
      expect(matcheaCriterios(LLAMADO_REAL, { palabrasClave: ['omnibus'] })).toBe(true);
    });

    it('matchea por prefijo de palabra ("termina" → "Terminal")', () => {
      expect(matcheaCriterios(LLAMADO_REAL, { palabrasClave: ['termina'] })).toBe(true);
    });

    it('NO matchea en el medio de una palabra ("armelo" no encuentra "Carmelo")', () => {
      expect(matcheaCriterios(LLAMADO_REAL, { palabrasClave: ['armelo'] })).toBe(false);
    });

    it('busca también en el nombre del organismo', () => {
      expect(matcheaCriterios(LLAMADO_REAL, { palabrasClave: ['colonia'] })).toBe(true);
    });

    it('varias palabras son OR: alcanza con que una matchee', () => {
      expect(
        matcheaCriterios(LLAMADO_REAL, { palabrasClave: ['saneamiento', 'terminal'] }),
      ).toBe(true);
    });

    it('el input del usuario se escapa: "c++" no es un regex roto', () => {
      expect(matcheaCriterios(LLAMADO_REAL, { palabrasClave: ['c++'] })).toBe(false);
    });
  });

  describe('incisos y tipos', () => {
    it('matchea si el inciso está en la lista (OR)', () => {
      expect(matcheaCriterios(LLAMADO_REAL, { incisos: [98, 83] })).toBe(true);
    });

    it('NO matchea un llamado con inciso 0 (UCC/UACM) contra una lista de incisos', () => {
      const llamadoUcc = {
        ...LLAMADO_REAL,
        organismo: { inciso: 0, nombreInciso: 'UCC - ASSE', unidadEjecutora: 'UCC - ASSE' },
      };
      expect(matcheaCriterios(llamadoUcc, { incisos: [83] })).toBe(false);
    });

    it('matchea por tipo de contratación', () => {
      expect(
        matcheaCriterios(LLAMADO_REAL, {
          tiposContratacion: [TipoContratacion.EXPRESIONES_DE_INTERES],
        }),
      ).toBe(true);
    });
  });

  describe('combinación de criterios (AND)', () => {
    it('todos los criterios presentes deben cumplirse', () => {
      expect(
        matcheaCriterios(LLAMADO_REAL, { palabrasClave: ['terminal'], incisos: [83] }),
      ).toBe(true);
      // palabra matchea pero el inciso no → AND falla
      expect(
        matcheaCriterios(LLAMADO_REAL, { palabrasClave: ['terminal'], incisos: [98] }),
      ).toBe(false);
    });

    it('un criterio vacío no restringe (no participa del AND)', () => {
      expect(
        matcheaCriterios(LLAMADO_REAL, { palabrasClave: [], incisos: [83] }),
      ).toBe(true);
    });

    it('sin ningún criterio evaluable NO matchea (defensa contra "avisame de todo")', () => {
      expect(matcheaCriterios(LLAMADO_REAL, {})).toBe(false);
      expect(matcheaCriterios(LLAMADO_REAL, { palabrasClave: [], incisos: [] })).toBe(false);
    });
  });
});
