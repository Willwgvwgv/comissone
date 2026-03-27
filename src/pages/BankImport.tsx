import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, Landmark, ArrowRight, Search, FileText, X, AlertCircle } from 'lucide-react';
import { FinancialAccount, FinancialTransaction, FinancialCategory } from '../../types';
import { ImportTransaction, parseOFX, parseCSV } from '../../src/lib/importUtils';
import AccountReconciliation from '../../components/financial/AccountReconciliation';

interface BankImportProps {
    accounts: FinancialAccount[];
    transactions: FinancialTransaction[];
    categories: FinancialCategory[];
    onAccountSelect: (account: FinancialAccount) => void;
    updateTransactionStatus: (id: string, status: 'PAID' | 'PENDING') => Promise<void>;
    addTransaction: (transaction: any) => Promise<any>;
    refresh: () => void;
}

const BankImport: React.FC<BankImportProps> = ({
    accounts,
    transactions,
    categories,
    onAccountSelect,
    updateTransactionStatus,
    addTransaction,
    refresh
}) => {
    const [selectedAccount, setSelectedAccount] = useState<FinancialAccount | null>(null);
    const [importedTransactions, setImportedTransactions] = useState<ImportTransaction[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const bankAccounts = accounts.filter(a => a.type === 'BANK');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            try {
                let parsed: ImportTransaction[] = [];
                if (file.name.toLowerCase().endsWith('.ofx')) {
                    parsed = parseOFX(content);
                } else if (file.name.toLowerCase().endsWith('.csv')) {
                    parsed = parseCSV(content);
                } else {
                    alert('Formato de arquivo não suportado. Use .OFX ou .CSV');
                    return;
                }
                setImportedTransactions(parsed);
                refresh();
            } catch (err) {
                console.error('Erro ao processar arquivo:', err);
                alert('Erro ao processar o arquivo. Verifique o formato.');
            }
        };
        reader.readAsText(file);
    };

    const handleConfirmMatch = async (importId: string, systemId: string) => {
        try {
            await updateTransactionStatus(systemId, 'PAID');
            setImportedTransactions(prev => prev.filter(t => t.id !== importId));
            refresh();
        } catch (error) {
            console.error('Erro ao conciliar:', error);
            alert('Erro ao confirmar conciliação.');
        }
    };

    const handleCreateNew = async (imp: ImportTransaction & { category_id: string }) => {
        try {
            await addTransaction({
                description: imp.description,
                amount: imp.amount,
                type: imp.type,
                due_date: imp.date,
                status: 'PAID',
                payment_date: imp.date,
                account_id: selectedAccount?.id,
                category_id: imp.category_id
            });
            setImportedTransactions(prev => prev.filter(t => t.id !== imp.id));
            refresh();
        } catch (error) {
            console.error('Erro ao criar transação:', error);
            alert('Erro ao criar novo lançamento.');
        }
    };

    const handleTransfer = async (importId: string, targetAccountId: string) => {
        const imp = importedTransactions.find(t => t.id === importId);
        if (!imp || !selectedAccount) return;

        try {
            // 1. Lançamento pago na conta atual
            await addTransaction({
                description: `TRANSFERÊNCIA - ${imp.description}`,
                amount: imp.amount,
                type: imp.type,
                due_date: imp.date,
                status: 'PAID',
                payment_date: imp.date,
                account_id: selectedAccount.id,
                category_id: null
            });

            // 2. Lançamento pago na conta destino
            await addTransaction({
                description: `TRANSFERÊNCIA - ${imp.description}`,
                amount: imp.amount,
                type: imp.type === 'INCOME' ? 'EXPENSE' : 'INCOME',
                due_date: imp.date,
                status: 'PAID',
                payment_date: imp.date,
                account_id: targetAccountId,
                category_id: null
            });

            setImportedTransactions(prev => prev.filter(t => t.id !== importId));
            refresh();
        } catch (error) {
            console.error('Erro na transferência:', error);
            alert('Erro ao realizar transferência.');
        }
    };

    if (selectedAccount && importedTransactions.length > 0) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <Landmark size={24} />
                        </div>
                        <div>
                            <h2 className="font-black text-slate-800 uppercase tracking-tight leading-tight">{selectedAccount.name}</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Conciliação em Andamento</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            if (confirm('Deseja interromper a conciliação? Dados não confirmados serão perdidos.')) {
                                setImportedTransactions([]);
                                setSelectedAccount(null);
                            }
                        }}
                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <AccountReconciliation 
                    account={selectedAccount}
                    importedTransactions={importedTransactions}
                    systemTransactions={transactions.filter(t => t.account_id === selectedAccount.id)}
                    categories={categories}
                    accounts={accounts}
                    onConfirmMatch={handleConfirmMatch}
                    onCreateNew={handleCreateNew}
                    onTransfer={handleTransfer}
                    onIgnore={(id) => setImportedTransactions(prev => prev.filter(t => t.id !== id))}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".ofx,.csv"
                className="hidden"
            />

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">CONCILIAÇÃO BANCÁRIA</h1>
                    <p className="text-slate-500 font-medium">Selecione uma conta para importar o extrato e validar seu caixa.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bankAccounts.map(account => (
                    <div 
                        key={account.id}
                        onClick={() => {
                            setSelectedAccount(account);
                            fileInputRef.current?.click();
                        }}
                        className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                            <Landmark size={80} className="text-blue-600" />
                        </div>
                        
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                                <Landmark size={24} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 text-lg leading-tight">{account.name}</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Saldo: {account.current_balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            </div>
                        </div>

                        <button className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 group-hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/10">
                            <Upload size={18} /> Importar Extrato
                        </button>
                    </div>
                ))}

                {bankAccounts.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                        <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
                        <h3 className="text-xl font-black text-slate-400">Nenhuma conta bancária cadastrada</h3>
                        <p className="text-slate-400 mt-2">Cadastre uma conta em "Contas Bancárias" para iniciar a conciliação.</p>
                        <button 
                            onClick={() => onAccountSelect(accounts[0])}
                            className="mt-6 font-bold text-blue-600 hover:underline"
                        >
                            Ir para Gestão de Contas
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-10 opacity-10">
                    <CheckCircle2 size={120} />
                </div>
                <div className="relative z-10 max-w-xl">
                    <h2 className="text-2xl font-black mb-2 tracking-tight">Conciliação Inteligente</h2>
                    <p className="text-blue-100 font-medium mb-6">O ComissOne identifica automaticamente lançamentos que batem com seu extrato, economizando horas de trabalho manual.</p>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                            <div className="w-2 h-2 rounded-full bg-blue-300" /> Suporte OFX / CSV
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                            <div className="w-2 h-2 rounded-full bg-blue-300" /> Match em 1 clique
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BankImport;
