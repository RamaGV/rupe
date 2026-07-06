// packages/shared/src/serializado.ts
//
// La forma "por el cable" de un tipo de dominio: JSON no tiene fechas
// (Date viaja como string ISO) ni enums nominales (llegan strings
// crudos). En vez de mantener a mano una copia string-izada de cada
// interfaz (la deuda que este paquete elimina), el frontend la DERIVA:
//
//   type Licitacion = Serializado<LicitacionDominio>;
//
// Reglas, en orden:
//   Date            → string
//   string / enum   → `${T}` (un string-enum se vuelve la unión de sus
//                     literales: comparable y asignable con strings)
//   arrays/objetos  → recursivo a cualquier profundidad
//   number/boolean  → intactos (ojo: NO stringificar números)
export type Serializado<T> = T extends Date
  ? string
  : T extends string
    ? `${T}`
    : T extends (infer U)[]
      ? Serializado<U>[]
      : T extends object
        ? { [K in keyof T]: Serializado<T[K]> }
        : T;
