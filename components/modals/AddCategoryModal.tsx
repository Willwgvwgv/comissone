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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Tags className="text-blue-600" size={20} />
                        {initialData ? 'Editar Categoria' : 'Nova Categoria'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Type Toggle */}
                    <div className="flex p-1 bg-slate-100 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setType('INCOME')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${type === 'INCOME' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            RECEITA
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('EXPENSE')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${type === 'EXPENSE' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            DESPESA
                        </button>
                    </div>

                    {/* Name Input */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Nome da Categoria <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Ex: Aluguel, Marketing, Vendas..."
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium"
                            required
                        />
                    </div>

                    {/* Color Selection */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Cor da Categoria</label>
                        <div className="grid grid-cols-6 gap-2">
                            {COLORS.map(color => (
                                <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => setSelectedColor(color.value)}
                                    className={`w-10 h-10 rounded-xl ${color.bg} flex items-center justify-center transition-transform hover:scale-110 ${selectedColor === color.value ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'opacity-80 hover:opacity-100'}`}
                                >
                                    {selectedColor === color.value && <Check size={18} className="text-white" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name}
                            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? 'Salvando...' : initialData ? 'Salvar' : 'Criar Categoria'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddCategoryModal;
