import React from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

// --- AUTOSAVE INDICATOR ---
interface AutoSaveIndicatorProps {
    isSaving: boolean;
    lastSaved: number | null;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({ isSaving, lastSaved }) => {
    if (!isSaving && !lastSaved) return null;

    return (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full border shadow-lg transition-all duration-500 ${isSaving
            ? 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
            {isSaving ? (
                <>
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Salvando rascunho...</span>
                </>
            ) : (
                <>
                    <CheckCircle2 size={14} />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Rascunho salvo</span>
                </>
            )}
        </div>
    );
};
