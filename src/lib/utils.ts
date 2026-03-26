import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata pontos decimais para exibição como inteiros sem arredondamento.
 * Usa truncamento: floor para valores positivos, ceil para valores negativos.
 * Formata o número com pontos como separadores de milhares.
 * 
 * IMPORTANTE: Esta função é apenas para exibição. Nunca use valores truncados
 * para cálculos ou validações. Sempre use os valores decimais originais.
 * 
 * @param points - Valor decimal dos pontos
 * @returns String formatada com separadores de milhares (ex: "100.000")
 * 
 * @example
 * formatPoints(123.7) // retorna "123"
 * formatPoints(100000) // retorna "100.000"
 * formatPoints(1234567) // retorna "1.234.567"
 * formatPoints(-123.7) // retorna "-123"
 */
export function formatPoints(points: number): string {
  const truncated = points >= 0 ? Math.floor(points) : Math.ceil(points);
  return truncated.toLocaleString("pt-BR");
}

/**
 * Formata o nome do modelo para exibição amigável.
 * 
 * @param model - Modelo do produto (MASCULINO, FEMININO, UNISEX)
 * @returns Nome formatado do modelo
 */
export function formatModelName(model: string): string {
  switch (model) {
    case 'MASCULINO':
      return 'Masculino';
    case 'FEMININO':
      return 'Feminino';
    case 'UNISEX':
      return 'Unisex';
    default:
      return model;
  }
}

/**
 * Valida um CNPJ brasileiro usando o algoritmo oficial de dígitos verificadores.
 * 
 * Regras principais:
 * - Deve ter exatamente 14 dígitos numéricos
 * - Não pode ser uma sequência repetida (ex: 00000000000000, 11111111111111, etc.)
 * - Dígitos verificadores (13º e 14º) devem bater com o cálculo
 */
export function isValidCnpj(value: string): boolean {
  const cnpj = value.replace(/\D/g, '');

  if (cnpj.length !== 14) {
    return false;
  }

  // Rejeita sequências do tipo 00000000000000, 11111111111111, etc.
  if (/^(\d)\1+$/.test(cnpj)) {
    return false;
  }

  const calculateDigit = (base: string, weights: number[]): number => {
    const sum = base
      .split('')
      .reduce((acc, digit, index) => acc + parseInt(digit, 10) * weights[index], 0);

    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  // Primeiro dígito verificador
  const base12 = cnpj.slice(0, 12);
  const firstDigit = calculateDigit(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  if (firstDigit !== parseInt(cnpj[12], 10)) {
    return false;
  }

  // Segundo dígito verificador
  const base13 = cnpj.slice(0, 13);
  const secondDigit = calculateDigit(base13, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  if (secondDigit !== parseInt(cnpj[13], 10)) {
    return false;
  }

  return true;
}
