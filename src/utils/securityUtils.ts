/**
 * Utilitários de Segurança para o ComissOne
 */

/**
 * Aplica máscara em CPF (Ex: ***.000.000-**)
 */
export const maskCPF = (cpf: string): string => {
    if (!cpf) return '';
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) return cpf;
    return `***.***.${cleanCPF.substring(6, 9)}-**`;
};

/**
 * Sanitiza strings para evitar XSS básico
 */
export const sanitizeInput = (input: string): string => {
    if (typeof input !== 'string') return input;
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

/**
 * Codifica objeto em Base64 para salvamento no localStorage
 */
export const encodeDraft = (data: any): string => {
    try {
        const jsonString = JSON.stringify(data);
        return btoa(encodeURIComponent(jsonString));
    } catch (e) {
        console.error('Erro ao codificar rascunho:', e);
        return '';
    }
};

/**
 * Decodifica string Base64 do localStorage para objeto
 */
export const decodeDraft = <T>(encoded: string): T | null => {
    try {
        const jsonString = decodeURIComponent(atob(encoded));
        return JSON.parse(jsonString);
    } catch (e) {
        console.error('Erro ao decodificar rascunho:', e);
        return null;
    }
};
