import React, { useState, useEffect } from 'react';
import { X, Tags, Check } from 'lucide-react';
import { TransactionType, FinancialCategory } from '../../types';

interface AddCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (categoryData: { name: string; type: TransactionType; color: string }) => Promise<void>;
    initialData?: FinancialCategory | null;
}

const COLORS = [
    { name: 'Blue', value: '#3b82f6', bg: 'bg-blue-500' },
    { name: 'Emerald', value: '#10b981', bg: 'bg-emerald-500' },
    { name: 'Violet', value: '#8b5cf6', bg: 'bg-violet-500' },
    { name: 'Amber', value: '#f59e0b', bg: 'bg-amber-500' },
    { name: 'Rose', value: '#f43f5e', bg: 'bg-rose-500' },
    { name: 'Cyan', value: '#06b6d4', bg: 'bg-cyan-500' },
    { name: 'Slate', value: '#64748b', bg: 'bg-slate-500' },
    { name: 'Orange', value: '#f97316', bg: 'bg-orange-500' },
    { name: 'Indigo', value: '#6366f1', bg: 'bg-indigo-500' },
];

const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<TransactionType>('EXPENSE');
    const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setType(initialData.type);
            setSelectedColor(initialData.color);
        } else {
            setName('');
            setType('EXPENSE');
            setSelectedColor(COLORS[0].value);
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        setLoading(true);
        try {
            await onSuccess({
                name,
                type,
                color: selectedColor
            });
            setName('');
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar categoria');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] ring-1 ring-slate-900/5 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                    <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 rounded-xl shadow-inner">
                            <Tags size={20} />
                        </div>
                        {initialData ? 'Editar Categoria' : 'Nova Categoria'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all duration-200 hover:rotate-90"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto no-scrollbar relative">
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Type Toggle */}
                        <div className="flex bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50 shadow-inner">
                            <button
                                type="button"
                                onClick={() => setType('INCOME')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all duration-300 ${type === 'INCOME' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5 scale-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 scale-95'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> RECEITA
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('EXPENSE')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all duration-300 ${type === 'EXPENSE' ? 'bg-white text-red-600 shadow-sm ring-1 ring-black/5 scale-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 scale-95'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 18 9 7 4 12"/></svg> DESPESA
                            </button>
                        </div>

                        {/* Name Input */}
                        <div className="space-y-2 group">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-500 transition-colors">Nome da Categoria <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Ex: Aluguel, Marketing, Vendas..."
                                className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 focus:bg-white transition-all duration-300 font-medium text-slate-700 shadow-sm hover:border-slate-300"
                                required
                            />
                        </div>

                        {/* Color Selection */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cor da Categoria</label>
                            <div className="grid grid-cols-5 gap-3">
                                {COLORS.map(color => (
                                    <button
                                        key={color.value}
                                        type="button"
                                        onClick={() => setSelectedColor(color.value)}
                                        className={`w-11 h-11 rounded-full ${color.bg} flex items-center justify-center transition-all duration-300 shadow-inner mx-auto ${selectedColor === color.value ? 'ring-4 ring-offset-2 ring-blue-100 scale-110 shadow-lg' : 'opacity-70 hover:opacity-100 hover:scale-110 hover:shadow-md'}`}
                                        title={color.name}
                                    >
                                        {selectedColor === color.value && <Check size={18} className="text-white drop-shadow-md animate-in zoom-in duration-200" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3 pb-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3.5 px-4 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all duration-300 shadow-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !name}
                                className="flex-1 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : initialData ? (
                                    'Salvar'
                                ) : (
                                    'Criar Categoria'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddCategoryModal;
