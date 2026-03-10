import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Tag, Wallet, FileText, CheckCircle, AlertCircle, ArrowUpCircle, ArrowDownCircle, Plus } from 'lucide-react';
import { FinancialCategory, FinancialAccount, TransactionType, TransactionStatus, FinancialTransaction } from '../../types';
import { useFinancial } from '../../src/lib/useFinancial';
import { useAutoSave, loadDraft, clearDraft } from '../../src/hooks/useAutoSave';
import { AutoSaveIndicator } from '../SupportComponents';
import { sanitizeInput } from '../../src/utils/securityUtils';
import { useSanitize } from '../../src/hooks/useSanitize';

const FINANCE_DRAFT_KEY = 'comissone_finance_form_draft';

interface AddTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: TransactionType;
    agencyId: string;
    onSuccess: () => void | Promise<void>;
    initialData?: FinancialTransaction | null;
    initialAccountId?: string;
    accounts: FinancialAccount[];
    categories: FinancialCategory[];
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
    isOpen, onClose, type, agencyId, onSuccess, initialData, initialAccountId, accounts, categories
}) => {
    const { sanitizeForm } = useSanitize();
    const { addTransaction, updateTransaction } = useFinancial(agencyId);

    // Form State
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        amountDisplay: '',
        categoryId: '',
        accountId: '',
        status: 'PENDING' as TransactionStatus,
        dueDate: new Date().toISOString().split('T')[0],
        notes: '',
        provider: '',
        // Recurrence State
        isRecurring: false,
        recurrenceFrequency: 'MONTHLY' as 'WEEKLY' | 'MONTHLY' | 'YEARLY',
        recurrenceCount: 12
    });

    const [loading, setLoading] = useState(false);

    // Auto-Save integration
    const { isSaving, lastSaved } = useAutoSave({
        key: FINANCE_DRAFT_KEY,
        data: !initialData && isOpen ? formData : null,
        debounceMs: 2000
    });

    // Initialize form: Load draft or Editing data or Reset
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Populate form for editing
                setFormData({
                    description: initialData.description,
                    amount: initialData.amount.toString(),
                    amountDisplay: formatCurrency(Number(initialData.amount)),
                    categoryId: initialData.category_id,
                    accountId: initialData.account_id || '',
                    dueDate: initialData.due_date,
                    status: initialData.status,
                    notes: initialData.notes || '',
                    provider: (initialData as any).provider || '',
                    isRecurring: !!initialData.total_installments,
                    recurrenceFrequency: 'MONTHLY',
                    recurrenceCount: (initialData as any).total_installments || 12
                });
            } else {
                // Check for draft first for NEW transactions
                const draft = loadDraft<any>(FINANCE_DRAFT_KEY);
                if (draft && (draft.description || draft.amount || draft.provider)) {
                    setFormData(draft);
                } else {
                    // Reset to defaults if no draft
                    setFormData({
                        description: '',
                        amount: '',
                        amountDisplay: '',
                        categoryId: '',
                        accountId: initialAccountId || '',
                        dueDate: new Date().toISOString().split('T')[0],
                        status: 'PENDING',
                        notes: '',
                        provider: '',
                        isRecurring: false,
                        recurrenceFrequency: 'MONTHLY',
                        recurrenceCount: 12
                    });
                }
            }
        }
    }, [isOpen, initialData, initialAccountId]);

    // Filter categories by type
    const availableCategories = categories.filter(c => c.type === type);

    const handleCancel = () => {
        setFormData({
            description: '',
            amount: '',
            amountDisplay: '',
            categoryId: '',
            accountId: initialAccountId || '',
            status: 'PENDING',
            dueDate: new Date().toISOString().split('T')[0],
            notes: '',
            provider: '',
            isRecurring: false,
            recurrenceFrequency: 'MONTHLY',
            recurrenceCount: 12
        });
        clearDraft(FINANCE_DRAFT_KEY);
        onClose();
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        const numericValue = Number(value) / 100;

        const formatted = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(numericValue);

        setFormData({
            ...formData,
            amountDisplay: formatted,
            amount: numericValue.toString()
        });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!formData.description || !formData.amount || !formData.categoryId || !formData.accountId) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        setLoading(true);

        try {
            const sanitized = sanitizeForm(formData);

            if (initialData) {
                // UPDATE
                await updateTransaction(initialData.id, {
                    description: sanitized.description,
                    amount: Number(formData.amount),
                    category_id: formData.categoryId,
                    account_id: formData.accountId,
                    status: formData.status,
                    due_date: formData.dueDate,
                    payment_date: formData.status === 'PAID' ? (initialData.payment_date || new Date().toISOString().split('T')[0]) : null,
                    notes: sanitized.notes || ''
                });
            } else {
                // INSERT
                await addTransaction({
                    description: sanitized.description,
                    amount: Number(formData.amount),
                    type,
                    category_id: formData.categoryId,
                    account_id: formData.accountId,
                    status: formData.status,
                    due_date: formData.dueDate,
                    payment_date: formData.status === 'PAID' ? new Date().toISOString().split('T')[0] : null,
                    notes: sanitized.notes || '',
                    provider: sanitized.provider || ''
                }, formData.isRecurring ? {
                    frequency: formData.recurrenceFrequency,
                    count: Number(formData.recurrenceCount)
                } : undefined);
            }

            await onSuccess();
            clearDraft(FINANCE_DRAFT_KEY);
            onClose();
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar o lançamento. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden transform transition-all scale-100 max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className={`px-8 py-6 flex items-center justify-between ${type === 'INCOME' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    <div>
                        <h2 className="text-white font-black text-2xl flex items-center gap-3">
                            {type === 'INCOME' ? <ArrowUpCircle size={28} /> : <ArrowDownCircle size={28} />}
                            {initialData ? (type === 'INCOME' ? 'Editar Receita' : 'Editar Despesa') : (type === 'INCOME' ? 'Nova Receita' : 'Nova Despesa')}
                        </h2>
                        <p className="text-white/80 text-sm font-medium mt-1">
                            {initialData ? 'Atualize as informações deste lançamento' : (type === 'INCOME' ? 'Registre uma entrada de valor no caixa' : 'Registre uma saída ou custo operacional')}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
                        <X size={24} />
                    </button>
                </div>

                <form id="transaction-form" onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-8 space-y-6">
                        {/* Amount & Description Row */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            <div className="md:col-span-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Valor</label>
                                <div className="relative">
                                    <input
                                        required
                                        type="text"
                                        placeholder="R$ 0,00"
                                        className={`w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-black text-2xl ${type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}
                                        value={formData.amountDisplay}
                                        onChange={handleAmountChange}
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-4 text-center">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fornecedor</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Posto, Amazon, Apple..."
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-400"
                                    value={formData.provider}
                                    onChange={e => setFormData({ ...formData, provider: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descrição / Título</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ex: Gasolina, Assinatura Cloud..."
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-400"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Date, Category, Account Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Data de Vencimento</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        required
                                        type="date"
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                                        value={formData.dueDate}
                                        onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</label>
                                </div>
                                <div className="relative">
                                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <select
                                        required
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 appearance-none"
                                        value={formData.categoryId}
                                        onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                                    >
                                        <option value="">Selecionar...</option>
                                        {availableCategories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Conta / Banco</label>
                                </div>
                                <div className="relative">
                                    <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <select
                                        required
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 appearance-none"
                                        value={formData.accountId}
                                        onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                                    >
                                        <option value="">Selecionar...</option>
                                        <optgroup label="Contas Bancárias">
                                            {accounts.filter(acc => acc.type === 'BANK').map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Cartões de Crédito">
                                            {accounts.filter(acc => acc.type === 'CREDIT_CARD').map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </div>
                            </div>
                        </div>


                        {/* Status & Options Selection - Hide when editing */}
                        {!initialData && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div
                                    onClick={() => setFormData(prev => ({ ...prev, status: prev.status === 'PAID' ? 'PENDING' : 'PAID' }))}
                                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${formData.status === 'PAID' ? 'bg-emerald-50 border-emerald-500 shadow-lg shadow-emerald-100' : 'bg-white border-slate-100'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${formData.status === 'PAID' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            <CheckCircle size={24} />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-700 leading-tight">Já está pago?</p>
                                            <p className="text-xs text-slate-500">Marque se o valor já caiu/saiu</p>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${formData.status === 'PAID' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-200'}`}>
                                        {formData.status === 'PAID' && <CheckCircle size={14} className="text-white" />}
                                    </div>
                                </div>

                                <div
                                    onClick={() => setFormData(prev => ({ ...prev, isRecurring: !prev.isRecurring }))}
                                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${formData.isRecurring ? 'bg-blue-50 border-blue-500 shadow-lg shadow-blue-100' : 'bg-white border-slate-100'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${formData.isRecurring ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            <Calendar size={24} />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-700 leading-tight">
                                                {accounts.find(a => a.id === formData.accountId)?.type === 'CREDIT_CARD' ? 'Parcelar?' : 'É recorrente?'}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {accounts.find(a => a.id === formData.accountId)?.type === 'CREDIT_CARD' ? 'Dividir em parcelas mensais' : 'Repetir este lançamento'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${formData.isRecurring ? 'border-blue-500 bg-blue-500' : 'border-slate-200'}`}>
                                        {formData.isRecurring && <CheckCircle size={14} className="text-white" />}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Recurrence Configuration */}
                        {formData.isRecurring && (
                            <div className="bg-blue-50/50 p-6 rounded-3xl border-2 border-blue-100 space-y-4 animate-in slide-in-from-top-4 duration-300">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Frequência</label>
                                        <select
                                            className="w-full px-5 py-3 bg-white border border-blue-100 rounded-2xl focus:ring-4 focus:ring-blue-200 outline-none transition-all font-bold text-slate-700"
                                            value={formData.recurrenceFrequency}
                                            onChange={e => setFormData({ ...formData, recurrenceFrequency: e.target.value as any })}
                                        >
                                            <option value="WEEKLY">Semanal</option>
                                            <option value="MONTHLY">Mensal</option>
                                            <option value="YEARLY">Anual</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Total de Parcelas</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="number"
                                                min="2"
                                                max="60"
                                                className="w-full px-5 py-3 bg-white border border-blue-100 rounded-2xl focus:ring-4 focus:ring-blue-200 outline-none transition-all font-bold text-slate-700"
                                                value={formData.recurrenceCount}
                                                onChange={e => setFormData({ ...formData, recurrenceCount: Number(e.target.value) })}
                                            />
                                            <span className="text-blue-400 font-black">X</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-blue-100/50 rounded-xl text-blue-700 text-xs font-bold">
                                    <AlertCircle size={14} />
                                    <span>Serão gerados {formData.recurrenceCount} lançamentos {formData.recurrenceFrequency === 'MONTHLY' ? 'mensais' : formData.recurrenceFrequency === 'WEEKLY' ? 'semanais' : 'anuais'}.</span>
                                </div>
                            </div>
                        )}

                        {/* Notes Section */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Observações Adicionais</label>
                            <div className="relative">
                                <FileText className="absolute left-4 top-4 text-slate-400" size={18} />
                                <textarea
                                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all min-h-[100px] font-medium text-slate-700"
                                    placeholder="Notas internas, número de nota fiscal..."
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-all active:scale-95"
                        >
                            CANCELAR
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex-[2] px-6 py-4 text-white font-black rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 ${type === 'INCOME' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}
                        >
                            {loading ? 'PROCESSANDO...' : (
                                <>
                                    <DollarSign size={20} />
                                    {initialData ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR LANÇAMENTO'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
        </div>
    );
};

export default AddTransactionModal;
