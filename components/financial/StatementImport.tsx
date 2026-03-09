import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
    Upload, FileText, CheckCircle2, AlertTriangle, X, ArrowRight,
    Landmark, ShieldCheck, Calculator, Info, Check, AlertCircle,
    Edit2, ChevronDown, Plus, RotateCcw, Sparkles
} from 'lucide-react';
import { FinancialAccount, FinancialCategory, FinancialTransaction } from '../../types';
import { ImportTransaction, parseOFX, parseCSV, generateFileHash, findRecurringMatch } from '../../src/lib/importUtils';

interface StatementImportProps {
    accounts: FinancialAccount[];
    transactions: FinancialTransaction[];
    categories: FinancialCategory[];
    onConfirm: (accountId: string, filename: string, fileSize: number, fileHash: string, transactions: any[]) => Promise<void>;
}

interface RowState {
    description: string;
    type: 'INCOME' | 'EXPENSE';
    categoryId: string;
    ignored: boolean;
    manuallyEdited: boolean;
    recurringMatch: ReturnType<typeof findRecurringMatch>;
}

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
};

// ── Dropdown de categoria pesquisável ──────────────────────────────────────
const CategoryDropdown: React.FC<{
    categories: FinancialCategory[];
    value: string;
    onChange: (id: string) => void;
    transactionType: 'INCOME' | 'EXPENSE';
    mostUsed?: string[];
}> = ({ categories, value, onChange, transactionType, mostUsed = [] }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    // Fecha ao clicar fora
    React.useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = useMemo(() => {
        const relevant = categories.filter(c => c.type === transactionType || !c.type);
        const q = search.toLowerCase();
        const matches = q ? relevant.filter(c => c.name.toLowerCase().includes(q)) : relevant;

        // Ordena: usadas primeiro
        return matches.sort((a, b) => {
            const aUsed = mostUsed.includes(a.id) ? 0 : 1;
            const bUsed = mostUsed.includes(b.id) ? 0 : 1;
            return aUsed - bUsed;
        });
    }, [categories, search, transactionType, mostUsed]);

    const selected = categories.find(c => c.id === value);

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => { setOpen(o => !o); setSearch(''); }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-bold transition-all min-w-[130px] max-w-[170px] truncate
                    ${value ? 'bg-white border-slate-200 text-slate-700' : 'bg-amber-50 border-amber-300 text-amber-600'}`}
            >
                {selected ? (
                    <span className="truncate">{selected.name}</span>
                ) : (
                    <span className="flex items-center gap-1"><AlertCircle size={11} /> Selecionar</span>
                )}
                <ChevronDown size={10} className="ml-auto shrink-0" />
            </button>

            {open && (
                <div className="absolute z-50 top-full left-0 mt-1 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                    <div className="p-2 border-b border-slate-100">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Buscar categoria..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-blue-400"
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="p-3 text-xs text-slate-400 text-center">Nenhuma categoria encontrada</div>
                        ) : (
                            filtered.map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => { onChange(cat.id); setOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-blue-50 transition-colors flex items-center gap-2
                                        ${cat.id === value ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
                                >
                                    {mostUsed.includes(cat.id) && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                    )}
                                    {cat.name}
                                </button>
                            ))
                        )}
                    </div>
                    {search && (
                        <div className="border-t border-slate-100 p-2">
                            <button
                                onClick={() => { setOpen(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                <Plus size={12} /> Criar "{search}"
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Componente principal ────────────────────────────────────────────────────
const StatementImport: React.FC<StatementImportProps> = ({ accounts, transactions, categories, onConfirm }) => {
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [parsedTransactions, setParsedTransactions] = useState<ImportTransaction[]>([]);
    const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
    const [loading, setLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fileHash, setFileHash] = useState('');
    const [editingDesc, setEditingDesc] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const selectedAccount = useMemo(() =>
        accounts.find(a => a.id === selectedAccountId),
        [accounts, selectedAccountId]
    );

    // Seleciona conta padrão
    React.useEffect(() => {
        if (accounts.length > 0 && !selectedAccountId) {
            const def = accounts.find(a => (a as any).is_default) || accounts[0];
            setSelectedAccountId(def.id);
        }
    }, [accounts, selectedAccountId]);

    // Categorias mais usadas
    const mostUsedCategories = useMemo(() => {
        const freq: Record<string, number> = {};
        transactions.forEach(t => {
            if (t.category_id) freq[t.category_id] = (freq[t.category_id] || 0) + 1;
        });
        return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
    }, [transactions]);

    // Inicializa estados das linhas após parse
    const initRowStates = useCallback((parsed: ImportTransaction[]) => {
        const states: Record<string, RowState> = {};
        for (const t of parsed) {
            const match = findRecurringMatch(t.description, t.amount, transactions as any);
            states[t.id] = {
                description: t.description,
                type: t.type,
                categoryId: match?.categoryId || '',
                ignored: false,
                manuallyEdited: false,
                recurringMatch: match,
            };
        }
        setRowStates(states);
    }, [transactions]);

    const handleFile = async (selectedFile: File) => {
        setError(null);
        setLoading(true);
        const name = selectedFile.name.toLowerCase();

        if (!name.endsWith('.ofx') && !name.endsWith('.csv')) {
            setError('Formato não suportado. Use .OFX ou .CSV');
            setLoading(false);
            return;
        }
        if (selectedFile.size === 0) {
            setError('O arquivo está vazio.');
            setLoading(false);
            return;
        }

        const reader = new FileReader();
        reader.onerror = () => { setError('Erro ao ler o arquivo. Tente novamente.'); setLoading(false); };
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                if (!content) { setError('Conteúdo inválido.'); setLoading(false); return; }

                let parsed: ImportTransaction[] = [];
                if (name.endsWith('.ofx')) parsed = parseOFX(content);
                else parsed = parseCSV(content);

                if (parsed.length === 0) {
                    setError(name.endsWith('.ofx')
                        ? 'Nenhum lançamento encontrado. Verifique se o OFX contém transações.'
                        : 'Nenhum lançamento encontrado. Formato esperado: Data;Descrição;Valor');
                } else {
                    const hash = await generateFileHash(content);
                    setFileHash(hash);
                    setParsedTransactions(parsed);
                    setFile(selectedFile);
                    initRowStates(parsed);
                }
            } catch (err: any) {
                setError(`Erro ao processar: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };
        reader.readAsText(selectedFile, 'latin1');
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    };

    const resetImport = () => {
        setFile(null);
        setParsedTransactions([]);
        setRowStates({});
        setError(null);
        setFileHash('');
    };

    const updateRow = (id: string, updates: Partial<RowState>) => {
        setRowStates(prev => ({
            ...prev,
            [id]: { ...prev[id], ...updates, manuallyEdited: true }
        }));
    };

    // Detecção de duplicados
    const duplicateIds = useMemo(() => {
        return parsedTransactions
            .filter(imp => transactions.some(sys =>
                (imp.fitid && sys.bank_txn_id === imp.fitid) ||
                (imp.hash && sys.bank_txn_id === imp.hash)
            ))
            .map(t => t.id);
    }, [parsedTransactions, transactions]);

    // Linhas ativas (não ignoradas)
    const activeRows = parsedTransactions.filter(t => !rowStates[t.id]?.ignored);

    // Validações
    const rowsWithoutCategory = activeRows.filter(t => !rowStates[t.id]?.categoryId);
    const canConfirm = rowsWithoutCategory.length === 0 && activeRows.length > 0;

    // Resumo
    const summary = useMemo(() => {
        const newOnes = activeRows.filter(t => !duplicateIds.includes(t.id));
        const recurring = activeRows.filter(t => rowStates[t.id]?.recurringMatch);
        const edited = activeRows.filter(t => rowStates[t.id]?.manuallyEdited);
        const ignored = parsedTransactions.filter(t => rowStates[t.id]?.ignored);
        return { new: newOnes.length, recurring: recurring.length, edited: edited.length, ignored: ignored.length };
    }, [activeRows, duplicateIds, rowStates, parsedTransactions]);

    const handleConfirm = async () => {
        if (!selectedAccountId || !file || activeRows.length === 0 || !canConfirm) return;
        setLoading(true);
        try {
            const toSave = activeRows.map(t => {
                const row = rowStates[t.id];
                return {
                    description: row?.description || t.description,
                    amount: t.amount,
                    type: row?.type || t.type,
                    due_date: t.date,
                    account_id: selectedAccountId,
                    bank_txn_id: t.fitid || t.hash,
                    category_id: row?.categoryId || null,
                    notes: t.memo,
                };
            });
            await onConfirm(selectedAccountId, file.name, file.size, fileHash, toSave);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">

            {/* ── Header ── */}
            <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-3.5 rounded-2xl text-white shadow-lg shadow-blue-100">
                        <Landmark size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Importação de Extrato</h2>
                        <p className="text-slate-500 font-medium text-xs">
                            {file ? `Etapa 2: Revise e categorize os lançamentos antes de importar` : 'Etapa 1: Carregue seu extrato bancário'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Ambiente Seguro</span>
                    </div>
                </div>
            </div>

            {/* ── Etapa 1: Selecionar Conta + Upload ── */}
            {!file && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Conta */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                            <Landmark size={12} className="text-blue-500" /> Conta Destino
                        </h3>
                        <label className="block text-xs font-bold text-slate-600 mb-2">Selecione o Banco</label>
                        <select
                            value={selectedAccountId}
                            onChange={e => setSelectedAccountId(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                        >
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                        {selectedAccount && (
                            <div className="mt-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider">Saldo Atual</span>
                                    <span className="text-blue-700 font-black">{formatCurrency(selectedAccount.current_balance)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider">Status</span>
                                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black text-[9px]">ATIVA</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Drop Zone */}
                    <div className="md:col-span-2">
                        <div
                            onDrop={onDrop}
                            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative h-full min-h-[200px] border-4 border-dashed rounded-[32px] flex flex-col items-center justify-center p-10 text-center cursor-pointer transition-all
                                ${isDragging ? 'border-blue-500 bg-blue-50/50 scale-[0.99]' : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-slate-50/30'}`}
                        >
                            <input ref={fileInputRef} type="file" className="hidden" accept=".ofx,.csv"
                                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                            <div className="mb-4 bg-blue-100 p-5 rounded-2xl text-blue-600">
                                <Upload size={32} />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 mb-1">Arraste seu extrato aqui</h3>
                            <p className="text-xs text-slate-400 font-medium">Suporta .OFX e .CSV dos principais bancos</p>

                            {loading && (
                                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-[28px] flex flex-col items-center justify-center">
                                    <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-3" />
                                    <p className="text-sm font-bold text-slate-600">Lendo arquivo...</p>
                                </div>
                            )}

                            {error && (
                                <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-2 text-xs font-bold">
                                    <AlertCircle size={16} /> {error}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Etapa 2: Tabela de Prévia ── */}
            {file && parsedTransactions.length > 0 && (
                <div className="space-y-5">

                    {/* Stats cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: 'Novos', value: summary.new, color: 'text-slate-800' },
                            { label: 'Recorrentes', value: summary.recurring, color: 'text-blue-600' },
                            { label: 'Editados', value: summary.edited, color: 'text-indigo-600' },
                            { label: 'Ignorados', value: summary.ignored, color: 'text-slate-400' },
                        ].map(s => (
                            <div key={s.label} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Legenda de validação */}
                    {rowsWithoutCategory.length > 0 && (
                        <div className="flex items-center gap-3 px-5 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700">
                            <AlertTriangle size={16} className="shrink-0" />
                            <p className="text-xs font-bold">
                                <span className="font-black">{rowsWithoutCategory.length} linha(s)</span> sem categoria. Selecione antes de confirmar.
                            </p>
                        </div>
                    )}

                    {/* Tabela */}
                    <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <FileText className="text-blue-500" size={18} />
                                <span className="font-bold text-sm text-slate-700">{file.name}</span>
                                <span className="text-xs text-slate-400 font-medium">{activeRows.length} lançamentos</span>
                            </div>
                            <button onClick={resetImport} className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1">
                                <X size={13} /> Trocar arquivo
                            </button>
                        </div>

                        <div className="overflow-x-auto max-h-[480px]">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-white z-10 shadow-sm">
                                    <tr className="border-b border-slate-100">
                                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Categoria *</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {parsedTransactions.map(t => {
                                        const row = rowStates[t.id];
                                        if (!row) return null;
                                        if (row.ignored) {
                                            return (
                                                <tr key={t.id} className="bg-slate-50/60 opacity-50 hover:opacity-100 transition-opacity">
                                                    <td className="px-4 py-2 text-xs text-slate-400 line-through" colSpan={5}>{formatDate(t.date)} — {t.description}</td>
                                                    <td className="px-4 py-2 text-right">
                                                        <button onClick={() => updateRow(t.id, { ignored: false })} className="text-xs text-blue-500 hover:text-blue-700 font-bold flex items-center gap-1 ml-auto">
                                                            <RotateCcw size={11} /> Restaurar
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        const isDuplicate = duplicateIds.includes(t.id);
                                        const hasCategory = !!row.categoryId;
                                        const isIncome = row.type === 'INCOME';

                                        return (
                                            <React.Fragment key={t.id}>
                                                <tr className={`group transition-colors
                                                    ${!hasCategory ? 'bg-amber-50/40' : 'hover:bg-slate-50/70'}
                                                    ${isDuplicate ? 'border-l-4 border-l-amber-400' : ''}`}>

                                                    {/* Data */}
                                                    <td className="px-4 py-3 text-xs font-bold text-slate-500 whitespace-nowrap">
                                                        {formatDate(t.date)}
                                                    </td>

                                                    {/* Descrição editável */}
                                                    <td className="px-4 py-3 max-w-[220px]">
                                                        {editingDesc === t.id ? (
                                                            <input
                                                                autoFocus
                                                                value={row.description}
                                                                onChange={e => updateRow(t.id, { description: e.target.value })}
                                                                onBlur={() => setEditingDesc(null)}
                                                                onKeyDown={e => e.key === 'Enter' && setEditingDesc(null)}
                                                                className="w-full text-xs font-bold text-slate-700 bg-blue-50 border border-blue-300 rounded-lg px-2 py-1 outline-none"
                                                            />
                                                        ) : (
                                                            <div
                                                                className="flex items-center gap-1.5 cursor-text group/desc"
                                                                onClick={() => setEditingDesc(t.id)}
                                                            >
                                                                <span className="text-xs font-bold text-slate-700 truncate">{row.description}</span>
                                                                {row.manuallyEdited && (
                                                                    <Edit2 size={10} className="text-indigo-400 shrink-0" />
                                                                )}
                                                                <Edit2 size={10} className="text-slate-300 shrink-0 opacity-0 group-hover/desc:opacity-100 transition-opacity" />
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Tipo toggle */}
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() => updateRow(t.id, { type: isIncome ? 'EXPENSE' : 'INCOME' })}
                                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all border
                                                                ${isIncome
                                                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                                                    : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'}`}
                                                        >
                                                            {isIncome ? '↑ Entrada' : '↓ Saída'}
                                                        </button>
                                                    </td>

                                                    {/* Valor */}
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className={`text-sm font-black ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                                                            {isIncome ? '+' : '−'} {formatCurrency(t.amount)}
                                                        </span>
                                                    </td>

                                                    {/* Categoria */}
                                                    <td className="px-4 py-3">
                                                        <CategoryDropdown
                                                            categories={categories}
                                                            value={row.categoryId}
                                                            onChange={id => updateRow(t.id, { categoryId: id })}
                                                            transactionType={row.type}
                                                            mostUsed={mostUsedCategories}
                                                        />
                                                    </td>

                                                    {/* Ações */}
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center gap-1 justify-end">
                                                            {isDuplicate && (
                                                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-lg text-[9px] font-black">DUPLIC.</span>
                                                            )}
                                                            <button
                                                                onClick={() => updateRow(t.id, { ignored: true, manuallyEdited: true })}
                                                                title="Ignorar lançamento"
                                                                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors"
                                                            >
                                                                <X size={13} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Badge de recorrência */}
                                                {row.recurringMatch && (
                                                    <tr className={`${!hasCategory ? 'bg-amber-50/40' : ''}`}>
                                                        <td colSpan={6} className="px-4 pb-2">
                                                            <div className="flex items-center gap-3 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                                                                <Sparkles size={13} className="text-emerald-600 shrink-0" />
                                                                <p className="text-[10px] font-bold text-emerald-700">
                                                                    <span className="font-black">Conta recorrente encontrada</span> — similar a "<span className="italic">{row.recurringMatch.origDescription}</span>"
                                                                    · Categoria sugerida: <span className="font-black">{row.recurringMatch.categoryName}</span>
                                                                    · Última vez: {formatDate(row.recurringMatch.lastUsed)}
                                                                </p>
                                                                {!row.categoryId && (
                                                                    <button
                                                                        onClick={() => updateRow(t.id, { categoryId: row.recurringMatch!.categoryId || '' })}
                                                                        className="ml-auto shrink-0 px-3 py-1 bg-emerald-600 text-white text-[9px] font-black rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
                                                                    >
                                                                        Aplicar padrão
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── Barra de Confirmação ── */}
                    <div className={`p-6 rounded-[32px] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl transition-all
                        ${canConfirm ? 'bg-slate-900' : 'bg-slate-700'}`}>
                        <div className="flex items-center gap-5">
                            <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                                <ShieldCheck size={28} className="text-blue-400" />
                            </div>
                            <div>
                                <h4 className="text-lg font-black tracking-tight">
                                    {canConfirm ? 'Pronto para importar!' : 'Preencha as categorias obrigatórias'}
                                </h4>
                                <p className="text-white/60 text-xs font-medium">
                                    {canConfirm
                                        ? `${activeRows.length} lançamentos serão importados para conciliação`
                                        : `${rowsWithoutCategory.length} linha(s) sem categoria — obrigatório antes de confirmar`
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-5 w-full md:w-auto">
                            <div className="hidden md:flex flex-col items-end">
                                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Impacto Previsto</p>
                                <p className="text-lg font-black text-white">
                                    {formatCurrency(
                                        activeRows.reduce((acc, t) => {
                                            const row = rowStates[t.id];
                                            return acc + (row?.type === 'INCOME' ? t.amount : -t.amount);
                                        }, 0)
                                    )}
                                </p>
                            </div>

                            <button
                                onClick={handleConfirm}
                                disabled={loading || !canConfirm}
                                className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all transform active:translate-y-0
                                    ${canConfirm
                                        ? 'bg-blue-600 hover:bg-blue-500 hover:-translate-y-0.5 shadow-blue-500/20'
                                        : 'bg-slate-600 cursor-not-allowed opacity-50'}`}
                            >
                                {loading ? 'Processando...' : <><Check size={16} /> Confirmar Importação Inteligente <ArrowRight size={16} /></>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Info Rodapé ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { icon: Info, color: 'text-blue-500', title: 'Detecção Inteligente', text: 'Identificamos automaticamente lançamentos recorrentes e sugerimos categorias com base no histórico.' },
                    { icon: ShieldCheck, color: 'text-emerald-500', title: 'Privacidade de Dados', text: 'Os arquivos são processados localmente. Apenas os dados dos lançamentos são salvos no banco.' },
                    { icon: Calculator, color: 'text-indigo-500', title: 'Impacto no Saldo', text: 'O saldo só será atualizado após você efetivar os lançamentos na etapa de Conciliação Bancária.' },
                ].map(({ icon: Icon, color, title, text }) => (
                    <div key={title} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 flex items-start gap-3">
                        <Icon className={`${color} shrink-0 mt-0.5`} size={18} />
                        <div>
                            <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">{title}</h5>
                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{text}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StatementImport;
