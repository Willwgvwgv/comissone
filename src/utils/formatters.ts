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

/**
 * Formats a string as a Brazilian CPF or CNPJ format as the user types.
 * CPF: 000.000.000-00
 * CNPJ: 00.000.000/0000-00
 * @param value The raw or partially formatted input string
 * @returns Formatted CPF or CNPJ string
 */
export const formatCpfCnpjInput = (value: string): string => {
    if (!value) return '';
    const cleaned = value.replace(/\D/g, '');
    let formatted = cleaned;

    if (cleaned.length <= 11) {
        // CPF Formatting: 000.000.000-00
        if (cleaned.length > 9) {
            formatted = cleaned.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2}).*/, '$1.$2.$3-$4');
        } else if (cleaned.length > 6) {
            formatted = cleaned.replace(/^(\d{3})(\d{3})(\d{1,3}).*/, '$1.$2.$3');
        } else if (cleaned.length > 3) {
            formatted = cleaned.replace(/^(\d{3})(\d{1,3}).*/, '$1.$2');
        }
    } else {
        // CNPJ Formatting: 00.000.000/0000-00
        if (cleaned.length > 12) {
            formatted = cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2}).*/, '$1.$2.$3/$4-$5');
        } else if (cleaned.length > 8) {
            formatted = cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4}).*/, '$1.$2.$3/$4');
        } else if (cleaned.length > 5) {
            formatted = cleaned.replace(/^(\d{2})(\d{3})(\d{1,3}).*/, '$1.$2.$3');
        } else if (cleaned.length > 2) {
            formatted = cleaned.replace(/^(\d{2})(\d{1,3}).*/, '$1.$2');
        }
    }
    return formatted;
};
