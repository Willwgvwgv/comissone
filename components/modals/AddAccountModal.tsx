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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Wallet className="text-blue-600" size={20} />
                        {initialData ? 'Editar Conta' : 'Nova Conta Bancária'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Account Type Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setType('BANK')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${type === 'BANK' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            CONTA / BANCO
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('CREDIT_CARD')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${type === 'CREDIT_CARD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            CARTÃO DE CRÉDITO
                        </button>
                    </div>

                    {/* Name Input */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Nome da Conta / Cartão <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder={type === 'BANK' ? "Ex: Itaú, Nubank, Caixinha..." : "Ex: Visa Platinum, Mastercard..."}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium"
                            required
                        />
                    </div>

                    {type === 'BANK' ? (
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Saldo Inicial</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={initialBalance}
                                    onChange={e => setInitialBalance(e.target.value)}
                                    placeholder="0,00"
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Limite de Crédito</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={creditLimit}
                                        onChange={e => setCreditLimit(e.target.value)}
                                        placeholder="0,00"
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">4 Últimos Dígitos do Cartão</label>
                                <input
                                    type="text"
                                    maxLength={4}
                                    value={lastFourDigits}
                                    onChange={e => setLastFourDigits(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Ex: 1234"
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium tracking-widest"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Dia de Fechamento</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={closingDay}
                                        onChange={e => setClosingDay(e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Dia de Vencimento</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={dueDay}
                                        onChange={e => setDueDay(e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5 pt-2">
                                <label className="text-sm font-semibold text-slate-700">Conta Bancária Vinculada <span className="text-red-500">*</span></label>
                                <p className="text-xs text-slate-500 mb-1">Na Conta Azul ou ERPs, a fatura precisa de uma conta de onde sairá o dinheiro.</p>
                                <select
                                    value={linkedAccountId}
                                    onChange={e => setLinkedAccountId(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium appearance-none"
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
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Cor de Identificação</label>
                        <div className="flex flex-wrap gap-2">
                            {COLORS.map(color => (
                                <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => setSelectedColor(color.value)}
                                    className={`w-8 h-8 rounded-full ${color.bg} flex items-center justify-center transition-transform hover:scale-110 ${selectedColor === color.value ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'opacity-70 hover:opacity-100'}`}
                                >
                                    {selectedColor === color.value && <Check size={14} className="text-white" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Default Checkbox */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <input
                            type="checkbox"
                            id="isDefault"
                            checked={isDefault}
                            onChange={e => setIsDefault(e.target.checked)}
                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-200 border-gray-300"
                        />
                        <label htmlFor="isDefault" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                            Definir como conta principal
                        </label>
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
                            {loading ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Criar Conta'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddAccountModal;
