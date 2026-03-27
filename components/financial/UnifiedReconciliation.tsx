import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { 
    Upload, FileText, CheckCircle2, AlertTriangle, X, ArrowRight, 
    Landmark, ShieldCheck, Info, Check, AlertCircle, RefreshCw,
    Search, Plus, ArrowRightLeft, MoreVertical, Trash2
} from 'lucide-react';
import { FinancialAccount, FinancialCategory, FinancialTransaction, User, FinancialContact } from '../../types';
import { formatCurrency } from '../../src/utils/formatters';
import { ImportTransaction, parseOFX, parseCSV, generateFileHash } from '../../src/lib/importUtils';
import DeleteConfirmationModal from '../modals/DeleteConfirmationModal';

type ViewStatus = 'EMPTY' | 'PROCESSING' | 'REVIEW' | 'SUMMARY';

interface UnifiedReconciliationProps {
    currentUser: User;
    accounts: FinancialAccount[];
    systemTransactions: FinancialTransaction[];
    importLogs: any[];
    addTransaction: any;
    updateTransactionStatus: any;
    addImportLog: any;
    updateImportLog: any;
    deleteImportLog: any;
    categories: FinancialCategory[];
    contacts: FinancialContact[];
    forcedAccountId?: string;
}

const UnifiedReconciliation: React.FC<UnifiedReconciliationProps> = ({ 
    currentUser,
    accounts,
    systemTransactions,
    importLogs,
    addTransaction,
    updateTransactionStatus,
    addImportLog,
    updateImportLog,
    deleteImportLog,
    categories,
    contacts,
    forcedAccountId
}) => {
    
    const [viewStatus, setViewStatus] = useState<ViewStatus>(() => {
        return (sessionStorage.getItem('c1_ur_status') as ViewStatus) || 'EMPTY';
    });
    const [selectedAccountId, setSelectedAccountId] = useState(() => {
        return forcedAccountId || sessionStorage.getItem('c1_ur_acc') || '';
    });
    const [file, setFile] = useState<File | null>(null);
    const [importedTransactions, setImportedTransactions] = useState<ImportTransaction[]>(() => {
        const saved = sessionStorage.getItem('c1_ur_txs');
        return saved ? JSON.parse(saved) : [];
    });
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    
    // Phase 1: Manual Reconciliation State
    const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
    const [reconciledIds, setReconciledIds] = useState<Set<string>>(new Set());
    const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());
    const [processingAction, setProcessingAction] = useState<string | null>(null);
    
    // Matching State
    const [isMatchingModalOpen, setIsMatchingModalOpen] = useState(false);
    const [usedSystemIds, setUsedSystemIds] = useState<Set<string>>(new Set());
    const [matchingSearch, setMatchingSearch] = useState('');
    
    const [fileHash, setFileHash] = useState<string | null>(() => sessionStorage.getItem('c1_ur_hash'));
    const [currentImportLogId, setCurrentImportLogId] = useState<string | null>(() => sessionStorage.getItem('c1_ur_log'));
    const [isDeletingImport, setIsDeletingImport] = useState<string | null>(null);
    const [importToDelete, setImportToDelete] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Persist state to prevent loss on refresh
    useEffect(() => {
        if (importedTransactions.length > 0) {
            sessionStorage.setItem('c1_ur_txs', JSON.stringify(importedTransactions));
            sessionStorage.setItem('c1_ur_status', viewStatus);
            if (fileHash) sessionStorage.setItem('c1_ur_hash', fileHash);
            if (currentImportLogId) sessionStorage.setItem('c1_ur_log', currentImportLogId);
            if (selectedAccountId) sessionStorage.setItem('c1_ur_acc', selectedAccountId);
        }
    }, [importedTransactions, viewStatus, fileHash, currentImportLogId, selectedAccountId]);

    // Edit State for New Transaction
    const [editDescription, setEditDescription] = useState('');
    const [editCategoryId, setEditCategoryId] = useState('');
    const [editContactId, setEditContactId] = useState('');

    // Transfer Mode State
    const [isTransferMode, setIsTransferMode] = useState(false);
    const [transferAccountId, setTransferAccountId] = useState('');

    const impulseSelected = useMemo(() => 
        importedTransactions.find(t => t.id === selectedImportId),
    [importedTransactions, selectedImportId]);

    // Initialize edit fields when a transaction is selected
    useEffect(() => {
        if (impulseSelected) {
            setEditDescription(impulseSelected.description);
            const defaultCat = categories.find(c => c.type === impulseSelected.type);
            setEditCategoryId(defaultCat?.id || '');
            setEditContactId('');
            setIsTransferMode(false);
            setTransferAccountId('');
        }
    }, [selectedImportId, impulseSelected, categories]);

    const handleDeleteImport = (id: string) => {
        setImportToDelete(id);
    };

    const confirmDeleteImport = async () => {
        if (!importToDelete) return;
        setIsDeletingImport(importToDelete);
        try {
            await deleteImportLog(importToDelete);
            alert('Importação excluída com sucesso.');
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir importação.');
        } finally {
            setIsDeletingImport(null);
            setImportToDelete(null);
        }
    };

    const selectedAccount = useMemo(() => 
        accounts.find(a => a.id === selectedAccountId),
        [accounts, selectedAccountId]
    );

    // Initial account selection
    useEffect(() => {
        if (forcedAccountId) {
            setSelectedAccountId(forcedAccountId);
        } else if (accounts.length > 0 && !selectedAccountId) {
            const def = accounts.find(a => (a as any).is_default) || accounts[0];
            setSelectedAccountId(def.id);
        }
    }, [accounts, selectedAccountId, forcedAccountId]);

    const handleFile = async (selectedFile: File) => {
        setError(null);
        setViewStatus('PROCESSING');
        
        if (!selectedAccountId) {
            setError('Por favor, selecione uma conta bancária antes de importar.');
            setViewStatus('EMPTY');
            return;
        }

        const name = selectedFile.name.toLowerCase();

        if (!name.endsWith('.ofx') && !name.endsWith('.csv')) {
            setError('Formato não suportado. Use .OFX ou .CSV');
            setViewStatus('EMPTY');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                const hash = await generateFileHash(content);
                setFileHash(hash);

                // Check for duplicate file
                if (importLogs.some(log => log.file_hash === hash)) {
                    setError('Este arquivo já foi importado anteriormente.');
                    setViewStatus('EMPTY');
                    return;
                }

                let parsed: ImportTransaction[] = [];
                if (name.endsWith('.ofx')) {
                    parsed = parseOFX(content);
                } else {
                    parsed = parseCSV(content);
                }

                // Create log entry for this session
                const log = await addImportLog({
                    account_id: selectedAccountId,
                    filename: selectedFile.name,
                    file_size: selectedFile.size,
                    file_hash: hash,
                    transaction_count: parsed.length,
                    entries_sum: parsed.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0),
                    exits_sum: parsed.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0),
                    period_start: parsed.sort((a, b) => a.date.localeCompare(b.date))[0].date,
                    period_end: parsed.sort((a, b) => b.date.localeCompare(a.date))[0].date,
                    import_date: new Date().toISOString()
                });
                setCurrentImportLogId(log.id);

                setImportedTransactions(parsed);
                setFile(selectedFile);
                // Artificial delay for "Premium" feel and to ensure user sees transition
                setTimeout(() => setViewStatus('REVIEW'), 800);
            } catch (err: any) {
                setError(`Erro ao processar: ${err.message}`);
                setViewStatus('EMPTY');
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

    const reset = () => {
        setFile(null);
        setImportedTransactions([]);
        setViewStatus('EMPTY');
        setError(null);
        setReconciledIds(new Set());
        setIgnoredIds(new Set());
        setSelectedImportId(null);
        setFileHash(null);
        setCurrentImportLogId(null);

        sessionStorage.removeItem('c1_ur_txs');
        sessionStorage.removeItem('c1_ur_status');
        sessionStorage.removeItem('c1_ur_hash');
        sessionStorage.removeItem('c1_ur_log');
        sessionStorage.removeItem('c1_ur_acc');
    };

    const handleAction = async (action: 'NEW' | 'IGNORE' | 'MATCH') => {
        if (!selectedImportId) return;
        const imp = importedTransactions.find(t => t.id === selectedImportId);
        if (!imp) return;

        if (action === 'IGNORE') {
            setIgnoredIds(prev => new Set([...prev, selectedImportId]));
            setSelectedImportId(null);
            return;
        }

        if (action === 'MATCH') {
            setIsMatchingModalOpen(true);
            return;
        }

        if (action === 'NEW') {
            if (isTransferMode && !transferAccountId) {
                alert('Selecione a conta de origem/destino para a transferência.');
                return;
            }

            setProcessingAction(selectedImportId);
            try {
                if (isTransferMode) {
                    const transferGroupId = `trf-${Date.now()}`;
                    
                    // Transação na conta de origem/destino (oposta)
                    await addTransaction({
                        description: editDescription || imp.description,
                        amount: imp.amount,
                        type: imp.type === 'INCOME' ? 'EXPENSE' : 'INCOME',
                        due_date: imp.date,
                        status: 'PAID',
                        payment_date: imp.date,
                        account_id: transferAccountId,
                        category_id: editCategoryId || (categories.find(c => c.type === (imp.type === 'INCOME' ? 'EXPENSE' : 'INCOME'))?.id as any) || null,
                        contact_id: editContactId || undefined,
                        import_id: undefined,
                        bank_txn_id: undefined,
                        is_transfer: true,
                        transfer_group_id: transferGroupId
                    });

                    // Transação principal (importada)
                    await addTransaction({
                        description: editDescription || imp.description,
                        amount: imp.amount,
                        type: imp.type,
                        due_date: imp.date,
                        status: 'PAID',
                        payment_date: imp.date,
                        account_id: selectedAccountId,
                        category_id: editCategoryId || (categories.find(c => c.type === imp.type)?.id as any) || null,
                        contact_id: editContactId || undefined,
                        import_id: currentImportLogId || undefined,
                        bank_txn_id: imp.fitid || imp.hash,
                        is_transfer: true,
                        transfer_group_id: transferGroupId
                    });

                } else {
                    await addTransaction({
                        description: editDescription || imp.description,
                        amount: imp.amount,
                        type: imp.type,
                        due_date: imp.date,
                        status: 'PAID',
                        payment_date: imp.date,
                        account_id: selectedAccountId,
                        category_id: editCategoryId || (categories.find(c => c.type === imp.type)?.id as any),
                        contact_id: editContactId || undefined,
                        import_id: currentImportLogId || undefined,
                        bank_txn_id: imp.fitid || imp.hash
                    });
                }
                setReconciledIds(prev => new Set([...prev, selectedImportId]));
                setSelectedImportId(null);
            } catch (err: any) {
                console.error(err);
                alert('Erro ao criar lançamento.');
            } finally {
                setProcessingAction(null);
            }
        }
    };

    const handleConfirmMatch = async (systemId: string) => {
        if (!selectedImportId) return;
        setProcessingAction(selectedImportId);
        try {
            await updateTransactionStatus(
                systemId, 
                'PAID', 
                selectedAccountId, 
                undefined, 
                currentImportLogId || undefined
            );
            setReconciledIds(prev => new Set([...prev, selectedImportId]));
            setSelectedImportId(null);
            setIsMatchingModalOpen(false);
        } catch (err) {
            console.error(err);
            alert('Erro ao conciliar lançamentos.');
        } finally {
            setProcessingAction(null);
        }
    };

    const handleFinalize = async () => {
        if (!currentImportLogId) {
            setViewStatus('SUMMARY');
            return;
        }

        const reconciled = importedTransactions.filter(t => reconciledIds.has(t.id));
        const ignored = importedTransactions.filter(t => ignoredIds.has(t.id));
        const others = importedTransactions.filter(t => !reconciledIds.has(t.id) && !ignoredIds.has(t.id));

        try {
            // @ts-ignore
            await updateImportLog(currentImportLogId, {
                reconciled_count: reconciled.length,
                reconciled_sum: reconciled.reduce((acc, t) => acc + t.amount, 0),
                created_count: others.length,
                created_sum: others.reduce((acc, t) => acc + t.amount, 0)
            });
            setViewStatus('SUMMARY');
        } catch (err) {
            console.error('Error finalizing import log:', err);
            setViewStatus('SUMMARY'); // Fallback to still show summary
        }
    };

    const existingTxnIds = useMemo(() => {
        return new Set(
            systemTransactions
                .map(t => (t as any).bank_txn_id)
                .filter(Boolean)
        );
    }, [systemTransactions]);

    const potentialMatches = useMemo(() => {
        if (!selectedImportId) return [];
        const imp = importedTransactions.find(t => t.id === selectedImportId);
        if (!imp) return [];

        return systemTransactions
            .filter(t => {
                if (t.status !== 'PENDING') return false;
                if (t.account_id !== selectedAccountId) return false;
                if (t.type !== imp.type) return false;
                if (matchingContactFilter && t.contact_id !== matchingContactFilter) return false;
                if (matchingSearch) {
                    const s = matchingSearch.toLowerCase();
                    return t.description.toLowerCase().includes(s) || 
                           t.amount.toString().includes(s);
                }
                return true;
            })
            .sort((a, b) => {
                // Priority to same amount
                const aSameAmt = Math.abs(Number(a.amount) - imp.amount) < 0.01 ? 1 : 0;
                const bSameAmt = Math.abs(Number(b.amount) - imp.amount) < 0.01 ? 1 : 0;
                if (aSameAmt !== bSameAmt) return bSameAmt - aSameAmt;
                
                // Then by date proximity
                return Math.abs(new Date(a.due_date).getTime() - new Date(imp.date).getTime()) - 
                       Math.abs(new Date(b.due_date).getTime() - new Date(imp.date).getTime());
            })
            .slice(0, 10);
    }, [selectedImportId, systemTransactions, selectedAccountId, matchingSearch, importedTransactions]);

    const pendingCount = useMemo(() => {
        return importedTransactions.length - reconciledIds.size - ignoredIds.size;
    }, [importedTransactions, reconciledIds, ignoredIds]);

    const suggestions = useMemo(() => {
        const map = new Map<string, { systemId: string, confidence: 'HIGH' | 'MEDIUM' | 'MULTIPLE', count: number }>();

        importedTransactions.forEach(imp => {
            if (reconciledIds.has(imp.id) || ignoredIds.has(imp.id)) return;

            // Find candidates in system
            const candidates = systemTransactions.filter(sys => 
                sys.status === 'PENDING' && 
                sys.account_id === selectedAccountId &&
                !usedSystemIds.has(sys.id) &&
                sys.type === imp.type &&
                Math.abs(Number(sys.amount) - imp.amount) < 0.01
            );

            if (candidates.length === 0) return;

            // If we have multiple candidates with the exact same value and type, 
            // we should be careful about picking one automatically.
            if (candidates.length > 1) {
                // Try to find if one is much closer in date
                const veryClose = candidates.filter(sys => {
                    const diffDays = Math.abs(new Date(sys.due_date).getTime() - new Date(imp.date).getTime()) / (1000 * 60 * 60 * 24);
                    return diffDays <= 1;
                });

                if (veryClose.length === 1) {
                    map.set(imp.id, { systemId: veryClose[0].id, confidence: 'HIGH', count: 1 });
                    return;
                }

                map.set(imp.id, { systemId: candidates[0].id, confidence: 'MULTIPLE', count: candidates.length });
                return;
            }

            // Single candidate logic
            const sys = candidates[0];
            const diffDays = Math.abs(new Date(sys.due_date).getTime() - new Date(imp.date).getTime()) / (1000 * 60 * 60 * 24);
            
            if (diffDays <= 3) {
                map.set(imp.id, { systemId: sys.id, confidence: 'HIGH', count: 1 });
            } else if (diffDays <= 15) {
                map.set(imp.id, { systemId: sys.id, confidence: 'MEDIUM', count: 1 });
            }
        });

        return map;
    }, [importedTransactions, systemTransactions, selectedAccountId, reconciledIds, ignoredIds]);

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-700">
            {/* ── Header ── */}
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-5">
                    <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-xl shadow-blue-100 transform -rotate-2">
                        <ArrowRightLeft size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Conciliação Inteligente</h2>
                        <p className="text-slate-400 font-medium text-sm">
                            {viewStatus === 'EMPTY' && 'Arraste seu extrato para começar'}
                            {viewStatus === 'PROCESSING' && 'Analisando dados do banco...'}
                            {viewStatus === 'REVIEW' && 'Revise e concilie seus lançamentos'}
                        </p>
                    </div>
                </div>
                
                {viewStatus === 'REVIEW' && (
                    <button 
                        onClick={reset}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-2xl font-bold transition-all text-xs"
                    >
                        <X size={16} /> Trocar Arquivo
                    </button>
                )}
            </div>

            {/* ── Content States ── */}
            {viewStatus === 'EMPTY' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {importedTransactions.length > 0 && (
                        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-slate-200 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />
                            <div className="flex items-center gap-6 relative z-10">
                                <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <RefreshCw size={32} className="animate-spin-slow" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black tracking-tight">Conciliação Pendente</h3>
                                    <p className="text-slate-400 text-sm font-medium">
                                        Você possui <span className="text-blue-400 font-bold">{pendingCount} lançamentos</span> para revisar deste banco.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto relative z-10">
                                <button 
                                    onClick={reset}
                                    className="flex-1 md:flex-none px-6 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all text-xs uppercase tracking-widest"
                                >
                                    Descartar
                                </button>
                                <button 
                                    onClick={() => setViewStatus('REVIEW')}
                                    className="flex-1 md:flex-none px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all text-xs uppercase tracking-widest shadow-xl shadow-blue-900/40"
                                >
                                    Retomar Agora
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[500px]">
                        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                            <Landmark size={14} className="text-blue-500" /> Configuração
                        </h3>
                        
                        <div className="space-y-6 flex-1">
                            <div className={`space-y-3 ${forcedAccountId ? 'hidden' : ''}`}>
                                <label className="block text-sm font-black text-slate-700 ml-1">Conta Bancária</label>
                                <select
                                    value={selectedAccountId}
                                    onChange={e => setSelectedAccountId(e.target.value)}
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm text-slate-700 focus:border-blue-500 outline-none transition-all cursor-pointer"
                                >
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedAccount && (
                                <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100/50 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-blue-400 font-black uppercase tracking-wider">Saldo em Conta</span>
                                        <span className="text-blue-700 font-black text-lg">{formatCurrency(selectedAccount.current_balance)}</span>
                                    </div>
                                    <div className="w-full h-1 bg-blue-100 rounded-full overflow-hidden">
                                        <div className="w-full h-full bg-blue-500 animate-pulse" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                            <ShieldCheck size={20} className="text-emerald-500" />
                            <p className="text-[10px] text-slate-400 font-bold leading-tight uppercase tracking-wider">
                                Processamento local e seguro de dados bancários
                            </p>
                        </div>
                    </div>

                    <div 
                        onDrop={onDrop}
                        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onClick={() => fileInputRef.current?.click()}
                        className={`md:col-span-2 relative group cursor-pointer transition-all duration-500
                            ${isDragging ? 'scale-[0.98]' : 'hover:scale-[1.01]'}`}
                    >
                        <input ref={fileInputRef} type="file" className="hidden" accept=".ofx,.csv"
                            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                        
                        <div className={`h-full border-4 border-dashed rounded-[3.5rem] flex flex-col items-center justify-center p-12 text-center transition-all duration-500
                            ${isDragging ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 bg-white group-hover:border-blue-400 group-hover:bg-slate-50/30'}`}>
                            
                            <div className="mb-8 w-24 h-24 bg-blue-100 rounded-[2rem] flex items-center justify-center text-blue-600 shadow-2xl shadow-blue-200 transform group-hover:rotate-6 transition-transform duration-700">
                                <Upload size={40} />
                            </div>
                            
                            <h3 className="text-2xl font-black text-slate-800 mb-2">Importar Extrato</h3>
                            <p className="text-slate-400 font-medium max-w-xs mx-auto mb-8">
                                Arraste seu arquivo <span className="text-blue-600 font-black">.OFX</span> ou <span className="text-blue-600 font-black">.CSV</span> para processar os lançamentos em lote.
                            </p>

                            <div className="flex gap-4">
                                <div className="px-4 py-2 bg-slate-100 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">CSV</div>
                                <div className="px-4 py-2 bg-slate-100 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">OFX</div>
                            </div>
                        </div>

                        {error && (
                            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-3 text-xs font-black shadow-xl animate-in fade-in slide-in-from-bottom-4">
                                <AlertCircle size={18} /> {error}
                            </div>
                        )}
                    </div>
                </div>

                    {importLogs && importLogs.length > 0 && (
                        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3 mb-6">
                                <RefreshCw size={24} className="text-blue-500" />
                                Histórico de Importações
                            </h3>
                            
                            <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {[...importLogs].sort((a, b) => new Date(b.import_date).getTime() - new Date(a.import_date).getTime()).map(log => {
                                    const account = accounts.find(a => a.id === log.account_id);
                                    return (
                                        <div key={log.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-50/50 hover:bg-slate-50 rounded-[2rem] border border-slate-100 transition-all group">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                                                    <FileText size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-800 line-clamp-1">{log.filename}</h4>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                            Data: {new Date(log.import_date).toLocaleDateString('pt-BR')}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                            Conta: {account?.name || 'Não encontrada'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between md:justify-end gap-8 mt-4 md:mt-0">
                                                <div className="text-right hidden sm:block">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lançamentos</p>
                                                    <p className="text-sm font-black text-slate-800">{log.transaction_count} itens</p>
                                                </div>
                                                
                                                <button
                                                    onClick={() => handleDeleteImport(log.id)}
                                                    disabled={isDeletingImport === log.id}
                                                    className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                                                    title="Desfazer Importação"
                                                >
                                                    {isDeletingImport === log.id ? (
                                                        <RefreshCw size={18} className="animate-spin" />
                                                    ) : (
                                                        <X size={18} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {viewStatus === 'PROCESSING' && (
                <div className="bg-white h-[500px] rounded-[3rem] border border-slate-100 flex flex-col items-center justify-center text-center p-12">
                    <div className="relative w-32 h-32 mb-8">
                        <div className="absolute inset-0 border-8 border-slate-100 rounded-full" />
                        <div className="absolute inset-0 border-8 border-blue-600 rounded-full border-t-transparent animate-spin" />
                        <div className="absolute inset-4 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                            <RefreshCw size={32} className="animate-spin-slow" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Processando seu extrato...</h3>
                    <p className="text-slate-400 font-medium max-w-sm mx-auto">
                        Estamos lendo os dados do arquivo e preparando a visualização unificada para conciliação.
                    </p>
                </div>
            )}

            {viewStatus === 'REVIEW' && (
                <div className="space-y-6">
                    {/* Summary row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Importado</p>
                            <p className="text-2xl font-black text-slate-800">{importedTransactions.length}</p>
                        </div>
                        <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-emerald-500">Entradas</p>
                            <p className="text-2xl font-black text-emerald-600">
                                {importedTransactions.filter(t => t.type === 'INCOME').length}
                            </p>
                        </div>
                        <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-rose-500">Saídas</p>
                            <p className="text-2xl font-black text-rose-600">
                                {importedTransactions.filter(t => t.type === 'EXPENSE').length}
                            </p>
                        </div>
                        <div className="bg-blue-600 p-6 rounded-3xl shadow-xl shadow-blue-100 flex items-center justify-between text-white">
                            <div>
                                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Pendentes</p>
                                <p className="text-2xl font-black">
                                    {importedTransactions.filter(t => !reconciledIds.has(t.id) && !ignoredIds.has(t.id)).length}
                                </p>
                            </div>
                            <FileText size={24} className="opacity-40" />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white/70 backdrop-blur-lg rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col md:flex-row h-[600px]">
                        {/* Main Table Area */}
                        <div className="flex-1 overflow-y-auto border-r border-slate-50">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-white/90 backdrop-blur-md z-10">
                                    <tr className="border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição do Banco</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {importedTransactions.map(t => {
                                        const isReconciled = reconciledIds.has(t.id);
                                        const isIgnored = ignoredIds.has(t.id);
                                        const isSelected = selectedImportId === t.id;
                                        const isDuplicate = existingTxnIds.has(t.fitid) || existingTxnIds.has(t.hash);
                                        
                                        return (
                                            <tr 
                                                key={t.id}
                                                onClick={() => !isReconciled && !isIgnored && !isDuplicate && setSelectedImportId(t.id)}
                                                className={`group border-b border-slate-50 transition-all cursor-pointer
                                                    ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}
                                                    ${(isReconciled || isIgnored || isDuplicate) ? 'opacity-50 grayscale pointer-events-none bg-slate-50/30' : ''}`}
                                            >
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-slate-800 uppercase leading-tight line-clamp-1 group-hover:text-blue-600 transition-colors">
                                                            {t.description}
                                                        </span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                                                            {isDuplicate && (
                                                                <span className="text-[9px] text-amber-600 font-black uppercase flex items-center gap-1">
                                                                    <AlertTriangle size={10} /> Já Importado
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <span className={`text-sm font-black ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {t.type === 'INCOME' ? '+' : '−'} {formatCurrency(t.amount)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    {isReconciled ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase">
                                                            <Check size={10} /> Conciliado
                                                        </span>
                                                    ) : isIgnored ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase">
                                                            Ignorado
                                                        </span>
                                                    ) : (
                                                        <div className="flex flex-col items-end gap-1.5">
                                                            {suggestions.get(t.id) && (
                                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase whitespace-nowrap
                                                                    ${suggestions.get(t.id)?.confidence === 'HIGH' ? 'bg-emerald-500 text-white' : 
                                                                      suggestions.get(t.id)?.confidence === 'MULTIPLE' ? 'bg-blue-500 text-white' : 'bg-amber-400 text-white'}`}>
                                                                    {suggestions.get(t.id)?.confidence === 'HIGH' ? 'Match 100%' : 
                                                                     suggestions.get(t.id)?.confidence === 'MULTIPLE' ? `${suggestions.get(t.id)?.count} Opções` : 'Sugestão'}
                                                                </span>
                                                            )}
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all
                                                                ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                                                                Pendente
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Side Action Panel */}
                        <div className="w-full md:w-[400px] bg-slate-50/50 p-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                            {selectedImportId ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Ações Contextuais</h4>
                                        <button onClick={() => setSelectedImportId(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lançamento Selecionado</p>
                                        <div className="flex justify-between items-start">
                                            <p className="text-xs font-black text-slate-800 uppercase leading-relaxed max-w-[180px]">
                                                {importedTransactions.find(t => t.id === selectedImportId)?.description}
                                            </p>
                                            <p className={`text-sm font-black ${importedTransactions.find(t => t.id === selectedImportId)?.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {formatCurrency(importedTransactions.find(t => t.id === selectedImportId)?.amount || 0)}
                                            </p>
                                        </div>
                                    </div>

                                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            {suggestions.get(selectedImportId) ? 'Sugestão do Sistema' : 'Ações Disponíveis'}
                                        </p>
                                        
                                        {(() => {
                                            const sug = suggestions.get(selectedImportId);
                                            if (!sug) return (
                                                <div className="space-y-4 pt-2 animate-in fade-in duration-500">
                                                    <div className="space-y-4 p-5 bg-white rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                                                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                                        
                                                        <div className="space-y-1.5">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                                                <FileText size={10} className="text-blue-500" />
                                                                Título do Lançamento
                                                            </label>
                                                            <input 
                                                                type="text"
                                                                value={editDescription}
                                                                onChange={(e) => setEditDescription(e.target.value)}
                                                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-300"
                                                                placeholder="Descreva o lançamento..."
                                                            />
                                                        </div>

                                                        <div className="grid grid-cols-1 gap-4">
                                                            <div className="space-y-1.5 flex items-center gap-2 mt-2">
                                                                <input 
                                                                    type="checkbox" 
                                                                    id="isTransferMode"
                                                                    checked={isTransferMode}
                                                                    onChange={(e) => setIsTransferMode(e.target.checked)}
                                                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                                                />
                                                                <label htmlFor="isTransferMode" className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer mt-0.5">
                                                                    É uma transferência entre contas?
                                                                </label>
                                                            </div>

                                                            {isTransferMode && (
                                                                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                                                        {impulseSelected?.type === 'INCOME' ? 'Conta de Origem (De onde veio?)' : 'Conta de Destino (Para onde foi?)'}
                                                                    </label>
                                                                    <select
                                                                        value={transferAccountId}
                                                                        onChange={(e) => setTransferAccountId(e.target.value)}
                                                                        className="w-full px-4 py-2.5 bg-blue-50/50 border border-blue-100 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all cursor-pointer"
                                                                    >
                                                                        <option value="">Selecione a conta...</option>
                                                                        {accounts.filter(a => a.id !== selectedAccountId).map(acc => (
                                                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            )}

                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                                                                <select
                                                                    value={editCategoryId}
                                                                    onChange={(e) => setEditCategoryId(e.target.value)}
                                                                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all cursor-pointer"
                                                                >
                                                                    <option value="">Selecione...</option>
                                                                    {categories.filter(c => c.type === impulseSelected?.type).map(cat => (
                                                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente/Favorecido</label>
                                                                <select
                                                                    value={editContactId}
                                                                    onChange={(e) => setEditContactId(e.target.value)}
                                                                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all cursor-pointer"
                                                                >
                                                                    <option value="">Nenhum</option>
                                                                    {contacts.map(contact => (
                                                                        <option key={contact.id} value={contact.id}>{contact.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <button 
                                                            onClick={() => handleAction('NEW')}
                                                            disabled={processingAction === selectedImportId}
                                                            className="w-full mt-2 py-4 bg-slate-900 hover:bg-black text-white rounded-[1.2rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-slate-200"
                                                        >
                                                            {processingAction === selectedImportId ? (
                                                                <RefreshCw size={14} className="animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <Plus size={14} className="text-blue-400" />
                                                                    Confirmar e Criar
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>

                                                    <button 
                                                        onClick={() => handleAction('MATCH')}
                                                        className="w-full py-4 bg-white hover:bg-blue-50 text-blue-600 border-2 border-dashed border-blue-200 rounded-[1.2rem] font-black text-[10px] uppercase tracking-widest transition-all hover:border-blue-400 flex items-center justify-center gap-2 group"
                                                    >
                                                        <Search size={14} className="group-hover:scale-110 transition-transform" />
                                                        Buscar Manualmente
                                                    </button>
                                                </div>
                                            );

                                            if (sug.confidence === 'MULTIPLE') {
                                                return (
                                                    <div className="p-5 bg-blue-50 rounded-3xl border border-blue-200 space-y-3">
                                                        <div className="flex items-center gap-2 text-blue-700">
                                                            <Info size={16} />
                                                            <p className="text-[10px] font-black uppercase">Múltiplos Candidatos</p>
                                                        </div>
                                                        <p className="text-[10px] text-blue-600 font-medium leading-relaxed">
                                                            Encontramos {sug.count} lançamentos com o mesmo valor. Use a busca manual para selecionar o correto.
                                                        </p>
                                                        <button 
                                                            onClick={() => handleAction('MATCH')}
                                                            className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                                        >
                                                            Abrir Busca Manual
                                                        </button>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="p-1 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] shadow-xl shadow-emerald-500/20">
                                                    <div className="bg-white rounded-[1.8rem] p-5 space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase">
                                                                {sug.confidence === 'HIGH' ? 'Match Perfeito' : 'Sugestão Alta'}
                                                            </span>
                                                            <ShieldCheck size={16} className="text-emerald-500" />
                                                        </div>
                                                        
                                                        {(() => {
                                                            const sysMatch = systemTransactions.find(s => s.id === sug.systemId);
                                                            if (!sysMatch) return null;
                                                            return (
                                                                <div className="space-y-1">
                                                                    <p className="text-xs font-black text-slate-800 uppercase leading-tight line-clamp-1">{sysMatch.description}</p>
                                                                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
                                                                        <span>{new Date(sysMatch.due_date).toLocaleDateString('pt-BR')}</span>
                                                                        <span>{formatCurrency(sysMatch.amount)}</span>
                                                                    </div>
                                                                    <p className="text-[9px] text-emerald-600 font-bold mt-1 uppercase tracking-tight flex items-center gap-1">
                                                                        <CheckCircle2 size={10} />
                                                                        {sug.confidence === 'HIGH' ? 'Valor e data compatíveis' : 'Sugestão automática'}
                                                                    </p>
                                                                </div>
                                                            );
                                                        })()}

                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => handleConfirmMatch(sug.systemId)}
                                                                disabled={processingAction === selectedImportId}
                                                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1rem] font-black text-[9px] uppercase tracking-wider transition-all disabled:opacity-50"
                                                            >
                                                                {processingAction === selectedImportId ? (
                                                                    <RefreshCw size={12} className="animate-spin mx-auto" />
                                                                ) : 'Confirmar Match'}
                                                            </button>
                                                            <button 
                                                                onClick={() => handleAction('MATCH')}
                                                                className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-[1rem] transition-all"
                                                                title="Outras opções"
                                                            >
                                                                <MoreVertical size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div className="h-px bg-slate-200 my-2" />

                                        <button 
                                            onClick={() => handleAction('IGNORE')}
                                            className="w-full py-3 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                        >
                                            <X size={14} />
                                            Ignorar Lançamento
                                        </button>

                                        <div className="mt-auto pt-4">
                                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                                                <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                                <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                                                    Na <span className="font-black">Fase 1</span>, as ações manuais garantem controle total sobre cada linha do seu extrato.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-60 grayscale scale-95 transition-all">
                                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 mb-6">
                                        <ArrowRightLeft size={32} />
                                    </div>
                                    <h4 className="text-sm font-black text-slate-800 mb-2">Selecione um item</h4>
                                    <p className="text-[11px] text-slate-400 font-medium max-w-[200px] mb-8">
                                        Clique em uma linha da tabela para ver as ações de conciliação disponíveis para aquele lançamento.
                                    </p>

                                    <div className="w-full space-y-3">
                                        <button 
                                            onClick={handleFinalize}
                                            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 size={16} /> Finalizar Conciliação
                                        </button>
                                        <button 
                                            onClick={reset}
                                            className="w-full py-4 bg-white text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all border border-slate-100"
                                        >
                                            Cancelar e Sair
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* ── Summary View ── */}
            {viewStatus === 'SUMMARY' && (
                <div className="flex flex-col items-center justify-center min-h-[500px] text-center animate-in zoom-in-95 duration-500">
                    <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-emerald-500/10">
                        <Check size={48} strokeWidth={3} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2">Conciliação Concluída!</h2>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-12">O seu caixa foi atualizado com sucesso</p>

                    <div className="grid grid-cols-3 gap-6 w-full max-w-2xl mb-12">
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                            <p className="text-2xl font-black text-emerald-600 mb-1">{reconciledIds.size}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vinculados</p>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                            <p className="text-2xl font-black text-blue-600 mb-1">
                                {importedTransactions.filter(t => !reconciledIds.has(t.id) && !ignoredIds.has(t.id)).length}
                            </p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Criados</p>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                            <p className="text-2xl font-black text-slate-400 mb-1">{ignoredIds.size}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ignorados</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button 
                            onClick={reset}
                            className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                        >
                            Importar Novo Arquivo
                        </button>
                    </div>
                </div>
            )}

            {/* ── Matching Modal (Phase 1: Manual) ── */}
            {isMatchingModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                    <div className="bg-white/95 backdrop-blur-xl border border-white/60 w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden transform transition-all scale-100 flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 bg-blue-600 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black flex items-center gap-3">
                                    <RefreshCw size={24} /> Conciliação Manual
                                </h3>
                                <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-1">Busque um lançamento no sistema</p>
                            </div>
                            <button onClick={() => setIsMatchingModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                             <div className="flex flex-col gap-4">
                                <div className="relative group">
                                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                                    <input 
                                        type="text"
                                        placeholder="Buscar por descrição, valor ou cliente..."
                                        value={matchingSearch}
                                        onChange={(e) => setMatchingSearch(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                                    />
                                    {matchingSearch && (
                                        <button 
                                            onClick={() => setMatchingSearch('')}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {(() => {
                                    const imp = importedTransactions.find(t => t.id === selectedImportId)!;
                                    const filtered = systemTransactions.filter(t => {
                                        if (t.status !== 'PENDING') return false;
                                        if (t.account_id !== selectedAccountId) return false;
                                        if (t.type !== imp.type) return false;
                                        if (usedSystemIds.has(t.id)) return false;
                                        
                                        if (matchingSearch) {
                                            const s = matchingSearch.toLowerCase();
                                            const contactName = contacts.find(c => c.id === t.contact_id)?.name.toLowerCase() || '';
                                            const categoryName = categories.find(c => c.id === t.category_id)?.name.toLowerCase() || '';

                                            return t.description.toLowerCase().includes(s) || 
                                                   t.amount.toString().includes(s) ||
                                                   contactName.includes(s) ||
                                                   categoryName.includes(s);
                                        }
                                        return true;
                                    });

                                    if (filtered.length === 0) {
                                        return (
                                            <div className="py-20 flex flex-col items-center justify-center text-center gap-4 border-2 border-dashed border-slate-100 rounded-[2rem]">
                                                <div className="p-6 bg-slate-50 text-slate-300 rounded-full">
                                                    <AlertCircle size={48} strokeWidth={1} />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhum lançamento pendente encontrado</p>
                                                    <p className="text-xs text-slate-300 font-medium tracking-tight">Altere os filtros ou crie um novo lançamento</p>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return filtered.map(t => (
                                        <div key={t.id} className="group p-5 bg-white hover:bg-slate-50 border border-slate-100 rounded-3xl transition-all hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 flex items-center justify-between">
                                            <div className="flex items-center gap-5">
                                                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:border-blue-100 group-hover:text-blue-600 transition-all text-slate-400">
                                                    <FileText size={18} />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-black text-slate-800 uppercase leading-snug">{t.description}</p>
                                                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                        <span>{new Date(t.due_date).toLocaleDateString('pt-BR')}</span>
                                                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                                        <span className="text-blue-500/70">{t.category_name || 'Sem categoria'}</span>
                                                        {t.contact_id && (
                                                            <>
                                                                <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                                                <span className="text-emerald-500/70">{t.contact_name}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-6">
                                                <p className={`text-sm font-black ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {formatCurrency(t.amount)}
                                                </p>
                                                <button 
                                                    onClick={() => {
                                                        handleConfirmMatch(t.id);
                                                        setIsMatchingModalOpen(false);
                                                    }}
                                                    className="px-6 py-2.5 bg-slate-900 group-hover:bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                                >
                                                    Vincular
                                                </button>
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-[10px] text-slate-400 font-bold uppercase max-w-[200px]">
                                Selecione o lançamento que corresponde ao extrato para liquidar automaticamente.
                            </p>
                            <button 
                                onClick={() => setIsMatchingModalOpen(false)}
                                className="px-6 py-3 text-slate-400 hover:text-slate-600 font-black text-xs uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {importToDelete && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl border border-white/20 overflow-hidden transform transition-all scale-100 flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="bg-red-50 p-6 flex flex-col items-center justify-center text-center border-b border-red-100 relative">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
                                <AlertTriangle size={32} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-xl font-black text-red-900 tracking-tight">Excluir Importação</h3>
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1">Ação Irreversível</p>
                            <button
                                onClick={() => setImportToDelete(null)}
                                className="absolute top-6 right-6 p-2 bg-white/50 hover:bg-white rounded-full text-red-400 hover:text-red-600 transition-colors shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-8 text-center space-y-4 bg-white">
                            <p className="text-slate-600 text-sm font-medium leading-relaxed">
                                ATENÇÃO: Deseja realmente excluir esta importação e <strong className="text-red-600">todos os lançamentos</strong> gerados por ela?
                            </p>
                            <p className="text-[11px] text-slate-400 uppercase tracking-widest font-bold">
                                Esta ação não poderá ser desfeita.
                            </p>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => setImportToDelete(null)}
                                className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 font-black text-[11px] uppercase tracking-widest rounded-2xl hover:bg-slate-100 hover:text-slate-700 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDeleteImport}
                                disabled={isDeletingImport !== null}
                                className="flex-1 py-4 bg-red-600 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl hover:bg-red-700 shadow-xl shadow-red-600/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isDeletingImport !== null ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                Sim, Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UnifiedReconciliation;
