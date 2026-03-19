import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Tag, Wallet, FileText, CheckCircle, AlertCircle, ArrowUpCircle, ArrowDownCircle, Plus } from 'lucide-react';
import { FinancialCategory, FinancialAccount, TransactionType, TransactionStatus, FinancialTransaction } from '../../types';
import { useFinancial } from '../../src/lib/useFinancial';
import { useAutoSave, loadDraft, clearDraft } from '../../src/hooks/useAutoSave';
import { AutoSaveIndicator } from '../SupportComponents';
import { sanitizeInput } from '../../src/utils/securityUtils';
import { useSanitize } from '../../src/hooks/useSanitize';
import { formatCurrency } from '../../src/utils/formatters';

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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] ring-1 ring-slate-900/5 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 max-h-[95vh]">
                {/* Header */}
                <div className={`px-8 py-6 flex items-center justify-between shadow-sm relative overflow-hidden ${type === 'INCOME' ? 'bg-gradient-to-r from-emerald-600 to-emerald-500' : 'bg-gradient-to-r from-rose-600 to-rose-500'}`}>
                    <div className="absolute top-0 right-0 -mt-12 -mr-12 opacity-10 pointer-events-none">
                        {type === 'INCOME' ? <ArrowUpCircle size={180} /> : <ArrowDownCircle size={180} />}
                    </div>
                    <div className="relative z-10">
                        <h2 className="text-white font-bold tracking-tight text-2xl flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md shadow-inner">
                                {type === 'INCOME' ? <ArrowUpCircle size={26} className="text-white" /> : <ArrowDownCircle size={26} className="text-white" />}
                            </div>
                            {initialData ? (type === 'INCOME' ? 'Editar Receita' : 'Editar Despesa') : (type === 'INCOME' ? 'Nova Receita' : 'Nova Despesa')}
                        </h2>
                        <p className="text-white/80 text-sm font-medium mt-2 max-w-sm leading-relaxed">
                            {initialData ? 'Atualize as informações deste lançamento de forma simples.' : (type === 'INCOME' ? 'Registre uma entrada de valor no seu fluxo de caixa.' : 'Registre uma saída ou custo operacional da agência.')}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="relative z-10 p-2.5 bg-white/10 hover:bg-white/25 rounded-full text-white transition-all duration-300 hover:rotate-90 hover:scale-110 shadow-sm border border-white/5">
                        <X size={20} />
                    </button>
                </div>

                <form id="transaction-form" onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar relative">
                        {/* Amount & Description Row */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            <div className="md:col-span-4 group">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 group-focus-within:text-blue-500 transition-colors">Valor <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input
                                        required
                                        type="text"
                                        placeholder="R$ 0,00"
                                        className={`w-full px-5 py-4 bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 outline-none transition-all duration-300 font-black text-2xl shadow-sm ${type === 'INCOME' ? 'text-emerald-600 focus:border-emerald-400 focus:ring-emerald-100/50' : 'text-rose-600 focus:border-rose-400 focus:ring-rose-100/50'}`}
                                        value={formData.amountDisplay}
                                        onChange={handleAmountChange}
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-4 group">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 group-focus-within:text-blue-500 transition-colors">Fornecedor / Cliente</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Posto, Amazon..."
                                    className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 outline-none transition-all duration-300 font-bold text-slate-700 placeholder:text-slate-400 shadow-sm"
                                    value={formData.provider}
                                    onChange={e => setFormData({ ...formData, provider: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-4 group">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 group-focus-within:text-blue-500 transition-colors">Descrição / Título <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ex: Gasolina, Assinatura..."
                                    className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 outline-none transition-all duration-300 font-bold text-slate-700 placeholder:text-slate-400 shadow-sm"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Date, Category, Account Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="group">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 group-focus-within:text-blue-500 transition-colors">Data / Vencimento <span className="text-red-500">*</span></label>
                                <div className="relative flex items-center">
                                    <Calendar className="absolute left-4 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" size={18} />
                                    <input
                                        required
                                        type="date"
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 outline-none transition-all duration-300 font-bold text-slate-700 shadow-sm"
                                        value={formData.dueDate}
                                        onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 group-focus-within:text-blue-500 transition-colors">Categoria <span className="text-red-500">*</span></label>
                                <div className="relative flex items-center">
                                    <Tag className="absolute left-4 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" size={18} />
                                    <select
                                        required
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 outline-none transition-all duration-300 font-bold text-slate-700 appearance-none shadow-sm cursor-pointer"
                                        value={formData.categoryId}
                                        onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                                    >
                                        <option value="" disabled>Selecionar...</option>
                                        {availableCategories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 group-focus-within:text-blue-500 transition-colors">Conta / Banco <span className="text-red-500">*</span></label>
                                <div className="relative flex items-center">
                                    <Wallet className="absolute left-4 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" size={18} />
                                    <select
                                        required
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 outline-none transition-all duration-300 font-bold text-slate-700 appearance-none shadow-sm cursor-pointer"
                                        value={formData.accountId}
                                        onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                                    >
                                        <option value="" disabled>Selecionar...</option>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, status: prev.status === 'PAID' ? 'PENDING' : 'PAID' }))}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 flex items-center justify-between group outline-none ${formData.status === 'PAID' ? 'bg-emerald-50 border-emerald-400 shadow-md ring-2 ring-emerald-50 text-left' : 'bg-slate-50 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 text-left'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl transition-colors duration-300 border ${formData.status === 'PAID' ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-400 group-hover:text-emerald-400 border-slate-200 shadow-sm'}`}>
                                            <CheckCircle size={22} />
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold leading-tight transition-colors duration-300 ${formData.status === 'PAID' ? 'text-emerald-700' : 'text-slate-600 group-hover:text-slate-800'}`}>Já está pago/recebido?</p>
                                            <p className="text-[11px] font-medium text-slate-500 mt-0.5">Dinheiro saiu ou entrou na conta</p>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-300 ${formData.status === 'PAID' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white'}`}>
                                        {formData.status === 'PAID' && <CheckCircle size={14} className="text-white animate-in zoom-in" />}
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, isRecurring: !prev.isRecurring }))}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 flex items-center justify-between group outline-none ${formData.isRecurring ? 'bg-blue-50 border-blue-400 shadow-md ring-2 ring-blue-50 text-left' : 'bg-slate-50 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 text-left'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl transition-colors duration-300 border ${formData.isRecurring ? 'bg-blue-500 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-400 group-hover:text-blue-400 border-slate-200 shadow-sm'}`}>
                                            <Calendar size={22} />
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold leading-tight transition-colors duration-300 ${formData.isRecurring ? 'text-blue-700' : 'text-slate-600 group-hover:text-slate-800'}`}>
                                                {accounts.find(a => a.id === formData.accountId)?.type === 'CREDIT_CARD' ? 'Lançamento Parcelado' : 'Lançamento Recorrente'}
                                            </p>
                                            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                                {accounts.find(a => a.id === formData.accountId)?.type === 'CREDIT_CARD' ? 'Dividir fatura' : 'Gerar parcelas futuras'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-300 ${formData.isRecurring ? 'border-blue-500 bg-blue-500' : 'border-slate-300 bg-white'}`}>
                                        {formData.isRecurring && <CheckCircle size={14} className="text-white animate-in zoom-in" />}
                                    </div>
                                </button>
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
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 group-focus-within:text-blue-500 transition-colors">Observações Adicionais</label>
                            <div className="relative">
                                <FileText className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" size={18} />
                                <textarea
                                    className="w-full pl-12 pr-5 py-4 bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-100/50 focus:border-blue-400 outline-none transition-all duration-300 min-h-[100px] font-medium text-slate-700 placeholder:text-slate-400 shadow-sm"
                                    placeholder="Notas internas, número de nota fiscal..."
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 bg-white border-t border-slate-100 flex gap-4 shrink-0 rounded-b-2xl">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="flex-1 px-4 py-3.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 shadow-sm active:scale-[0.98]"
                        >
                            CANCELAR
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex-[2] px-4 py-3.5 text-white font-bold rounded-xl shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2 active:scale-[0.98] ${type === 'INCOME' ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-emerald-500/30 hover:shadow-emerald-500/50' : 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 shadow-rose-500/30 hover:shadow-rose-500/50'}`}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
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
