import React, { useState, useRef } from 'react';
import { ArrowLeft, Download, Upload, Plus, Search, Filter, MoreHorizontal, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { FinancialAccount, FinancialTransaction, FinancialCategory } from '../../types';
import { ImportTransaction, parseOFX, parseCSV } from '../../src/lib/importUtils';
import AccountReconciliation from './AccountReconciliation';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

interface AccountDetailsProps {
    account: FinancialAccount;
    transactions: FinancialTransaction[];
    categories: FinancialCategory[];
    accounts: FinancialAccount[];
    onBack: () => void;
    onAddTransaction: () => void;
    onImport: () => void;
    updateTransactionStatus: (id: string, status: 'PAID' | 'PENDING') => Promise<void>;
    addTransaction: (transaction: any) => Promise<any>;
}

const AccountDetails: React.FC<AccountDetailsProps> = ({
    account,
    transactions,
    categories,
    accounts,
    onBack,
    onAddTransaction,
    updateTransactionStatus,
    addTransaction
}) => {
    const [activeTab, setActiveTab] = useState<'extract' | 'reconciliation'>('extract');
    const [searchTerm, setSearchTerm] = useState('');
    const [importedTransactions, setImportedTransactions] = useState<ImportTransaction[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredTransactions = transactions.filter(t =>
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (file.name.toLowerCase().endsWith('.ofx')) {
                const parsed = parseOFX(content);
                setImportedTransactions(parsed);
                setActiveTab('reconciliation');
            } else if (file.name.toLowerCase().endsWith('.csv')) {
                const parsed = parseCSV(content);
                setImportedTransactions(parsed);
                setActiveTab('reconciliation');
            } else {
                alert('Formato de arquivo não suportado. Use .OFX ou .CSV');
            }
        };
        reader.readAsText(file);
    };

    const handleConfirmMatch = async (importId: string, systemId: string) => {
        try {
            await updateTransactionStatus(systemId, 'PAID');
            setImportedTransactions(prev => prev.filter(t => t.id !== importId));
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
                account_id: account.id,
                category_id: imp.category_id
            });
            setImportedTransactions(prev => prev.filter(t => t.id !== imp.id));
        } catch (error) {
            console.error('Erro ao criar transação:', error);
            alert('Erro ao criar novo lançamento.');
        }
    };

    const handleTransfer = async (importId: string, targetAccountId: string) => {
        const imp = importedTransactions.find(t => t.id === importId);
        if (!imp) return;

        try {
            // 1. Create transaction in current account (PAID)
            await addTransaction({
                description: `TRANSFERÊNCIA - ${imp.description}`,
                amount: imp.amount,
                type: imp.type,
                due_date: imp.date,
                status: 'PAID',
                payment_date: imp.date,
                account_id: account.id,
                category_id: null
            });

            // 2. Create counterpart in target account (PAID)
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
        } catch (error) {
            console.error('Erro na transferência:', error);
            alert('Erro ao realizar transferência.');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".ofx,.csv"
                className="hidden"
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: account.color }} />
                            {account.name}
                        </h1>
                        <p className="text-slate-500 text-sm">Gerenciamento de conta e conciliação</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        <Upload size={18} /> Importar Extrato
                    </button>
                    <button
                        onClick={onAddTransaction}
                        className="btn-primary"
                    >
                        <Plus size={18} /> Nova Transação
                    </button>
                </div>
            </div>

            {/* Account Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card-base border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Saldo Atual</p>
                    <div className="flex items-center gap-2">
                        <span className={`text-2xl font-black ${account.current_balance < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                            {formatCurrency(account.current_balance)}
                        </span>
                    </div>
                </div>
                <div className="card-base border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Saldo Inicial</p>
                    <span className="text-xl font-bold text-slate-600">
                        {formatCurrency(account.initial_balance)}
                    </span>
                </div>
                <div className="card-base border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Status da Conciliação</p>
                    <div className="flex items-center gap-2 text-emerald-600 font-bold">
                        <CheckCircle2 size={20} />
                        <span>Em dia</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <div className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('extract')}
                        className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'extract' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Extrato de Movimentações
                        {activeTab === 'extract' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('reconciliation')}
                        className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'reconciliation' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Conciliação Bancária
                        {importedTransactions.length > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] rounded-full">
                                {importedTransactions.length}
                            </span>
                        )}
                        {activeTab === 'reconciliation' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {activeTab === 'extract' ? (
                <div className="card-base border-none p-0 overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar no extrato..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                                <Filter size={18} />
                            </button>
                            <button className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                                <Download size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Transaction List */}
                    <div className="overflow-x-auto">
                        <table className="table-base">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Descrição</th>
                                    <th>Categoria</th>
                                    <th className="text-right">Valor</th>
                                    <th className="text-center">Status</th>
                                    <th className="text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="p-3 bg-slate-50 rounded-full">
                                                    <FileText size={24} />
                                                </div>
                                                <p className="font-medium">Nenhuma movimentação encontrada</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTransactions.map(t => (
                                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 text-sm font-medium text-slate-600">
                                                {new Date(t.due_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-slate-700">{t.description}</p>
                                                {t.notes && <p className="text-xs text-slate-400 truncate max-w-[200px]">{t.notes}</p>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                                    style={{ backgroundColor: t.category_color + '20', color: t.category_color }}
                                                >
                                                    {t.category_name}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-sm font-bold text-right ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {t.type === 'EXPENSE' ? '-' : '+'} {formatCurrency(t.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {t.status === 'PAID' ? (
                                                    <span className="status-badge status-success">Pago</span>
                                                ) : (
                                                    <span className="status-badge status-warning">Pendente</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-slate-400 hover:text-blue-600 transition-colors p-1">
                                                    <MoreHorizontal size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {importedTransactions.length > 0 ? (
                        <AccountReconciliation
                            account={account}
                            importedTransactions={importedTransactions}
                            systemTransactions={transactions}
                            categories={categories}
                            accounts={accounts}
                            onConfirmMatch={handleConfirmMatch}
                            onCreateNew={handleCreateNew}
                            onTransfer={handleTransfer}
                            onIgnore={(id) => setImportedTransactions(prev => prev.filter(t => t.id !== id))}
                        />
                    ) : (
                        <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-12 text-center">
                            <div className="flex flex-col items-center gap-3">
                                <div className="p-4 bg-white rounded-full shadow-sm">
                                    <Upload size={32} className="text-slate-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700">Conciliação Bancária</h3>
                                <p className="text-slate-500 max-w-md mx-auto mb-4">
                                    Importe seu extrato OFX ou CSV para conciliar automaticamente suas movimentações e manter o financeiro em dia.
                                </p>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="btn-primary px-8"
                                >
                                    Importar Extrato agora
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AccountDetails;
