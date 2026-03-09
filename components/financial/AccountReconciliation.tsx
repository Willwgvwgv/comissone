import React, { useState, useMemo } from 'react';
import {
    Search,
    Plus,
    ArrowRightLeft,
    MoreVertical,
    EyeOff,
    RefreshCw,
    Check,
    X,
    CheckCircle2,
    Info,
    ArrowLeftRight,
    HelpCircle,
    Landmark
} from 'lucide-react';
import { FinancialTransaction, ImportTransaction, FinancialCategory, FinancialAccount } from '../../types';

interface AccountReconciliationProps {
    account: FinancialAccount;
    importedTransactions: ImportTransaction[];
    systemTransactions: FinancialTransaction[];
    categories: FinancialCategory[];
    accounts: FinancialAccount[];
    onConfirmMatch: (importId: string, systemTransactionId: string) => void;
    onIgnore: (importId: string) => void;
    onCreateNew: (transaction: any) => void;
    onTransfer: (importId: string, targetAccountId: string) => void;
}

const AccountReconciliation: React.FC<AccountReconciliationProps> = ({
    account,
    importedTransactions,
    systemTransactions,
    categories,
    accounts,
    onConfirmMatch,
    onIgnore,
    onCreateNew,
    onTransfer
}) => {
    const [activeTab, setActiveTab] = useState<'PENDING' | 'CONCILIATED' | 'IGNORED'>('PENDING');
    const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    // State for expanded rows/options and edits
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [actionType, setActionType] = useState<Record<string, 'MATCH' | 'NEW' | 'TRANSFER'>>({});
    const [edits, setEdits] = useState<Record<string, {
        description: string;
        date: string;
        amount: number;
        category_id: string;
        target_account_id: string;
        displayAmount: string;
    }>>({});

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDateShort = (dateStr: string) => {
        const date = new Date(dateStr + 'T12:00:00');
        const day = date.getDate();
        const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        return `${day} ${month.charAt(0).toUpperCase() + month.slice(1)}`;
    };

    // Helper to format input as currency while typing
    const handleAmountChange = (id: string, value: string) => {
        // Remove non-numeric characters
        const cleanValue = value.replace(/\D/g, '');
        const numericValue = cleanValue ? parseInt(cleanValue) / 100 : 0;

        const formatted = new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numericValue);

        setEdits(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                amount: numericValue,
                displayAmount: formatted
            }
        }));
    };

    // Simple matching logic
    const matches = useMemo(() => {
        const result: Record<string, FinancialTransaction[]> = {};

        importedTransactions.forEach(imp => {
            const possible = systemTransactions.filter(sys => {
                const sameAmount = Math.abs(sys.amount - imp.amount) < 0.01;
                const sameType = sys.type === imp.type;
                const sysDate = new Date(sys.due_date + 'T00:00:00');
                const impDate = new Date(imp.date + 'T00:00:00');
                const diffDays = Math.abs(sysDate.getTime() - impDate.getTime()) / (1000 * 3600 * 24);

                // Check if it's already linked to an import to avoid matching already reconciled items
                const isNotAlreadyReconciled = sys.import_id === null || sys.import_id === undefined;

                // Removed sys.status === 'PENDING' to allow matching with transactions already manually marked as PAID
                return sameAmount && sameType && diffDays <= 15 && isNotAlreadyReconciled;
            });

            if (possible.length > 0) {
                result[imp.id] = possible;
            }
        });

        return result;
    }, [importedTransactions, systemTransactions]);

    const activeImports = importedTransactions.filter(imp => !ignoredIds.has(imp.id));

    const handleStartAction = (imp: ImportTransaction, type: 'MATCH' | 'NEW' | 'TRANSFER') => {
        const initialDisplay = new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(imp.amount);

        const currentEdits = edits[imp.id] || {
            description: imp.description,
            date: imp.date,
            amount: imp.amount,
            displayAmount: initialDisplay,
            category_id: '',
            target_account_id: ''
        };

        setEdits(prev => ({ ...prev, [imp.id]: currentEdits }));
        setActionType(prev => ({ ...prev, [imp.id]: type }));
        setExpandedRow(expandedRow === imp.id && actionType[imp.id] === type ? null : imp.id);
    };

    return (
        <div className="space-y-6">
            {/* Header Bar - Standard */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <ArrowLeftRight size={18} className="text-blue-600" />
                    <span>Conciliação Bancária</span>
                </div>
            </div>

            {/* Tabs Header - Premium minimalist style */}
            <div className="flex items-center gap-10 border-b border-slate-100 pb-px">
                <button
                    onClick={() => setActiveTab('PENDING')}
                    className={`pb-4 px-1 text-[13px] font-medium transition-all relative ${activeTab === 'PENDING' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-500'}`}
                >
                    Pendentes ({activeImports.length})
                    {activeTab === 'PENDING' && <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-blue-600 rounded-full" />}
                </button>
                <button
                    onClick={() => setActiveTab('CONCILIATED')}
                    className={`pb-4 px-1 text-[13px] font-medium transition-all relative ${activeTab === 'CONCILIATED' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-500'}`}
                >
                    Conciliados
                    {activeTab === 'CONCILIATED' && <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-blue-600 rounded-full" />}
                </button>
                <button
                    onClick={() => setActiveTab('IGNORED')}
                    className={`pb-4 px-1 text-[13px] font-medium transition-all relative ${activeTab === 'IGNORED' ? 'text-slate-600' : 'text-slate-400 hover:text-slate-500'}`}
                >
                    Ignorados ({ignoredIds.size})
                    {activeTab === 'IGNORED' && <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-slate-600 rounded-full" />}
                </button>
            </div>

            {/* Table Layout */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm relative z-0">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-[#FBFCFE] text-[10px] font-bold text-[#64748B] uppercase tracking-[0.15em] border-b border-slate-100">
                            <th className="px-6 py-5 w-[110px]">DATA</th>
                            <th className="px-6 py-5 border-r border-slate-50">EXTRATO BANCÁRIO</th>
                            <th className="px-6 py-5 text-center w-[130px] border-r border-slate-50">MATCH</th>
                            <th className="px-6 py-5 border-r border-slate-50">SUGESTÃO ERP</th>
                            <th className="px-6 py-5 text-right">AÇÕES</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {activeTab === 'PENDING' && activeImports.map(imp => {
                            const impMatches = matches[imp.id] || [];
                            const bestMatch = impMatches[0];
                            const isProcessing = processingIds.has(imp.id);
                            const isExpanded = expandedRow === imp.id;
                            const currentAction = actionType[imp.id];
                            const currentEdits = edits[imp.id] || {
                                description: imp.description,
                                date: imp.date,
                                amount: imp.amount,
                                category_id: '',
                                target_account_id: '',
                                displayAmount: ''
                            };

                            let statusBadge = null;
                            if (impMatches.length === 1) {
                                statusBadge = (
                                    <div className="flex flex-col items-center gap-1.5 py-1">
                                        <span className="bg-[#E7F9F3] text-[#00A868] text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#D1F2E8] uppercase tracking-tighter">100% Match</span>
                                        <ArrowLeftRight size={14} className="text-[#00A868] opacity-60" />
                                    </div>
                                );
                            } else if (impMatches.length > 1) {
                                statusBadge = (
                                    <div className="flex flex-col items-center gap-1.5 py-1">
                                        <span className="bg-[#FFF8E6] text-[#D97706] text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#FEF3C7] uppercase tracking-tighter">Sugestão</span>
                                        <RefreshCw size={14} className="text-[#D97706] animate-spin-slow opacity-60" />
                                    </div>
                                );
                            } else {
                                statusBadge = (
                                    <div className="flex flex-col items-center gap-1.5 py-1">
                                        <span className="bg-[#F8FAFC] text-[#94A3B8] text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#E2E8F0] uppercase tracking-tighter">Sem Registro</span>
                                        <HelpCircle size={14} className="text-[#CBD5E1] opacity-60" />
                                    </div>
                                );
                            }

                            return (
                                <React.Fragment key={imp.id}>
                                    <tr className={`group transition-all ${isProcessing ? 'opacity-50' : ''} ${isExpanded ? 'bg-[#F9FBFF]' : 'hover:bg-[#F9FBFD]/30'}`}>
                                        <td className="px-6 py-7">
                                            <span className="text-[12px] font-semibold text-slate-600">
                                                {formatDateShort(imp.date)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-7 border-r border-slate-50/50">
                                            <div className="flex flex-col">
                                                <span className="text-[14px] font-semibold text-slate-800 leading-tight mb-1">{imp.description}</span>
                                                <span className="text-[11px] text-slate-500 font-medium">
                                                    {imp.type === 'INCOME' ? 'Depósito PIX' : 'Pagamento'} • {account.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-7 text-center border-r border-slate-50/50">
                                            {statusBadge}
                                        </td>
                                        <td className="px-6 py-7 border-r border-slate-50/50">
                                            {bestMatch ? (
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[14px] font-medium text-[#334155]">{bestMatch.description}</span>
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${bestMatch.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {bestMatch.status === 'PAID' ? 'PAGO' : 'PENDENTE'}
                                                        </span>
                                                    </div>
                                                    <span className={`text-[13px] font-bold ${bestMatch.type === 'INCOME' ? 'text-[#059669]' : 'text-red-500'}`}>
                                                        {formatCurrency(bestMatch.amount)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-slate-400 font-medium italic">Nenhuma correspondência encontrada</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-7 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                {impMatches.length > 0 ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => {
                                                                setProcessingIds(prev => new Set(prev).add(imp.id));
                                                                onConfirmMatch(imp.id, bestMatch.id);
                                                            }}
                                                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                                                        >
                                                            Conciliar
                                                        </button>
                                                        {impMatches.length > 1 && (
                                                            <button
                                                                onClick={() => handleStartAction(imp, 'MATCH')}
                                                                className={`p-2 rounded-lg border transition-all ${isExpanded && currentAction === 'MATCH' ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-100 text-slate-400 hover:bg-white hover:text-slate-500'}`}
                                                            >
                                                                <Search size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleStartAction(imp, 'NEW')}
                                                        className={`bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-xs font-semibold transition-all ${isExpanded && currentAction === 'NEW' ? 'ring-2 ring-blue-100' : ''}`}
                                                    >
                                                        Novo Lançamento
                                                    </button>
                                                )}

                                                <div className="relative group/menu">
                                                    <button
                                                        className="p-2 text-slate-200 hover:text-slate-400 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>
                                                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 shadow-xl rounded-xl py-1 hidden group-hover/menu:block z-50 min-w-[190px]">
                                                        {impMatches.length > 0 && (
                                                            <button
                                                                onClick={() => handleStartAction(imp, 'NEW')}
                                                                className="w-full text-left px-4 py-2.5 text-xs font-semibold text-blue-600 hover:bg-slate-50 flex items-center gap-2"
                                                            >
                                                                <Plus size={14} /> Novo Lançamento
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleStartAction(imp, 'TRANSFER')}
                                                            className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                                        >
                                                            <ArrowRightLeft size={14} /> Tratar como Transferência
                                                        </button>
                                                        <button
                                                            onClick={() => setIgnoredIds(prev => new Set(prev).add(imp.id))}
                                                            className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                                        >
                                                            <EyeOff size={14} /> Ignorar Lançamento
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded Edit Form - Clean & Premium */}
                                    {isExpanded && (
                                        <tr className="bg-[#FBFCFE]/80">
                                            <td colSpan={5} className="px-6 py-10">
                                                <div className="max-w-4xl mx-auto bg-white p-10 rounded-2xl border border-slate-100 shadow-xl">
                                                    <div className="flex items-center justify-between mb-8">
                                                        <h4 className="text-[13px] font-bold text-slate-800 uppercase tracking-[0.15em] flex items-center gap-2.5">
                                                            {currentAction === 'NEW' ? 'Cadastrar Novo Lançamento' :
                                                                currentAction === 'TRANSFER' ? 'Realizar Transferência Bancária' :
                                                                    'Selecionar Correspondência'}
                                                        </h4>
                                                        <button onClick={() => setExpandedRow(null)} className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors">
                                                            <X size={22} />
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                        {currentAction !== 'TRANSFER' ? (
                                                            <>
                                                                <div className="space-y-2 md:col-span-2 text-left">
                                                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block ml-0.5">Descrição</label>
                                                                    <input
                                                                        type="text"
                                                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-[13px] font-medium text-slate-700 focus:border-blue-400 focus:bg-white transition-all"
                                                                        value={currentEdits.description}
                                                                        onChange={(e) => setEdits(prev => ({ ...prev, [imp.id]: { ...currentEdits, description: e.target.value } }))}
                                                                    />
                                                                </div>
                                                                {/* DATA - somente leitura */}
                                                                <div className="space-y-2 text-left">
                                                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block ml-0.5">
                                                                        Data <span className="normal-case font-normal text-slate-400">(do arquivo)</span>
                                                                    </label>
                                                                    <div className="w-full px-4 py-3 bg-slate-100/60 border border-slate-100 rounded-xl text-[13px] font-medium text-slate-500 cursor-not-allowed select-none">
                                                                        {imp.date ? new Date(imp.date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                                                                    </div>
                                                                </div>
                                                                {/* VALOR - somente leitura */}
                                                                <div className="space-y-2 text-left">
                                                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block ml-0.5">
                                                                        Valor (R$) <span className="normal-case font-normal text-slate-400">(do arquivo)</span>
                                                                    </label>
                                                                    <div className="relative">
                                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-slate-400">R$</span>
                                                                        <div className="w-full pl-10 pr-4 py-3 bg-slate-100/60 border border-slate-100 rounded-xl text-[13px] font-bold text-slate-600 cursor-not-allowed select-none">
                                                                            {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(imp.amount)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            // TRANSFER FORM
                                                            <div className="md:col-span-4 space-y-6">
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                    <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origem</p>
                                                                        <div className="flex items-center justify-center gap-2 text-[#64748B]">
                                                                            <Landmark size={18} />
                                                                            <span className="text-sm font-bold uppercase">{account.name}</span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center justify-center text-slate-200">
                                                                        <ArrowRightLeft size={32} />
                                                                    </div>

                                                                    <div className="space-y-2 text-left">
                                                                        <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block ml-0.5">Conta Destino</label>
                                                                        <select
                                                                            className="w-full px-4 py-3 bg-slate-50 border border-blue-200 rounded-xl outline-none text-[13px] font-bold text-slate-700 focus:border-blue-500 focus:bg-white transition-all appearance-none"
                                                                            value={currentEdits.target_account_id}
                                                                            onChange={(e) => setEdits(prev => ({ ...prev, [imp.id]: { ...currentEdits, target_account_id: e.target.value } }))}
                                                                        >
                                                                            <option value="">Selecionar Conta...</option>
                                                                            {accounts.filter(acc => acc.id !== account.id).map(acc => (
                                                                                <option key={acc.id} value={acc.id}>{acc.name} (Saldo: {formatCurrency(acc.current_balance)})</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                    <div className="space-y-2 text-left">
                                                                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block ml-0.5">Data da Transferência</label>
                                                                        <input
                                                                            type="date"
                                                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-[13px] font-medium text-slate-700 focus:border-blue-400 transition-all"
                                                                            value={currentEdits.date}
                                                                            onChange={(e) => setEdits(prev => ({ ...prev, [imp.id]: { ...currentEdits, date: e.target.value } }))}
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2 text-left">
                                                                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block ml-0.5">Valor Bruto (R$)</label>
                                                                        <div className="relative">
                                                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-slate-300">R$</span>
                                                                            <input
                                                                                type="text"
                                                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-[13px] font-bold text-slate-700 focus:border-blue-400 transition-all"
                                                                                value={currentEdits.displayAmount}
                                                                                onChange={(e) => handleAmountChange(imp.id, e.target.value)}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {currentAction === 'NEW' && (
                                                            <div className="space-y-2 md:col-span-4 text-left">
                                                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block ml-0.5">Classificação Financeira</label>
                                                                <div className="relative">
                                                                    <select
                                                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-[13px] font-bold text-slate-700 focus:border-blue-400 focus:bg-white transition-all appearance-none pr-10"
                                                                        value={currentEdits.category_id}
                                                                        onChange={(e) => setEdits(prev => ({ ...prev, [imp.id]: { ...currentEdits, category_id: e.target.value } }))}
                                                                    >
                                                                        <option value="" disabled>Selecione uma categoria...</option>
                                                                        {categories.filter(c => c.type === imp.type).map(cat => (
                                                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                                        ))}
                                                                    </select>
                                                                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                                                                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {currentAction === 'MATCH' && (
                                                            <div className="space-y-5 md:col-span-4 mt-2 text-left">
                                                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block ml-0.5">Vincular a um registro existente</label>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[350px] overflow-y-auto pr-1">
                                                                    {impMatches.map(sys => (
                                                                        <button
                                                                            key={sys.id}
                                                                            onClick={() => {
                                                                                setProcessingIds(prev => new Set(prev).add(imp.id));
                                                                                onConfirmMatch(imp.id, sys.id);
                                                                            }}
                                                                            className="flex items-center justify-between p-5 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-blue-400 hover:bg-blue-50/30 transition-all text-left group"
                                                                        >
                                                                            <div>
                                                                                <p className="text-[13px] font-bold text-[#1E293B] uppercase leading-tight mb-1.5">{sys.description}</p>
                                                                                <div className="flex items-center gap-3">
                                                                                    <span className="text-[11px] font-medium text-slate-500">{formatDateShort(sys.due_date)}</span>
                                                                                    <span className="text-[11px] font-bold text-blue-600">{formatCurrency(sys.amount)}</span>
                                                                                </div>
                                                                            </div>
                                                                            <ArrowRightLeft size={18} className="text-slate-200 group-hover:text-blue-500 transition-colors" />
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="mt-10 pt-8 border-t border-slate-50 flex items-center justify-between">
                                                        <div className="flex items-center gap-2 text-[#94A3B8]">
                                                            <Info size={14} />
                                                            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.05em]">
                                                                {currentAction === 'TRANSFER' ? 'A movimentação afetará o saldo de ambas as contas.' : 'Este registro será marcado como quitado.'}
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-4">
                                                            <button onClick={() => setExpandedRow(null)} className="px-6 py-2.5 text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-all uppercase tracking-widest">
                                                                Cancelar
                                                            </button>

                                                            {currentAction === 'NEW' && (
                                                                <button
                                                                    disabled={!currentEdits.category_id || isProcessing}
                                                                    onClick={() => {
                                                                        setProcessingIds(prev => new Set(prev).add(imp.id));
                                                                        onCreateNew({
                                                                            ...imp,
                                                                            description: currentEdits.description,
                                                                            date: currentEdits.date,
                                                                            amount: currentEdits.amount,
                                                                            category_id: currentEdits.category_id
                                                                        });
                                                                    }}
                                                                    className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 disabled:opacity-50 shadow-lg shadow-blue-600/20"
                                                                >
                                                                    {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
                                                                    Confirmar Lançamento
                                                                </button>
                                                            )}

                                                            {currentAction === 'TRANSFER' && (
                                                                <button
                                                                    disabled={!currentEdits.target_account_id || isProcessing}
                                                                    onClick={() => {
                                                                        setProcessingIds(prev => new Set(prev).add(imp.id));
                                                                        onTransfer(imp.id, currentEdits.target_account_id);
                                                                    }}
                                                                    className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 disabled:opacity-50 shadow-lg shadow-blue-600/20"
                                                                >
                                                                    {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <ArrowRightLeft size={16} />}
                                                                    Confirmar Transferência
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}

                        {activeTab === 'PENDING' && activeImports.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-28 text-center bg-emerald-50/5">
                                    <div className="w-20 h-20 bg-[#E7F9F3]/60 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                                        <CheckCircle2 size={40} className="text-[#059669] opacity-80" />
                                    </div>
                                    <h3 className="text-[20px] font-bold text-[#1E293B] mb-2 tracking-tight">Cofre em Ordem</h3>
                                    <p className="text-slate-500 text-[13px] font-medium max-w-sm mx-auto">Você completou a conciliação para esta conta. Todos os lançamentos foram processados com sucesso.</p>
                                </td>
                            </tr>
                        )}

                        {activeTab === 'IGNORED' && importedTransactions.filter(imp => ignoredIds.has(imp.id)).map(imp => (
                            <tr key={imp.id} className="group transition-all opacity-60 bg-slate-50">
                                <td className="px-6 py-7">
                                    <span className="text-[12px] font-semibold text-slate-500">{formatDateShort(imp.date)}</span>
                                </td>
                                <td className="px-6 py-7 border-r border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-[14px] font-semibold text-slate-600 line-through decoration-slate-300">{imp.description}</span>
                                        <span className="text-[11px] text-slate-400 font-medium">{formatCurrency(imp.amount)}</span>
                                    </div>
                                </td>
                                <td colSpan={2} className="px-6 py-7 text-center border-r border-slate-100">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded">Visualização Ignorada</span>
                                </td>
                                <td className="px-6 py-7 text-right">
                                    <button
                                        onClick={() => {
                                            setIgnoredIds(prev => {
                                                const newSet = new Set(prev);
                                                newSet.delete(imp.id);
                                                return newSet;
                                            });
                                        }}
                                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest"
                                    >
                                        Restaurar
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {activeTab === 'CONCILIATED' && (
                            <tr>
                                <td colSpan={5} className="py-28 text-center bg-slate-50/10">
                                    <div className="w-20 h-20 bg-blue-50/50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                                        <Info size={32} className="text-blue-500 opacity-80" />
                                    </div>
                                    <h3 className="text-[18px] font-bold text-slate-600 mb-2 tracking-tight">Histórico de Conciliação</h3>
                                    <p className="text-slate-500 text-[13px] font-medium max-w-md mx-auto">
                                        Os lançamentos conciliados com sucesso não ficam pendentes no extrato temporário. Eles já constam como "Pagos" ou "Recebidos" na aba de Fluxo de Caixa.
                                    </p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>


        </div>
    );
};

export default AccountReconciliation;
