import React, { useState, useRef, useEffect } from 'react';
import { FinancialContact } from '../../types';

interface SearchableContactSelectProps {
    value: string | null;
    onChange: (contactId: string | null, contactName: string | null) => void;
    onSaveNew?: (name: string) => Promise<FinancialContact | void>; // Nova prop para salvar direto
    contacts: FinancialContact[];
    placeholder?: string;
}

const SearchableContactSelect: React.FC<SearchableContactSelectProps> = ({
    value,
    onChange,
    onSaveNew,
    contacts,
    placeholder = 'Buscar ou selecionar cliente...',
}) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newName, setNewName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const eligibleContacts = contacts.filter(
        c => c.is_active && (c.type === 'CLIENT' || c.type === 'BOTH')
    );

    const filtered = query.trim()
        ? eligibleContacts.filter(c =>
            c.name.toLowerCase().includes(query.toLowerCase())
        )
        : eligibleContacts;

    const selectedContact = eligibleContacts.find(c => c.id === value) || null;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setIsAddingNew(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (contact: FinancialContact) => {
        onChange(contact.id, contact.name);
        setQuery('');
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null, null);
        setQuery('');
        setIsOpen(false);
    };

    const handleSaveNew = async () => {
        if (!newName.trim() || !onSaveNew) return;
        setIsSaving(true);
        try {
            const saved = await onSaveNew(newName.trim());
            if (saved) {
                handleSelect(saved);
                setIsAddingNew(false);
                setNewName('');
            }
        } catch (error: any) {
            console.error('Erro ao salvar novo contato:', error);
            const msg = error?.message || 'Verifique sua conexão.';
            alert(`Não foi possível salvar o contato: ${msg}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div ref={containerRef} className="relative w-full">
            {/* M3 Display / Input */}
            {selectedContact && !isOpen ? (
                <div
                    className="flex items-center justify-between w-full px-4 py-2.5 bg-m3-primary-container/30 border border-m3-primary/10 rounded-2xl cursor-pointer group hover:bg-m3-primary-container/40 transition-all"
                    onClick={() => setIsOpen(true)}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-m3-primary text-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                            <span className="material-symbols-outlined text-base">person</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-m3-on-primary-container leading-tight">{selectedContact.name}</span>
                            <span className="text-[10px] text-m3-primary/70 font-black uppercase tracking-widest">Selecionado</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClear}
                        className="text-m3-primary/40 hover:text-m3-error p-1.5 rounded-full hover:bg-m3-error/10 transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            ) : (
                <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-m3-on-surface-variant group-focus-within:text-m3-primary transition-colors text-lg">search</span>
                    <input
                        type="text"
                        value={query}
                        onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
                        onFocus={() => setIsOpen(true)}
                        placeholder={placeholder}
                        className="w-full pl-11 pr-4 py-2.5 bg-white border border-m3-outline-variant rounded-2xl text-sm font-semibold text-m3-on-surface placeholder-m3-on-surface-variant/50 outline-none focus:ring-2 focus:ring-m3-primary/20 focus:border-m3-primary transition-all"
                    />
                </div>
            )}

            {/* M3 Dropdown */}
            {isOpen && (
                <div className="absolute top-full mt-2 left-0 right-0 z-[120] bg-white border border-m3-outline-variant/30 rounded-[28px] shadow-2xl shadow-m3-primary/5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    {!isAddingNew ? (
                        <>
                            <div className="max-h-60 overflow-y-auto p-2">
                                {filtered.length === 0 ? (
                                    <div className="px-6 py-10 text-center flex flex-col items-center gap-2">
                                        <span className="material-symbols-outlined text-4xl text-m3-outline-variant opacity-30">person_off</span>
                                        <p className="text-sm font-bold text-m3-on-surface-variant/50">
                                            {query ? `Nenhum cliente para "${query}"` : 'Busque ou cadastre um cliente'}
                                        </p>
                                    </div>
                                ) : (
                                    filtered.map(contact => (
                                        <button
                                            key={contact.id}
                                            type="button"
                                            onClick={() => handleSelect(contact)}
                                            className="w-full flex items-center gap-4 px-4 py-3 hover:bg-m3-primary/5 rounded-2xl transition-all text-left group"
                                        >
                                            <div className="w-10 h-10 bg-m3-surface-container-high group-hover:bg-m3-primary rounded-2xl flex items-center justify-center transition-all shrink-0">
                                                <span className="material-symbols-outlined text-m3-on-surface-variant group-hover:text-white transition-all">person</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black text-m3-on-surface truncate group-hover:text-m3-primary transition-colors">{contact.name}</p>
                                                {contact.document && (
                                                    <p className="text-[10px] text-m3-on-surface-variant font-bold font-mono uppercase opacity-70 mt-0.5">{contact.document}</p>
                                                )}
                                            </div>
                                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg shrink-0 ${
                                                contact.type === 'CLIENT' ? 'bg-m3-primary/10 text-m3-primary' :
                                                contact.type === 'BOTH' ? 'bg-m3-tertiary-container text-m3-on-tertiary-container' :
                                                'bg-m3-surface-container-highest text-m3-on-surface-variant'
                                            }`}>
                                                {contact.type === 'CLIENT' ? 'Cliente' : contact.type === 'BOTH' ? 'Cli/Forn' : contact.type}
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>

                            {onSaveNew && (
                                <div className="p-3 bg-m3-surface-container-low border-t border-m3-outline-variant/10">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingNew(true)}
                                        className="w-full h-11 flex items-center justify-center gap-2 bg-m3-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-md shadow-m3-primary/20"
                                    >
                                        <span className="material-symbols-outlined text-lg">person_add</span>
                                        Novo Cadastro Rápido
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="p-6 bg-white animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-3 mb-6 text-m3-primary">
                                <span className="material-symbols-outlined">person_add</span>
                                <h4 className="font-black text-sm uppercase tracking-wider">Novo Cliente</h4>
                            </div>
                            <div className="space-y-4">
                                <div className="group">
                                    <label className="block text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        placeholder="Ex: João Silva ou Construtora X"
                                        className="w-full px-4 py-3 bg-m3-surface-container-low border border-m3-outline-variant rounded-2xl text-sm font-bold text-m3-on-surface outline-none focus:ring-2 focus:ring-m3-primary/20 focus:border-m3-primary transition-all"
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingNew(false)}
                                        className="flex-1 h-12 bg-m3-surface-container-high text-m3-on-surface-variant rounded-2xl font-bold text-xs uppercase hover:bg-m3-surface-container-highest transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!newName.trim() || isSaving}
                                        onClick={handleSaveNew}
                                        className="flex-[2] h-12 bg-m3-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-m3-primary/20 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <span className="material-symbols-outlined text-lg">check</span>
                                        )}
                                        {isSaving ? 'Salvando...' : 'Salvar Cliente'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchableContactSelect;
