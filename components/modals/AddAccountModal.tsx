import React, { useState, useEffect } from 'react';
import { X, Wallet, Check } from 'lucide-react';
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

    React.useEffect(() => {
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
            alert('Por favor, selecione uma conta bancária vinculada para pagar este cartão.');
            return;
        }

        setLoading(true);
        try {
            let finalName = name;
            if (type === 'CREDIT_CARD' && lastFourDigits && !name.includes(lastFourDigits)) {
                finalName = `${name} ${lastFourDigits}`;
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
            // Reset and close
            onClose();
        } catch (error: any) {
            console.error(error);
            alert(error.message || 'Erro ao salvar conta');
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
                            <Wallet size={20} />
                        </div>
                        {initialData ? 'Editar Conta' : 'Nova Conta Bancária'}
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
                        {/* Account Type Toggle */}
                        <div className="flex bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50 shadow-inner">
                            <button
                                type="button"
                                onClick={() => setType('BANK')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all duration-300 ${type === 'BANK' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5 scale-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 scale-95'}`}
                            >
                                <Wallet size={16} /> CONTA / BANCO
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('CREDIT_CARD')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all duration-300 ${type === 'CREDIT_CARD' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5 scale-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 scale-95'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg> CARTÃO
                            </button>
                        </div>

                    {/* Name Input */}
                    <div className="space-y-2 group">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-500 transition-colors">Nome da Conta / Cartão <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder={type === 'BANK' ? "Ex: Itaú, Nubank, Caixinha..." : "Ex: Visa Platinum, Mastercard..."}
                            className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 focus:bg-white transition-all duration-300 font-medium text-slate-700 shadow-sm hover:border-slate-300"
                            required
                        />
                    </div>

                    {type === 'BANK' ? (
                        <div className="space-y-2 group">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-500 transition-colors">Saldo Inicial</label>
                            <div className="relative flex items-center">
                                <span className="absolute left-4 text-slate-400 font-bold">R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={initialBalance}
                                    onChange={e => setInitialBalance(e.target.value)}
                                    placeholder="0,00"
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 focus:bg-white transition-all duration-300 font-medium text-slate-700 shadow-sm hover:border-slate-300"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-2 group">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-500 transition-colors">Limite de Crédito</label>
                                <div className="relative flex items-center">
                                    <span className="absolute left-4 text-slate-400 font-bold">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={creditLimit}
                                        onChange={e => setCreditLimit(e.target.value)}
                                        placeholder="0,00"
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 focus:bg-white transition-all duration-300 font-medium text-slate-700 shadow-sm hover:border-slate-300"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 group">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-500 transition-colors">4 Últimos Dígitos do Cartão</label>
                                <input
                                    type="text"
                                    maxLength={4}
                                    value={lastFourDigits}
                                    onChange={e => setLastFourDigits(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Ex: 1234"
                                    className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 focus:bg-white transition-all duration-300 font-medium tracking-widest text-slate-700 shadow-sm hover:border-slate-300"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 group">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-500 transition-colors">Fechamento</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={closingDay}
                                        onChange={e => setClosingDay(e.target.value)}
                                        placeholder="Dia"
                                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 focus:bg-white transition-all duration-300 font-medium text-slate-700 shadow-sm hover:border-slate-300"
                                    />
                                </div>
                                <div className="space-y-2 group">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-500 transition-colors">Vencimento</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={dueDay}
                                        onChange={e => setDueDay(e.target.value)}
                                        placeholder="Dia"
                                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 focus:bg-white transition-all duration-300 font-medium text-slate-700 shadow-sm hover:border-slate-300"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 group">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-500 transition-colors">Conta Bancária Vinculada <span className="text-red-500">*</span></label>
                                <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">Na Conta Azul ou ERPs, a fatura precisa de uma conta de onde sairá o dinheiro.</p>
                                <select
                                    value={linkedAccountId}
                                    onChange={e => setLinkedAccountId(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 focus:bg-white transition-all duration-300 font-medium appearance-none text-slate-700 shadow-sm hover:border-slate-300 cursor-pointer"
                                    required={type === 'CREDIT_CARD'}
                                >
                                    <option value="" disabled>Selecionar conta bancária vinculada...</option>
                                    {accounts.filter(a => a.type === 'BANK').map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Color Selection */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cor de Identificação</label>
                        <div className="flex flex-wrap gap-2.5">
                            {COLORS.map(color => (
                                <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => setSelectedColor(color.value)}
                                    className={`w-9 h-9 rounded-full ${color.bg} flex items-center justify-center transition-all duration-300 shadow-inner ${selectedColor === color.value ? 'ring-4 ring-offset-2 ring-blue-100 scale-110 shadow-lg' : 'opacity-70 hover:opacity-100 hover:scale-110 hover:shadow-md'}`}
                                    title={color.name}
                                >
                                    {selectedColor === color.value && <Check size={16} className="text-white drop-shadow-md animate-in zoom-in duration-200" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Default Checkbox */}
                    <label className="flex items-center gap-3 p-4 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-200/60 cursor-pointer group transition-colors shadow-sm">
                        <div className="relative flex items-center justify-center">
                            <input
                                type="checkbox"
                                checked={isDefault}
                                onChange={e => setIsDefault(e.target.checked)}
                                className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-200 focus:ring-offset-0 transition-all peer"
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                                Definir como conta principal
                            </span>
                            <span className="text-xs text-slate-500">
                                Movimentações irão para esta conta por padrão.
                            </span>
                        </div>
                    </label>

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
                                'Salvar Alterações'
                            ) : (
                                'Criar Conta'
                            )}
                        </button>
                    </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddAccountModal;
