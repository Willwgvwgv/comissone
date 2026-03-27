import React, { useState, useEffect } from 'react';
import { X, Wallet, Check, Landmark, RefreshCw, ArrowRight } from 'lucide-react';
import { FinancialAccount } from '../../types';

interface AddAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (accountData: {
        name: string;
        initial_balance: number;
        color: string;
        is_default: boolean;
        type: 'BANK' | 'CREDIT_CARD';
        credit_limit?: number;
        closing_day?: number;
        due_day?: number;
        linked_account_id?: string;
        last_four_digits?: string;
    }) => Promise<void>;
    initialData?: FinancialAccount | null;
    accounts: FinancialAccount[];
}

const COLORS = [
    { name: 'Blue', value: '#3b82f6', bg: 'bg-blue-500' },
    { name: 'Emerald', value: '#10b981', bg: 'bg-emerald-500' },
    { name: 'Violet', value: '#8b5cf6', bg: 'bg-violet-500' },
    { name: 'Amber', value: '#f59e0b', bg: 'bg-amber-500' },
    { name: 'Rose', value: '#f43f5e', bg: 'bg-rose-500' },
    { name: 'Cyan', value: '#06b6d4', bg: 'bg-cyan-500' },
    { name: 'Slate', value: '#64748b', bg: 'bg-slate-500' },
];

const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose, onSuccess, initialData, accounts }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<'BANK' | 'CREDIT_CARD'>('BANK');
    const [initialBalance, setInitialBalance] = useState('');
    const [creditLimit, setCreditLimit] = useState('');
    const [closingDay, setClosingDay] = useState('');
    const [dueDay, setDueDay] = useState('');
    const [linkedAccountId, setLinkedAccountId] = useState('');
    const [lastFourDigits, setLastFourDigits] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
    const [isDefault, setIsDefault] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setType(initialData.type || 'BANK');
            setInitialBalance(String(initialData.initial_balance || 0));
            setCreditLimit(String(initialData.credit_limit || ''));
            setClosingDay(String(initialData.closing_day || ''));
            setDueDay(String(initialData.due_day || ''));
            setLinkedAccountId(initialData.linked_account_id || '');
            setLastFourDigits(initialData.last_four_digits || '');
            setSelectedColor(initialData.color || COLORS[0].value);
            setIsDefault(initialData.is_default || false);
        } else {
            setName('');
            setType('BANK');
            setInitialBalance('');
            setCreditLimit('');
            setClosingDay('');
            setDueDay('');
            setLinkedAccountId('');
            setLastFourDigits('');
            setSelectedColor(COLORS[0].value);
            setIsDefault(false);
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        if (type === 'CREDIT_CARD' && !linkedAccountId) {
            alert('Por favor, selecione uma conta bancária de origem para o pagamento da fatura deste cartão.');
            return;
        }

        if (type === 'CREDIT_CARD' && lastFourDigits && lastFourDigits.length !== 4) {
            alert('Por favor, informe exatamente os 4 últimos dígitos do cartão.');
            return;
        }

        setLoading(true);
        try {
            let finalName = name;
            // Simple suffix logic for cards
            if (type === 'CREDIT_CARD' && lastFourDigits && !name.includes(lastFourDigits)) {
                // We keep clean name, useFinancial or the UI will show digits
            }

            await onSuccess({
                name: finalName,
                type,
                initial_balance: Number(initialBalance) || 0,
                color: selectedColor,
                is_default: isDefault,
                credit_limit: type === 'CREDIT_CARD' ? (Number(creditLimit) || 0) : undefined,
                closing_day: type === 'CREDIT_CARD' ? (Number(closingDay) || 1) : undefined,
                due_day: type === 'CREDIT_CARD' ? (Number(dueDay) || 10) : undefined,
                linked_account_id: type === 'CREDIT_CARD' ? linkedAccountId : undefined,
                last_four_digits: type === 'CREDIT_CARD' ? lastFourDigits : undefined,
            });
            onClose();
        } catch (error: any) {
            console.error(error);
            alert(error.message || 'Erro ao salvar conta');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col max-h-[90vh]">
                
                {/* Header Section */}
                <div className="px-8 py-8 border-b border-slate-50 flex justify-between items-center bg-gradient-to-b from-slate-50/50 to-white sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                            <Wallet size={28} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight text-slate-800">
                                {initialData ? 'Ajustar Detalhes' : 'Nova Conexão'}
                            </h2>
                            <p className="text-slate-400 text-sm font-medium">Configure suas credenciais financeiras</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        type="button"
                        className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-600 transition-all duration-300 hover:rotate-90 shadow-sm"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto no-scrollbar relative flex-1">
                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        {/* Segmented Control for Account Type */}
                        <div className="p-1.5 bg-slate-100/50 rounded-[1.5rem] flex gap-2 border border-slate-200/50 shadow-inner">
                            <button
                                type="button"
                                onClick={() => setType('BANK')}
                                className={`flex-1 flex items-center justify-center gap-3 py-3.5 rounded-2xl text-xs font-black tracking-widest transition-all duration-500 ${type === 'BANK' ? 'bg-white text-blue-600 shadow-xl shadow-blue-100 border border-blue-50' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                            >
                                <Wallet size={16} /> CONTA BANCÁRIA
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('CREDIT_CARD')}
                                className={`flex-1 flex items-center justify-center gap-3 py-3.5 rounded-2xl text-xs font-black tracking-widest transition-all duration-500 ${type === 'CREDIT_CARD' ? 'bg-white text-blue-600 shadow-xl shadow-blue-100 border border-blue-50' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg> CARTÃO CRÉDITO
                            </button>
                        </div>

                        {/* Input Grid */}
                        <div className="space-y-6">
                            <div className="space-y-2.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Identificação do Banco</label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder={type === 'BANK' ? "Ex: Itaú Personalité, Nubank..." : "Ex: Visa Infinite, Mastercard Black..."}
                                        className="w-full px-6 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl outline-none focus:ring-0 focus:border-blue-500 focus:bg-white transition-all duration-500 font-bold text-slate-700 placeholder:text-slate-300 shadow-sm"
                                        required
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-200 group-focus-within:text-blue-200 transition-colors pointer-events-none">
                                        <Landmark size={20} />
                                    </div>
                                </div>
                            </div>

                            {type === 'BANK' ? (
                                <div className="space-y-2.5 animate-in slide-in-from-left-4 duration-500">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Saldo em Reais</label>
                                    <div className="relative group">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-lg group-focus-within:text-blue-500 transition-colors">R$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={initialBalance}
                                            onChange={e => setInitialBalance(e.target.value)}
                                            placeholder="0,00"
                                            className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl outline-none focus:ring-0 focus:border-blue-500 focus:bg-white transition-all duration-500 font-black text-slate-800 text-xl shadow-sm"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Modalidade/Limite</label>
                                            <div className="relative group">
                                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black group-focus-within:text-blue-500 transition-colors">R$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={creditLimit}
                                                    onChange={e => setCreditLimit(e.target.value)}
                                                    placeholder="0,00"
                                                    className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl outline-none focus:ring-0 focus:border-blue-500 focus:bg-white transition-all duration-500 font-bold text-slate-700 shadow-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">4 Últimos Dígitos</label>
                                            <input
                                                type="text"
                                                maxLength={4}
                                                value={lastFourDigits}
                                                onChange={e => setLastFourDigits(e.target.value.replace(/\D/g, ''))}
                                                placeholder="0000"
                                                className="w-full px-6 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl outline-none focus:ring-0 focus:border-blue-500 focus:bg-white transition-all duration-500 font-bold text-slate-700 tracking-[0.5em] text-center shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Sessão Fechamento</label>
                                            <select 
                                                value={closingDay}
                                                onChange={e => setClosingDay(e.target.value)}
                                                className="w-full px-6 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl outline-none focus:ring-0 focus:border-blue-500 focus:bg-white transition-all duration-500 font-bold text-slate-700 appearance-none shadow-sm cursor-pointer"
                                            >
                                                {[...Array(31)].map((_, i) => (
                                                    <option key={i+1} value={i+1}>Dia {i+1}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Data Vencimento</label>
                                            <select 
                                                value={dueDay}
                                                onChange={e => setDueDay(e.target.value)}
                                                className="w-full px-6 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl outline-none focus:ring-0 focus:border-blue-500 focus:bg-white transition-all duration-500 font-bold text-slate-700 appearance-none shadow-sm cursor-pointer"
                                            >
                                                {[...Array(31)].map((_, i) => (
                                                    <option key={i+1} value={i+1}>Dia {i+1}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 text-blue-500">Conta Originadora do Pagamento</label>
                                        <div className="relative group">
                                            <select
                                                value={linkedAccountId}
                                                onChange={e => setLinkedAccountId(e.target.value)}
                                                className="w-full px-6 py-4 bg-blue-50/30 border-2 border-blue-100/50 rounded-2xl outline-none focus:ring-0 focus:border-blue-500 focus:bg-white transition-all duration-500 font-bold text-blue-900 appearance-none shadow-sm cursor-pointer"
                                                required={type === 'CREDIT_CARD'}
                                            >
                                                <option value="" disabled>Selecione a conta para débito...</option>
                                                {accounts.filter(a => a.type === 'BANK').map(acc => (
                                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-blue-300">
                                                <RefreshCw size={18} />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-400 italic px-2">
                                            Selecione a conta bancária por onde será feito o pagamento mensal da fatura deste cartão. Isso permite que a conciliação automática identifique o débito corretamente.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Palette Picker */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Design do Card</label>
                            <div className="flex flex-wrap gap-4">
                                {COLORS.map(color => (
                                    <button
                                        key={color.value}
                                        type="button"
                                        onClick={() => setSelectedColor(color.value)}
                                        className={`w-12 h-12 rounded-2xl ${color.bg} flex items-center justify-center transition-all duration-500 shadow-lg ${selectedColor === color.value ? 'ring-4 ring-offset-4 ring-blue-100 scale-110 rotate-12 -translate-y-1' : 'opacity-60 grayscale-[0.5] hover:opacity-100 hover:scale-110 hover:grayscale-0 active:scale-95'}`}
                                    >
                                        {selectedColor === color.value && <Check size={24} className="text-white drop-shadow-xl animate-in zoom-in duration-300" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Preferences */}
                        <div className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 group transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-100">
                            <label className="flex items-center gap-5 cursor-pointer">
                                <div className="relative inline-flex items-center group">
                                    <input
                                        type="checkbox"
                                        checked={isDefault}
                                        onChange={e => setIsDefault(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 shadow-inner group-hover:after:scale-110 transition-all duration-300"></div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors">CONTA PRINCIPAL</span>
                                    <span className="text-[11px] text-slate-400 font-medium">Automatizar lançamentos para este destino</span>
                                </div>
                            </label>
                        </div>
                    </form>
                </div>

                {/* Footer Buttons */}
                <div className="px-8 py-8 border-t border-slate-50 flex gap-4 bg-slate-50/30 backdrop-blur-md">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-4 px-6 bg-white border border-slate-100 hover:bg-slate-50 text-slate-400 font-bold rounded-2xl transition-all duration-300 active:scale-95"
                    >
                        CANCELAR
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !name}
                        className="flex-[2] py-4 px-6 bg-slate-900 hover:bg-blue-600 text-white font-black tracking-widest text-sm rounded-2xl shadow-2xl shadow-slate-900/20 hover:shadow-blue-600/30 transition-all duration-500 active:scale-95 disabled:opacity-30 disabled:pointer-events-none group"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                        ) : (
                            <div className="flex items-center justify-center gap-2">
                                {initialData ? 'SALVAR ALTERAÇÕES' : 'CONECTAR AGORA'}
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddAccountModal;
