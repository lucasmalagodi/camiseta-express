import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata pontos decimais para exibição como inteiros sem arredondamento.
 * Usa truncamento: floor para valores positivos, ceil para valores negativos.
 * 
 * IMPORTANTE: Esta função é apenas para exibição. Nunca use valores truncados
 * para cálculos ou validações. Sempre use os valores decimais originais.
 * 
 * @param points - Valor decimal dos pontos
 * @returns Número inteiro truncado (não arredondado)
 * 
 * @example
 * formatPoints(123.7) // retorna 123
 * formatPoints(123.2) // retorna 123
 * formatPoints(-123.7) // retorna -123
 * formatPoints(-123.2) // retorna -123
 */
export function formatPoints(points: number): number {
  if (points >= 0) {
    return Math.floor(points);
  } else {
    return Math.ceil(points);
  }
}
