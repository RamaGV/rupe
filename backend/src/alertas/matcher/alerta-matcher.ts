// backend/src/alertas/matcher/alerta-matcher.ts
//
// El corazón del motor de alertas: ¿este llamado matchea estos criterios?
// FUNCIÓN PURA, sin Mongo ni NestJS — misma disciplina que los parsers:
// la lógica de negocio delicada se testea con un describe/it, y el
// service que la usa solo orquesta.
//
// Semántica (documentada también en los tests):
//   - DENTRO de un criterio: OR   ("construcción" O "obra")
//   - ENTRE criterios:       AND  (alguna palabra Y alguno de los incisos)
//   - Criterio ausente o vacío: no restringe (no participa del AND)
//   - TODOS los criterios ausentes/vacíos: NO matchea nada — una alerta
//     sin criterios sería "avisame de todo" por accidente. El servicio
//     además rechaza crearlas (400); esto es defensa en profundidad.
//
// Sobre los criterios del dominio que NO se matchean acá: montoMinimo/
// montoMaximo y familias existen en CriteriosAlerta (shared/types) pero
// el RSS —la única fuente de llamados NUEVOS— no trae montos ni items.
// Matchearlos sería prometer lo que los datos no permiten cumplir.

import { normalizarTexto } from '../../shared/texto/normalizar';
import type { CriteriosAlerta, Licitacion } from '../../shared/types';

// Lo que el matcher necesita saber de un llamado: un subconjunto de
// Licitacion, todo opcional — es exactamente lo que produce el parser
// del RSS (LlamadoParseado = Partial<Licitacion>), sin conversión.
export type LlamadoMatcheable = Pick<
  Partial<Licitacion>,
  'tipo' | 'descripcion' | 'organismo'
>;

export function matcheaCriterios(
  llamado: LlamadoMatcheable,
  criterios: CriteriosAlerta,
): boolean {
  const reglas: boolean[] = [];

  if (criterios.palabrasClave?.length) {
    reglas.push(matcheaPalabrasClave(llamado, criterios.palabrasClave));
  }
  if (criterios.incisos?.length) {
    reglas.push(criterios.incisos.includes(llamado.organismo?.inciso ?? -1));
  }
  if (criterios.tiposContratacion?.length) {
    reglas.push(
      llamado.tipo !== undefined && criterios.tiposContratacion.includes(llamado.tipo),
    );
  }

  // Sin reglas evaluables no hay match (ver comentario de cabecera)
  return reglas.length > 0 && reglas.every(Boolean);
}

// Las palabras clave se buscan en la descripción Y en el nombre del
// organismo, con semántica de PREFIJO DE PALABRA: \b al inicio, abierto
// al final. Es el punto medio para español:
//   - substring puro:    "obra" matchearía "cobranza"  (falsos positivos)
//   - palabra exacta:    "obra" NO matchearía "obras"  (pierde plurales)
//   - prefijo de palabra: "obra" matchea "obra/obras/obrador", no "cobranza"
function matcheaPalabrasClave(llamado: LlamadoMatcheable, palabras: string[]): boolean {
  const texto = normalizarTexto(
    `${llamado.descripcion ?? ''} ${llamado.organismo?.nombreInciso ?? ''}`,
  );
  return palabras.some((palabra) => {
    const buscada = escaparRegex(normalizarTexto(palabra));
    // \b funciona acá porque normalizarTexto ya sacó las tildes
    // (con acentos, \b de JS corta en lugares raros)
    return buscada.length > 0 && new RegExp(`\\b${buscada}`).test(texto);
  });
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
