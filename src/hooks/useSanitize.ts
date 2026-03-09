// hooks/useSanitize.ts
import { sanitizeInput } from '../utils/securityUtils';

export function useSanitize() {
    const sanitizeForm = <T extends Record<string, any>>(data: T): T => {
        const sanitized = { ...data };

        for (const key in sanitized) {
            if (typeof sanitized[key] === 'string') {
                const val = sanitized[key] as string;
                // Não sanitizar CPF (apenas números para o banco)
                if (key.toLowerCase().includes('cpf')) {
                    (sanitized as any)[key] = val.replace(/\D/g, '');
                }
                // Não sanitizar senha
                else if (key.toLowerCase().includes('senha') || key.toLowerCase().includes('password')) {
                    // Manter como está
                }
                // Sanitizar outros campos de texto
                else {
                    (sanitized as any)[key] = sanitizeInput(val);
                }
            }
        }

        return sanitized;
    };

    return { sanitizeForm };
}
