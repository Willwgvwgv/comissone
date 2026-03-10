/**
 * Global formatters utility for consistent text/number representation across ComissOne
 */

/**
 * Formats a number as Brazilian Real (BRL) currency.
 * Employs standard formatting to ensure consistent visual presentation.
 * @param value The amount to format
 * @returns Formatted string (e.g. "R$ 1.500,00")
 */
export const formatCurrency = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return 'R$ 0,00';

    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numericValue)) return 'R$ 0,00';

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(numericValue);
};
