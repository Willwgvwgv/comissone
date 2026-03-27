import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { 
    FinancialTransaction, 
    FinancialCategory, 
    FinancialAccount, 
    TransactionType, 
    TransactionStatus, 
    BankImportLog, 
    FinancialContact 
} from '../../types';

export function useFinancial(agencyId: string) {
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
    const [categories, setCategories] = useState<FinancialCategory[]>([]);
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    const [importLogs, setImportLogs] = useState<BankImportLog[]>([]);
    const [contacts, setContacts] = useState<FinancialContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!agencyId) return;
        setLoading(true);
        try {
            const [catsRes, accsRes, logsRes, contsRes, transRes] = await Promise.all([
                supabase.from('financial_categories').select('*').eq('agency_id', agencyId).order('name'),
                supabase.from('financial_accounts').select('*').eq('agency_id', agencyId).neq('is_active', false).order('name'),
                supabase.from('bank_import_logs').select('*').eq('agency_id', agencyId).order('import_date', { ascending: false }),
                supabase.from('financial_contacts').select('*').eq('agency_id', agencyId).order('name'),
                supabase.from('financial_transactions').select('*').eq('agency_id', agencyId).order('due_date', { ascending: false })
            ]);

            if (catsRes.error) throw catsRes.error;
            if (accsRes.error) throw accsRes.error;
            if (contsRes.error) throw contsRes.error;
            if (transRes.error) throw transRes.error;

            const cats = catsRes.data || [];
            const accs = accsRes.data || [];
            const conts = contsRes.data || [];
            const logs = logsRes.data || [];
            const trans = transRes.data || [];

            setCategories(cats);
            setAccounts(accs);
            setContacts(conts);
            setImportLogs(logs);

            const catsMap = new Map(cats.map(c => [c.id, c]));
            const accsMap = new Map(accs.map(a => [a.id, a.name]));
            const contsMap = new Map(conts.map(c => [c.id, c.name]));

            const enrichedTransactions = trans.map(t => ({
                ...t,
                category_name: catsMap.get(t.category_id)?.name,
                category_color: catsMap.get(t.category_id)?.color,
                account_name: accsMap.get(t.account_id),
                contact_name: t.contact_id ? contsMap.get(t.contact_id) : undefined,
            }));

            setTransactions(enrichedTransactions);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('Error fetching financial data:', err);
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [agencyId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const addTransaction = async (
        transaction: Omit<FinancialTransaction, 'id' | 'agency_id' | 'created_at'>,
        recurrence?: { frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY', count: number }
    ) => {
        let transactionsToInsert: any[] = [];
        try {
            const [y, m, d] = transaction.due_date.split('-').map(Number);
            const baseDate = new Date(y, m - 1, d);
            const count = recurrence ? recurrence.count : 1;

            for (let i = 0; i < count; i++) {
                const newDate = new Date(baseDate);
                const selectedAccount = accounts.find(a => a.id === transaction.account_id);
                
                if (selectedAccount?.type === 'CREDIT_CARD') {
                    const closingDay = selectedAccount.closing_day || 31;
                    const dueDay = selectedAccount.due_day || 1;
                    const purchaseDate = new Date(baseDate);
                    purchaseDate.setMonth(baseDate.getMonth() + i);
                    let invoiceMonthOffset = (purchaseDate.getDate() > closingDay) ? 1 : 0;
                    newDate.setFullYear(purchaseDate.getFullYear());
                    newDate.setMonth(purchaseDate.getMonth() + invoiceMonthOffset);
                    newDate.setDate(dueDay);
                    if (newDate.getDate() !== dueDay) newDate.setDate(0);
                } else if (recurrence) {
                    if (recurrence.frequency === 'WEEKLY') newDate.setDate(baseDate.getDate() + (i * 7));
                    else if (recurrence.frequency === 'MONTHLY') newDate.setMonth(baseDate.getMonth() + i);
                    else if (recurrence.frequency === 'YEARLY') newDate.setFullYear(baseDate.getFullYear() + i);
                }

                const currentStatus = (i === 0) ? transaction.status : 'PENDING';
                const description = (recurrence || (selectedAccount?.type === 'CREDIT_CARD' && count > 1))
                    ? `${transaction.description} (${i + 1}/${count})`
                    : transaction.description;

                transactionsToInsert.push({
                    ...transaction,
                    agency_id: agencyId,
                    due_date: newDate.toISOString().split('T')[0],
                    status: currentStatus,
                    payment_date: (i === 0) ? transaction.payment_date : null,
                    paid_amount: currentStatus === 'PAID' ? transaction.amount : (transaction.paid_amount || 0),
                    description,
                    is_transfer: transaction.is_transfer || false,
                    installment_number: i + 1,
                    total_installments: count
                });
            }

            const { data, error: err } = await supabase.from('financial_transactions').insert(transactionsToInsert).select();
            if (err) throw err;
            await fetchData();
            return data;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        }
    };

    const updateTransaction = async (id: string, updates: Partial<FinancialTransaction>, updateAllFuture?: boolean) => {
        try {
            const { category_name, category_color, account_name, contact_name, ...cleanUpdates } = updates as any;
            
            if (updateAllFuture) {
                const target = transactions.find(t => t.id === id);
                if (target) {
                    const descriptionBase = target.description.split(' (')[0];
                    const affectedTransactions = transactions.filter(t => 
                        t.category_id === target.category_id &&
                        t.account_id === target.account_id &&
                        t.description.startsWith(descriptionBase) &&
                        t.due_date >= target.due_date
                    );

                    if (!cleanUpdates.description && !cleanUpdates.due_date) {
                        // If description and due_date are not changing, we can update all at once
                        const { error: err } = await supabase.from('financial_transactions')
                            .update(cleanUpdates)
                            .eq('category_id', target.category_id)
                            .eq('account_id', target.account_id)
                            .like('description', `${descriptionBase}%`)
                            .gte('due_date', target.due_date);
                        if (err) throw err;
                    } else {
                        // If description or due_date is changing, we must process per record
                        const newDateObj = cleanUpdates.due_date ? new Date(cleanUpdates.due_date + 'T12:00:00') : null;
                        const oldDateObj = new Date(target.due_date + 'T12:00:00');

                        for (const t of affectedTransactions) {
                            const currentUpdates = { ...cleanUpdates };
                            
                            // Handle description suffix preservation
                            if (cleanUpdates.description) {
                                const suffixMatch = t.description.match(/\s\(\d+\/\d+\)$/);
                                if (suffixMatch) {
                                    const newBase = cleanUpdates.description.split(' (')[0];
                                    currentUpdates.description = `${newBase}${suffixMatch[0]}`;
                                }
                            }

                            // Handle date shift preservation
                            if (newDateObj) {
                                const tDate = new Date(t.due_date + 'T12:00:00');
                                // Shift: Keep the same relative difference in months/years, but use the new day
                                // Or more simply: replace the day of the month
                                const newDay = newDateObj.getDate();
                                const updatedTDate = new Date(tDate);
                                updatedTDate.setDate(newDay);
                                
                                // Edge case: if new day is 31 and month has 30 days, setDate(31) will go to next month
                                // We should handle this by clamping to last day of month
                                if (updatedTDate.getDate() !== newDay) {
                                    updatedTDate.setDate(0); // Go to last day of previous month
                                }
                                currentUpdates.due_date = updatedTDate.toISOString().split('T')[0];
                            }

                            await supabase.from('financial_transactions').update(currentUpdates).eq('id', t.id);
                        }
                    }
                }
            } else {
                const { error: err } = await supabase.from('financial_transactions').update(cleanUpdates).eq('id', id);
                if (err) throw err;
            }
            await fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        }
    };

    const updateTransactionStatus = async (id: string, status: TransactionStatus, accountId?: string, paymentAmount?: number, importId?: string) => {
        try {
            const updates: Partial<FinancialTransaction> = { status };
            if (status === 'PAID') {
                updates.payment_date = new Date().toISOString();
                if (paymentAmount !== undefined) updates.paid_amount = paymentAmount;
                else {
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
            if (accountId) updates.account_id = accountId;
            if (importId) (updates as any).import_id = importId;

            const { error: err } = await supabase.from('financial_transactions').update(updates).eq('id', id);
            if (err) throw err;
            await fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        }
    };

    const reopenTransaction = async (id: string) => updateTransactionStatus(id, 'PENDING');

    const deleteTransaction = async (id: string, deleteAllFuture?: boolean) => {
        try {
            if (deleteAllFuture) {
                const target = transactions.find(t => t.id === id);
                if (target) {
                    const descriptionBase = target.description.split(' (')[0];
                    const query = supabase.from('financial_transactions').delete()
                        .eq('agency_id', agencyId)
                        .eq('category_id', target.category_id)
                        .eq('account_id', target.account_id)
                        .gte('due_date', target.due_date);

                    // If we have total_installments, we can be more specific
                    if (target.total_installments && target.total_installments > 1) {
                         // But we still don't have a common ID, so description prefix is still our best bet along with total_installments
                         query.eq('total_installments', target.total_installments).like('description', `${descriptionBase}%`);
                    } else {
                        query.like('description', `${descriptionBase}%`);
                    }

                    const { error: err } = await query;
                    if (err) throw err;
                }
            } else {
                const { error: err } = await supabase.from('financial_transactions').delete().eq('id', id);
                if (err) throw err;
            }
            await fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        }
    };

    const addCategory = async (category: Omit<FinancialCategory, 'id' | 'agency_id'>) => {
        try {
            const { error: err } = await supabase.from('financial_categories').insert([{ ...category, agency_id: agencyId }]);
            if (err) throw err;
            await fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        }
    };

    const updateCategory = async (id: string, category: Partial<Omit<FinancialCategory, 'id' | 'agency_id'>>) => {
        try {
            const { error: err } = await supabase.from('financial_categories').update(category).eq('id', id);
            if (err) throw err;
            await fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        }
    };

    const deleteCategory = async (id: string) => {
        try {
            const { error: err } = await supabase.from('financial_categories').delete().eq('id', id);
            if (err) throw err;
            await fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        }
    };

    const addAccount = async (accountData: Omit<FinancialAccount, 'id' | 'agency_id'>) => {
        try {
            const { error: err } = await supabase.from('financial_accounts').insert([{
                ...accountData,
                agency_id: agencyId,
                current_balance: accountData.current_balance || accountData.initial_balance || 0
            }]);
            if (err) throw err;
            await fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        }
    };

    const updateAccount = async (id: string, accountData: Partial<Omit<FinancialAccount, 'id' | 'agency_id'>>) => {
        try {
            const { error: err } = await supabase.from('financial_accounts').update(accountData).eq('id', id);
            if (err) throw err;
            await fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
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
            let importLogId: string | null = null;
            const entries_sum = transactionsToImport.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + Number(t.amount), 0);
            const exits_sum = transactionsToImport.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.amount), 0);
            const dates = transactionsToImport.map(t => t.due_date).sort();

            const { data: logData, error: logError } = await supabase.from('bank_import_logs').insert([{
                agency_id: agencyId, account_id: accountId, filename, file_size: fileSize, file_hash: fileHash,
                transaction_count: transactionsToImport.length, entries_sum, exits_sum, period_start: dates[0], period_end: dates[dates.length - 1]
            }]).select().single();

            if (!logError && logData) importLogId = logData.id;

            const transactionsToInsert = transactionsToImport.map(t => ({
                ...t, agency_id: agencyId, status: 'PENDING' as TransactionStatus, import_id: importLogId, 
                bank_txn_id: (t as any).bank_txn_id
            }));

            const { error: transError } = await supabase.from('financial_transactions').insert(transactionsToInsert);
            if (transError) throw transError;
            await fetchData();
            return { id: importLogId };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        }
    };

    const addImportLog = async (logData: Omit<BankImportLog, 'id' | 'created_at' | 'agency_id'>) => {
        try {
            const { data, error: err } = await supabase.from('bank_import_logs').insert([{ ...logData, agency_id: agencyId }]).select().single();
            if (err) throw err;
            await fetchData();
            return data;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        }
    };

    const updateImportLog = async (id: string, logData: Partial<BankImportLog>) => {
        try {
            const { error: err } = await supabase.from('bank_import_logs').update(logData).eq('id', id);
            if (err) throw err;
            await fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        }
    };

    const deleteImportLog = async (id: string) => {
        try {
            // First delete transactions associated with this import
            const { error: transErr } = await supabase.from('financial_transactions').delete().eq('import_id', id);
            if (transErr) throw transErr;

            // Then delete the import log itself
            const { error: logErr } = await supabase.from('bank_import_logs').delete().eq('id', id);
            if (logErr) throw logErr;

            await fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        }
    };

    const deleteAccount = async (id: string) => {
        try {
            const { error: err } = await supabase.from('financial_accounts').update({ is_active: false }).eq('id', id);
            if (err) throw err;
            await fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        }
    };

    const addContact = async (contact: Omit<FinancialContact, 'id' | 'agency_id' | 'created_at'>) => {
        try {
            const { data, error: err } = await supabase.from('financial_contacts').insert([{ ...contact, agency_id: agencyId }]).select().single();
            if (err) throw err;
            await fetchData();
            return data;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        }
    };

    const updateContact = async (id: string, updates: Partial<FinancialContact>) => {
        try {
            const { error: err } = await supabase.from('financial_contacts').update(updates).eq('id', id);
            if (err) throw err;
            await fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        }
    };

    const deleteContact = async (id: string) => {
        try {
            const { error: err } = await supabase.from('financial_contacts').update({ is_active: false }).eq('id', id);
            if (err) throw err;
            await fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
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
        confirmImport,
        addImportLog,
        updateImportLog,
        deleteImportLog,
        contacts,
        addContact,
        updateContact,
        deleteContact
    };
}
