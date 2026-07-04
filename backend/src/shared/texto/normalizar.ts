// backend/src/shared/texto/normalizar.ts
//
// Normalización canónica para comparar texto en español "a lo humano":
// sin tildes, sin mayúsculas, sin espacios de más. La usan el cruce de
// organismos (codigueras) y el matcheo de palabras clave (alertas) —
// UNA definición de "igual" para todo el sistema: si dos textos deben
// considerarse equivalentes en un lado, también lo son en el otro.
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // saca los diacríticos que NFD separó
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
