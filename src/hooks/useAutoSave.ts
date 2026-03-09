// hooks/useAutoSave.ts
import { useEffect, useRef, useState } from 'react';
import { encodeDraft, decodeDraft } from '../utils/securityUtils';

interface UseAutoSaveOptions<T> {
    key: string;
    data: T;
    debounceMs?: number;
    onSave?: (data: T) => void;
}

export function useAutoSave<T>({ key, data, debounceMs = 2000, onSave }: UseAutoSaveOptions<T>) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<number | null>(null);

    useEffect(() => {
        if (!data || Object.keys(data as object).length === 0) return;

        setIsSaving(true);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            try {
                localStorage.setItem(key, encodeDraft(data));
                setLastSaved(Date.now());
                setIsSaving(false);
                onSave?.(data);
            } catch (error) {
                console.error('Erro ao salvar rascunho:', error);
                setIsSaving(false);
            }
        }, debounceMs);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [data, key, debounceMs, onSave]);

    return { isSaving, lastSaved };
}

// ✅ Restaurar rascunho automaticamente (sem modal)
export function loadDraft<T>(key: string): T | null {
    try {
        const draft = localStorage.getItem(key);
        return draft ? decodeDraft<T>(draft) : null;
    } catch {
        return null;
    }
}

export function clearDraft(key: string) {
    localStorage.removeItem(key);
}

export function clearAllDrafts() {
    Object.keys(localStorage)
        .filter(key => key.startsWith('comissone_'))
        .forEach(key => localStorage.removeItem(key));
}
