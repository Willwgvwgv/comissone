import React, { useState, useEffect } from 'react';
import { 
    X, 
    Calendar, 
    DollarSign, 
    Tag, 
    Wallet, 
    FileText, 
    CheckCircle, 
    ArrowUpCircle, 
    ArrowDownCircle 
} from 'lucide-react';
import { 
    FinancialCategory, 
    FinancialAccount, 
    TransactionType, 
    TransactionStatus, 
    FinancialTransaction, 
    FinancialContact 
} from '../../types';
import { useFinancial } from '../../src/lib/useFinancial';
import { useAutoSave, loadDraft, clearDraft } from '../../src/hooks/useAutoSave';
import { AutoSaveIndicator } from '../SupportComponents';
import ContactSelect from '../financial/ContactSelect';
import ContactFormModal from '../financial/ContactFormModal';
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
    contacts: FinancialContact[];
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
    isOpen, onClose, type, agencyId, onSuccess, initialData, initialAccountId, accounts, categories, contacts
}) => {
    const { sanitizeForm } = useSanitize();
    const { addTransaction, updateTransaction, addContact } = useFinancial(agencyId);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showRecurrenceChoice, setShowRecurrenceChoice] = useState(false);
    const [pendingUpdateData, setPendingUpdateData] = useState<any>(null);
    const [isTransfer, setIsTransfer] = useState(false);
    const [transferAccountId, setTransferAccountId] = useState('');

    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        amountDisplay: '',
        categoryId: '',
        accountId: '',
        status: 'PENDING' as TransactionStatus,
        dueDate: new Date().toISOString().split('T')[0],
        notes: '',
        contactId: '',
        isRecurring: false,
        recurrenceFrequency: 'MONTHLY' as 'WEEKLY' | 'MONTHLY' | 'YEARLY',
        recurrenceCount: 12
    });

    const { isSaving, lastSaved } = useAutoSave({
        key: FINANCE_DRAFT_KEY,
        data: !initialData && isOpen ? formData : null,
        debounceMs: 2000
    });

    useEffect(() => {
        if (!isOpen) return;
        if (initialData) {
            setFormData({
                description: initialData.description,
                amount: initialData.amount.toString(),
                amountDisplay: formatCurrency(Number(initialData.amount)),
                categoryId: initialData.category_id,
                accountId: initialData.account_id || '',
                dueDate: initialData.due_date,
                status: initialData.status,
                notes: initialData.notes || '',
                contactId: initialData.contact_id || '',
                isRecurring: !!initialData.total_installments,
                recurrenceFrequency: 'MONTHLY',
                recurrenceCount: initialData.total_installments || 12
            });
        } else {
            const draft = loadDraft<any>(FINANCE_DRAFT_KEY);
            if (draft && (draft.description || draft.amount || draft.contactId)) {
                setFormData(draft);
            } else {
                setFormData({
                    description: '', amount: '', amountDisplay: '', categoryId: '', accountId: initialAccountId || '',
                    dueDate: new Date().toISOString().split('T')[0], status: 'PENDING', notes: '', contactId: '',
                    isRecurring: false, recurrenceFrequency: 'MONTHLY', recurrenceCount: 12
                });
            }
        }
    }, [isOpen, initialData, initialAccountId]);

    const handleCancel = () => {
        clearDraft(FINANCE_DRAFT_KEY);
        onClose();
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        const numericValue = Number(value) / 100;
        setFormData({
            ...formData,
            amountDisplay: formatCurrency(numericValue),
            amount: numericValue.toString()
        });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData.description || !formData.amount || !formData.categoryId || !formData.accountId) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        setLoading(true);
        try {
            const sanitized = sanitizeForm(formData);
            const commonData = {
                description: sanitized.description,
                amount: Number(formData.amount),
                category_id: formData.categoryId,
                account_id: formData.accountId,
                status: formData.status,
                due_date: formData.dueDate,
                notes: sanitized.notes || '',
                contact_id: formData.contactId || null
            };

            if (initialData) {
                const isRecurringSeries = (initialData.total_installments && initialData.total_installments > 1) || (initialData.description.includes('(') && initialData.description.includes(')'));
                
                if (isRecurringSeries && !showRecurrenceChoice) {
                    setPendingUpdateData(commonData);
                    setShowRecurrenceChoice(true);
                    setLoading(false);
                    return;
                }

                await updateTransaction(initialData.id, {
                    ...commonData,
                    payment_date: formData.status === 'PAID' ? (initialData.payment_date || new Date().toISOString().split('T')[0]) : null,
                }, false);
            } else if (isTransfer && transferAccountId) {
                const transferGroupId = `trf-${Date.now()}`;
                
                // Create the opposite transaction
                await addTransaction({
                    ...commonData,
                    type: type === 'INCOME' ? 'EXPENSE' : 'INCOME',
                    account_id: transferAccountId,
                    is_transfer: true,
                    transfer_group_id: transferGroupId,
                    payment_date: formData.status === 'PAID' ? new Date().toISOString().split('T')[0] : null,
                }, formData.isRecurring ? {
                    frequency: formData.recurrenceFrequency,
                    count: Number(formData.recurrenceCount)
                } : undefined);

                // Create the main transaction
                await addTransaction({
                    ...commonData,
                    type,
                    is_transfer: true,
                    transfer_group_id: transferGroupId,
                    payment_date: formData.status === 'PAID' ? new Date().toISOString().split('T')[0] : null,
                }, formData.isRecurring ? {
                    frequency: formData.recurrenceFrequency,
                    count: Number(formData.recurrenceCount)
                } : undefined);
            } else {
                await addTransaction({
                    ...commonData,
                    type,
                    payment_date: formData.status === 'PAID' ? new Date().toISOString().split('T')[0] : null,
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

    const isIncome = type === 'INCOME';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-xl rounded-[24px] shadow-[0_32px_48px_rgba(17,28,45,0.06)] overflow-hidden relative my-8 animate-in zoom-in-95 duration-300">
                {/* Modal Header */}
                <div className="px-8 pt-8 pb-4 flex justify-between items-center bg-white">
                    <div>
                        <h2 className="text-xl font-extrabold text-[#191c1e] tracking-tight">
                            {initialData ? (isIncome ? 'Editar Receita' : 'Editar Despesa') : (isIncome ? 'Nova Receita' : 'Nova Despesa')}
                        </h2>
                        <p className="text-sm text-[#545f73] font-medium">
                            {isIncome ? 'Registre uma nova entrada financeira' : 'Registre uma nova saída financeira'}
                        </p>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[#545f73]">close</span>
                    </button>
                </div>

                {/* Modal Content Form */}
                <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6 bg-white overflow-y-auto max-h-[70vh] no-scrollbar">
                    {/* Value Input (Prominent) */}
                    <div className="space-y-2">
                        <label className="block text-[10px] uppercase tracking-widest font-black text-[#545f73]">
                            VALOR DA {isIncome ? 'ENTRADA' : 'SAÍDA'} *
                        </label>
                        <div className={`flex items-baseline gap-2 border-b-2 transition-all pb-2 ${isIncome ? 'border-emerald-500/20 focus-within:border-emerald-500' : 'border-rose-500/20 focus-within:border-rose-500'}`}>
                            <span className={`text-2xl font-black ${isIncome ? 'text-[#006e2a]' : 'text-[#ba1a1a]'}`}>R$</span>
                            <input 
                                required
                                type="text"
                                className="w-full bg-transparent border-none p-0 text-4xl font-black text-[#191c1e] placeholder:text-slate-200 focus:ring-0"
                                placeholder="0,00"
                                value={formData.amountDisplay}
                                onChange={handleAmountChange}
                            />
                        </div>
                    </div>

                    {/* Basic Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Client/Supplier */}
                        <div className="space-y-2">
                            <label className="block text-[10px] uppercase tracking-widest font-black text-[#545f73]">
                                {isIncome ? 'CLIENTE' : 'FORNECEDOR'}
                            </label>
                            <div className="flex items-center gap-3 bg-[#f2f4f6] px-4 py-3 rounded-2xl border border-transparent focus-within:bg-white focus-within:border-emerald-500/30 transition-all">
                                <span className="material-symbols-outlined text-[#545f73] text-xl">person</span>
                                <div className="flex-1">
                                    <ContactSelect 
                                        value={formData.contactId} 
                                        contacts={contacts} 
                                        type={type}
                                        onChange={(val) => setFormData({ ...formData, contactId: val || '' })}
                                        onAddNew={() => setIsContactModalOpen(true)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Due Date */}
                        <div className="space-y-2">
                            <label className="block text-[10px] uppercase tracking-widest font-black text-[#545f73]">
                                VENCIMENTO *
                            </label>
                            <div className="relative flex items-center gap-3 bg-[#f2f4f6] px-4 py-3 rounded-2xl border border-transparent focus-within:bg-white focus-within:border-emerald-500/30 transition-all">
                                <span className="material-symbols-outlined text-[#545f73] text-xl">calendar_today</span>
                                <input 
                                    required 
                                    type="date" 
                                    className="bg-transparent border-none p-0 w-full text-sm text-[#191c1e] font-bold focus:ring-0"
                                    value={formData.dueDate}
                                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="block text-[10px] uppercase tracking-widest font-black text-[#545f73]">
                                DESCRIÇÃO *
                            </label>
                            <div className="flex items-center gap-3 bg-[#f2f4f6] px-4 py-3 rounded-2xl border border-transparent focus-within:bg-white focus-within:border-emerald-500/30 transition-all">
                                <span className="material-symbols-outlined text-[#545f73] text-xl">description</span>
                                <input 
                                    required
                                    type="text"
                                    className="bg-transparent border-none p-0 w-full text-sm text-[#191c1e] font-bold placeholder:text-[#545f73]/40 focus:ring-0"
                                    placeholder={isIncome ? "Ex: Venda de imóvel A" : "Ex: Conta de luz, Aluguel..."}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Category */}
                        <div className="space-y-2">
                            <label className="block text-[10px] uppercase tracking-widest font-black text-[#545f73]">
                                CATEGORIA *
                            </label>
                            <div className="flex items-center gap-3 bg-[#f2f4f6] px-4 py-3 rounded-2xl border border-transparent focus-within:bg-white focus-within:border-emerald-500/30 transition-all">
                                <span className="material-symbols-outlined text-[#545f73] text-xl">sell</span>
                                <select 
                                    required
                                    className="bg-transparent border-none p-0 w-full text-sm text-[#191c1e] font-bold focus:ring-0 appearance-none cursor-pointer"
                                    value={formData.categoryId}
                                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                                >
                                    <option value="" disabled>Selecione</option>
                                    {categories.filter(c => c.type === type).map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Account / Bank */}
                        <div className="space-y-2">
                            <label className="block text-[10px] uppercase tracking-widest font-black text-[#545f73]">
                                CONTA / BANCO *
                            </label>
                            <div className="flex items-center gap-3 bg-[#f2f4f6] px-4 py-3 rounded-2xl border border-transparent focus-within:bg-white focus-within:border-emerald-500/30 transition-all">
                                <span className="material-symbols-outlined text-[#545f73] text-xl">account_balance</span>
                                <select 
                                    required
                                    className="bg-transparent border-none p-0 w-full text-sm text-[#191c1e] font-bold focus:ring-0 appearance-none cursor-pointer"
                                    value={formData.accountId}
                                    onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                                >
                                    <option value="" disabled>Selecione</option>
                                    <optgroup label="Contas Bancárias">
                                        {accounts.filter(acc => acc.type === 'BANK').map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                    </optgroup>
                                    <optgroup label="Cartões de Crédito">
                                        {accounts.filter(acc => acc.type === 'CREDIT_CARD').map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                    </optgroup>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Status Toggle */}
                    {!initialData && (
                        <div className="space-y-3">
                            <button 
                                type="button" 
                                onClick={() => setFormData(prev => ({ ...prev, status: prev.status === 'PAID' ? 'PENDING' : 'PAID' }))}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${formData.status === 'PAID' ? 'bg-[#00c853]/5 border-[#00c853]/20 shadow-sm' : 'bg-[#f2f4f6] border-transparent'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`material-symbols-outlined ${formData.status === 'PAID' ? 'text-[#00c853]' : 'text-[#545f73]'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                        {formData.status === 'PAID' ? 'check_circle' : 'radio_button_unchecked'}
                                    </span>
                                    <span className={`text-sm font-bold ${formData.status === 'PAID' ? 'text-[#004c1b]' : 'text-[#545f73]'}`}>
                                        Já está {isIncome ? 'recebido' : 'pago'}?
                                    </span>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative transition-colors ${formData.status === 'PAID' ? 'bg-[#00c853]' : 'bg-[#d8dadc]'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.status === 'PAID' ? 'right-1' : 'left-1'}`}></div>
                                </div>
                            </button>
                            
                            {formData.status === 'PAID' && (
                                <div className="flex items-center gap-3 pl-4 animate-in slide-in-from-top-2 duration-200">
                                    <input 
                                        type="checkbox" 
                                        id="confirm-comp" 
                                        className="w-4 h-4 rounded text-[#00c853] focus:ring-[#00c853]/20 border-[#d8dadc]"
                                        checked={true}
                                        readOnly
                                    />
                                    <label className="text-xs font-bold text-[#545f73] cursor-pointer" htmlFor="confirm-comp">
                                        Confirmar compensação agora
                                    </label>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Recurring Section */}
                    <div className="pt-2">
                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                            <div>
                                <h4 className="text-xs font-black text-[#191c1e] uppercase tracking-wider">Recorrente / Parcelado</h4>
                                <p className="text-[11px] text-[#545f73] font-medium">Configure entradas fixas ou parceladas</p>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, isRecurring: !prev.isRecurring }))}
                                className={`flex items-center gap-1.5 text-xs font-black transition-all ${formData.isRecurring ? 'text-emerald-600' : 'text-[#545f73] hover:text-emerald-600'}`}
                            >
                                <span className="material-symbols-outlined text-base">format_list_numbered</span>
                                {formData.isRecurring ? 'Ativado' : 'Gerar múltiplas parcelas?'}
                            </button>
                        </div>
                        
                        {formData.isRecurring && (
                            <div className="mt-4 bg-emerald-50/50 p-6 rounded-[24px] border-2 border-emerald-100 grid grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-300">
                                <div>
                                    <label className="block text-xs font-black text-emerald-600 uppercase mb-2 ml-1">Frequência</label>
                                    <select 
                                        className="w-full px-5 py-3 bg-white border border-emerald-100 rounded-2xl outline-none font-black text-slate-700 focus:ring-4 focus:ring-emerald-50/50"
                                        value={formData.recurrenceFrequency} 
                                        onChange={e => setFormData({ ...formData, recurrenceFrequency: e.target.value as any })}
                                    >
                                        <option value="WEEKLY">Semanal</option>
                                        <option value="MONTHLY">Mensal</option>
                                        <option value="YEARLY">Anual</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-emerald-600 uppercase mb-2 ml-1">Parcelas</label>
                                    <input 
                                        type="number" 
                                        min="2" 
                                        max="60" 
                                        className="w-full px-5 py-3 bg-white border border-emerald-100 rounded-2xl outline-none font-black text-slate-700 focus:ring-4 focus:ring-emerald-50/50"
                                        value={formData.recurrenceCount} 
                                        onChange={e => setFormData({ ...formData, recurrenceCount: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Observations */}
                    <div className="space-y-2">
                        <label className="block text-[10px] uppercase tracking-widest font-black text-[#545f73]">OBSERVAÇÕES</label>
                        <textarea 
                            className="w-full bg-[#f2f4f6] border-none rounded-2xl p-4 text-sm text-[#191c1e] font-medium placeholder:text-[#545f73]/50 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none no-scrollbar appearance-none"
                            placeholder="Notas adicionais sobre esta entrada..."
                            rows={2}
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        ></textarea>
                    </div>

                    {/* Modal Actions */}
                    <div className="pt-2">
                        <button 
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-white font-black text-lg ${isIncome ? 'bg-gradient-to-br from-[#006e2a] to-[#00c853] shadow-emerald-500/30' : 'bg-gradient-to-br from-[#ba1a1a] to-[#ff5252] shadow-rose-500/30'}`}
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span className="material-symbols-outlined font-black">done_all</span>
                                    {initialData ? 'Salvar Alterações' : 'Confirmar Lançamento'}
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Recurrence Choice Overlay */}
                {showRecurrenceChoice && (
                    <div className="absolute inset-0 z-[70] bg-white flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="p-8 flex-1 flex flex-col justify-center items-center text-center space-y-6">
                            <div className="w-20 h-20 bg-emerald-100 rounded-[32px] flex items-center justify-center text-emerald-600 animate-bounce-subtle">
                                <span className="material-symbols-outlined text-4xl">refresh</span>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-[#191c1e] mb-2">Lançamento Recorrente</h3>
                                <p className="text-slate-500 font-medium max-w-xs mx-auto">
                                    Deseja aplicar as alterações apenas a este lançamento ou a todos os próximos da série?
                                </p>
                            </div>

                            <div className="w-full space-y-3 pt-4">
                                <button
                                    onClick={async () => {
                                        setLoading(true);
                                        try {
                                            await updateTransaction(initialData!.id, {
                                                ...pendingUpdateData,
                                                payment_date: formData.status === 'PAID' ? (initialData!.payment_date || new Date().toISOString().split('T')[0]) : null,
                                            }, false);
                                            await onSuccess();
                                            onClose();
                                        } catch (err) {
                                            console.error(err);
                                        } finally {
                                            setLoading(false);
                                            setShowRecurrenceChoice(false);
                                        }
                                    }}
                                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl flex items-center gap-4 hover:border-slate-300 transition-all text-left"
                                >
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm">
                                        <span className="material-symbols-outlined">description</span>
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900">Apenas este</p>
                                        <p className="text-xs text-slate-500">Altera somente a parcela selecionada</p>
                                    </div>
                                </button>

                                <button
                                    onClick={async () => {
                                        setLoading(true);
                                        try {
                                            await updateTransaction(initialData!.id, {
                                                ...pendingUpdateData,
                                                payment_date: formData.status === 'PAID' ? (initialData!.payment_date || new Date().toISOString().split('T')[0]) : null,
                                            }, true);
                                            await onSuccess();
                                            onClose();
                                        } catch (err) {
                                            console.error(err);
                                        } finally {
                                            setLoading(false);
                                            setShowRecurrenceChoice(false);
                                        }
                                    }}
                                    className="w-full p-5 bg-emerald-50 border-2 border-emerald-100 rounded-3xl flex items-center gap-4 hover:border-emerald-300 transition-all text-left"
                                >
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm">
                                        <span className="material-symbols-outlined">sync_alt</span>
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900">Este e próximos</p>
                                        <p className="text-xs text-slate-500">Atualiza este e todos os lançamentos futuros</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setShowRecurrenceChoice(false)}
                                    className="w-full py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                                >
                                    Voltar para edição
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
            <ContactFormModal 
                isOpen={isContactModalOpen} 
                onClose={() => setIsContactModalOpen(false)}
                onSave={async (data) => {
                    const newContact = await addContact(data);
                    if (newContact) setFormData(prev => ({ ...prev, contactId: (newContact as any).id }));
                }} 
            />
        </div>
    );
};

export default AddTransactionModal;
