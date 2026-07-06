// backend/src/shared/types/index.ts
//
// El contrato de dominio vive en packages/shared (@rupe/shared) — UNA
// fuente de verdad para backend y frontend. Este archivo re-exporta con
// import RELATIVO a propósito: tsc no reescribe los "paths" del
// tsconfig al emitir, así que un bare specifier compilaría bien y
// EXPLOTARÍA en runtime (node no sabría resolverlo desde dist/).
// El relativo sobrevive a la compilación tal cual.
export * from '../../../../packages/shared/src';
