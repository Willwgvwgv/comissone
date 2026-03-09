import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { FinancialTransaction, FinancialCategory, FinancialAccount, TransactionType, TransactionStatus, BankImportLog } from '../../types';

export function useFinancial(agencyId: string) {
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
    const [categories, setCategories] = useState<FinancialCategory[]>([]);
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    const [importLogs, setImportLogs] = useState<BankImportLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!agencyId) return;
        setLoading(true);
        try {
            // Fetch Categories
            const { data: cats, error: catsError } = await supabase
                .from('financial_categories')
                .select('*')
                .eq('agency_id', agencyId)
                .order('name');

            if (catsError) throw catsError;
            setCategories(cats || []);

            // Fetch Accounts (only active ones)
            const { data: accs, error: accsError } = await supabase
                .from('financial_accounts')
                .select('*')
                .eq('agency_id', agencyId)
                .neq('is_active', false)
                .order('name');

            if (accsError) throw accsError;
            setAccounts(accs || []);

            // Fetch Import Logs
            const { data: logs, error: logsError } = await supabase
                .from('bank_import_logs')
                .select('*')
                .eq('agency_id', agencyId)
                .order('import_date', { ascending: false });

            if (!logsError) setImportLogs(logs || []);

            // Fetch Transactions (Last 30 days by default could be optimized later)
            // For now, fetching all to simplify filter logic on frontend
            const { data: trans, error: transError } = await supabase
                .from('financial_transactions')
                .select('*')
                .eq('agency_id', agencyId)
                .order('due_date', { ascending: false });

            if (transError) throw transError;

            // Map transactions to include category and account details (manual join for now)
            const enrichedTransactions = (trans || []).map(t => ({
                ...t,
                category_name: cats?.find(c => c.id === t.category_id)?.name,
                category_color: cats?.find(c => c.id === t.category_id)?.color,
                account_name: accs?.find(a => a.id === t.account_id)?.name,
            }));

            setTransactions(enrichedTransactions);

        } catch (err: any) {
            console.error('Error fetching financial data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [agencyId]);

    // Initial Fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Actions ---

    const addTransaction = async (
        transaction: Omit<FinancialTransaction, 'id' | 'agency_id' | 'created_at'>,
        recurrence?: { frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY', count: number }
    ) => {
        try {
            const transactionsToInsert = [];

            // Handle date timezone issues by treating input strings as local dates
            const [y, m, d] = transaction.due_date.split('-').map(Number);
            const baseDate = new Date(y, m - 1, d);

            const count = recurrence ? recurrence.count : 1;

            for (let i = 0; i < count; i++) {
                const newDate = new Date(baseDate);

                // --- SPECIAL CREDIT CARD LOGIC ---
                const selectedAccount = accounts.find(a => a.id === transaction.account_id);
                if (selectedAccount?.type === 'CREDIT_CARD') {
                    const closingDay = selectedAccount.closing_day || 31;
                    const dueDay = selectedAccount.due_day || 1;

                    // Purchase date for calculation
                    const purchaseDate = new Date(baseDate);
                    purchaseDate.setMonth(baseDate.getMonth() + i);

                    // If purchase day > closing day, it goes to the next invoice
                    let invoiceMonthOffset = (purchaseDate.getDate() > closingDay) ? 1 : 0;

                    // The due date will be the dueDay of the calculated invoice month
                    newDate.setFullYear(purchaseDate.getFullYear());
                    newDate.setMonth(purchaseDate.getMonth() + invoiceMonthOffset);
                    newDate.setDate(dueDay);

                    // Adjust for month overflow (e.g. Feb 30 -> Mar 02)
                    if (newDate.getDate() !== dueDay) {
                        newDate.setDate(0); // Go to last day of previous month
                    }
                } else if (recurrence) {
                    if (recurrence.frequency === 'WEEKLY') {
                        newDate.setDate(baseDate.getDate() + (i * 7));
                    } else if (recurrence.frequency === 'MONTHLY') {
                        newDate.setMonth(baseDate.getMonth() + i);
                    } else if (recurrence.frequency === 'YEARLY') {
                        newDate.setFullYear(baseDate.getFullYear() + i);
                    }
                }

                // First transaction respects the form status (e.g. PAID), others default to PENDING
                const currentStatus = (i === 0) ? transaction.status : 'PENDING';
                const currentPaymentDate = (i === 0) ? transaction.payment_date : null;

                // Format Description with installment info if repetitive
                const description = recurrence || (selectedAccount?.type === 'CREDIT_CARD' && count > 1)
                    ? `${transaction.description} (${i + 1}/${count})`
                    : transaction.description;

                // Format date back to YYYY-MM-DD
                const formattedDate = newDate.toISOString().split('T')[0];

                transactionsToInsert.push({
                    ...transaction,
                    agency_id: agencyId,
                    due_date: formattedDate,
                    status: currentStatus,
                    payment_date: currentPaymentDate,
                    paid_amount: currentStatus === 'PAID' ? transaction.amount : (transaction.paid_amount || 0),
                    description,
                    notes: transaction.notes,
                    attachment_url: transaction.attachment_url,
                    is_transfer: transaction.is_transfer || false,
                    transfer_group_id: transaction.transfer_group_id,
                    provider: (transaction as any).provider,
                    installment_number: i + 1,
                    total_installments: count
                });
            }

            const { data, error } = await supabase
                .from('financial_transactions')
                .insert(transactionsToInsert)
                .select();

            if (error) throw error;
            await fetchData(); // Refresh data
            return data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const updateTransaction = async (id: string, updates: Partial<FinancialTransaction>) => {
        try {
            // Remove calculated fields if present
            const { category_name, category_color, account_name, ...cleanUpdates } = updates as any;

            const { error } = await supabase
                .from('financial_transactions')
                .update(cleanUpdates)
                .eq('id', id);

            if (error) throw error;
            await fetchData();
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const updateTransactionStatus = async (id: string, status: TransactionStatus, accountId?: string, paymentAmount?: number) => {
        try {
            const updates: any = { status };

            if (status === 'PAID') {
                updates.payment_date = new Date().toISOString();
                // If paymentAmount is provided (partial), use it. Otherwise, if matching, we might need the full amount.
                // However, updateTransactionStatus is often used for full payment.
                if (paymentAmount !== undefined) {
                    updates.paid_amount = paymentAmount;
                } else {
                    // We need the original amount to set paid_amount = amount
                    const target = transactions.find(t => t.id === id);
                    if (target) updates.paid_amount = target.amount;
                }
            } else if (status === 'PARTIAL') {
                updates.payment_date = new Date().toISOString();
                updates.paid_amount = paymentAmount;
            } else {
                updates.payment_date = null;
                updates.paid_amount = 0;
            }

            if (accountId) {
                updates.account_id = accountId;
            }

            const { error } = await supabase
                .from('financial_transactions')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            await fetchData();
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const reopenTransaction = async (id: string) => {
        return updateTransactionStatus(id, 'PENDING');
    };

    const deleteTransaction = async (id: string, deleteAllFuture?: boolean) => {
        try {
            if (deleteAllFuture) {
                // Find the target transaction to get its details
                const target = transactions.find(t => t.id === id);
                if (target) {
                    // Heuristic: same description prefix (before installment info), same category, same account, same or later date
                    const descriptionBase = target.description.split(' (')[0];

                    const { error } = await supabase
                        .from('financial_transactions')
                        .delete()
                        .eq('category_id', target.category_id)
                        .eq('account_id', target.account_id)
                        .like('description', `${descriptionBase}%`)
                        .gte('due_date', target.due_date);

                    if (error) throw error;
                }
            } else {
                const { error } = await supabase
                    .from('financial_transactions')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
            }

            await fetchData();
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const addCategory = async (category: Omit<FinancialCategory, 'id' | 'agency_id'>) => {
        try {
            const { error } = await supabase
                .from('financial_categories')
                .insert([{ ...category, agency_id: agencyId }]);

            if (error) throw error;
            await fetchData();
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const updateCategory = async (id: string, category: Partial<Omit<FinancialCategory, 'id' | 'agency_id'>>) => {
        try {
            const { error } = await supabase
                .from('financial_categories')
                .update(category)
                .eq('id', id);

            if (error) throw error;
            await fetchData();
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const deleteCategory = async (id: string) => {
        try {
            const { error } = await supabase
                .from('financial_categories')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchData();
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const addAccount = async (accountData: Omit<FinancialAccount, 'id' | 'agency_id'>) => {
        try {
            const { last_four_digits, ...account } = accountData as any;
            const { error } = await supabase
                .from('financial_accounts')
                .insert([{
                    ...account,
                    agency_id: agencyId,
                    current_balance: account.current_balance || account.initial_balance || 0
                }]);

            if (error) throw error;
            await fetchData();
        } catch (err: any) {
            const errorMessage = err.message || 'Erro desconhecido ao adicionar conta';
            console.error('Error adding account:', err);
            setError(errorMessage);
            // Re-throw with a more descriptive error if it's a connection issue
            if (errorMessage.includes('fetch') || errorMessage.includes('API key')) {
                throw new Error('Erro de conexão com o Supabase. Verifique suas chaves no arquivo .env');
            }
            throw err;
        }
    };

    const updateAccount = async (id: string, accountData: Partial<Omit<FinancialAccount, 'id' | 'agency_id'>>) => {
        try {
            const { last_four_digits, ...account } = accountData as any;
            const { error } = await supabase
                .from('financial_accounts')
                .update(account)
                .eq('id', id);

            if (error) throw error;
            await fetchData();
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const confirmImport = async (
        accountId: string,
        filename: string,
        fileSize: number,
        fileHash: string,
        transactionsToImport: Omit<FinancialTransaction, 'id' | 'agency_id' | 'created_at'>[]
    ) => {
        try {
            // 1. Tenta criar Import Log (tabela opcional — não bloqueia se não existir)
            let importLogId: string | null = null;

            const entries_sum = transactionsToImport
                .filter(t => t.type === 'INCOME')
                .reduce((acc, t) => acc + Number(t.amount), 0);

            const exits_sum = transactionsToImport
                .filter(t => t.type === 'EXPENSE')
                .reduce((acc, t) => acc + Number(t.amount), 0);

            const dates = transactionsToImport.map(t => t.due_date).sort();

            try {
                const { data: logData, error: logError } = await supabase
                    .from('bank_import_logs')
                    .insert([{
                        agency_id: agencyId,
                        account_id: accountId,
                        filename,
                        file_size: fileSize,
                        file_hash: fileHash,
                        transaction_count: transactionsToImport.length,
                        entries_sum,
                        exits_sum,
                        period_start: dates[0],
                        period_end: dates[dates.length - 1]
                    }])
                    .select()
                    .single();

                if (!logError && logData) {
                    importLogId = logData.id;
                } else {
                    console.warn('bank_import_logs não disponível, continuando sem log:', logError?.message);
                }
            } catch {
                console.warn('bank_import_logs não encontrada — execute a migração SQL para habilitar logs de importação.');
            }

            // 2. Monta as transações (import_id e bank_txn_id são opcionais)
            const transactionsToInsert = transactionsToImport.map(t => {
                const base: any = {
                    ...t,
                    agency_id: agencyId,
                    status: 'PENDING',
                };
                if (importLogId) base.import_id = importLogId;
                // Inclui bank_txn_id somente se o campo existir na transação
                if ((t as any).bank_txn_id) base.bank_txn_id = (t as any).bank_txn_id;
                return base;
            });

            const { error: transError } = await supabase
                .from('financial_transactions')
                .insert(transactionsToInsert);

            if (transError) throw transError;

            await fetchData();
            return { id: importLogId };
        } catch (err: any) {
            console.error('Error confirming import:', err);
            setError(err.message || 'Erro ao confirmar importação');
            throw err;
        }
    };


    const deleteAccount = async (id: string) => {
        try {
            // Soft Delete: marca a conta como inativa em vez de apagar fisicamente
            // Isso preserva o histórico financeiro vinculado à conta
            const { error } = await supabase
                .from('financial_accounts')
                .update({ is_active: false })
                .eq('id', id);

            if (error) throw error;
            await fetchData();
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    return {
        transactions,
        categories,
        accounts,
        loading,
        error,
        refresh: fetchData,
        importLogs,
        addTransaction,
        updateTransaction,
        updateTransactionStatus,
        reopenTransaction,
        deleteTransaction,
        addCategory,
        updateCategory,
        deleteCategory,
        addAccount,
        updateAccount,
        deleteAccount,
        confirmImport
    };
}
