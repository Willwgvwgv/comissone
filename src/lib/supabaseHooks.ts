import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { Sale, User, CommissionStatus } from '../../types';

export const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;


/**
 * Hook para buscar todas as vendas de uma agência
 */
export function useSales(agencyId: string) {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        fetchSales();
    }, [agencyId]);

    async function fetchSales() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('sales')
                .select(`
          *,
          splits:broker_splits(*)
        `)
                .eq('agency_id', agencyId)
                .order('sale_date', { ascending: false });

            if (error) throw error;
            setSales(data || []);
        } catch (err) {
            setError(err as Error);
            console.error('Error fetching sales:', err);
        } finally {
            setLoading(false);
        }
    }

    return { sales, loading, error, refetch: fetchSales };
}

/**
 * Hook para buscar todos os usuários de uma agência
 */
export function useTeam(agencyId: string) {
    const [team, setTeam] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        fetchTeam();
    }, [agencyId]);

    async function fetchTeam() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('agency_id', agencyId)
                .order('name');

            if (error) throw error;
            setTeam(data || []);
        } catch (err) {
            setError(err as Error);
            console.error('Error fetching team:', err);
        } finally {
            setLoading(false);
        }
    }

    return { team, loading, error, refetch: fetchTeam };
}

/**
 * Criar uma nova venda
 */
export async function createSale(sale: Partial<Sale>) {
    const { data, error } = await supabase
        .from('sales')
        .insert([sale])
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Atualizar uma venda existente
 */
export async function updateSale(id: string, updates: Partial<Sale>) {
    const { data, error } = await supabase
        .from('sales')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Deletar uma venda
 */
export async function deleteSale(id: string) {
    const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

/**
 * Criar splits para uma venda
 */
export async function createSplits(splits: any[]) {
    const { data, error } = await supabase
        .from('broker_splits')
        .insert(splits)
        .select();

    if (error) throw error;
    return data;
}

/**
 * Atualizar status de comissão
 */
export async function updateCommissionStatus(
    saleId: string,
    brokerId: string,
    status: string,
    receiptData?: string,
    paymentAmount?: number,
    remainingAmount?: number,
    installmentNumber?: number,
    remainingForecastDate?: string,
    notes?: string,
    discountValue?: number,
    id?: string
) {
    if (saleId.startsWith('local-')) {
        console.warn('Tentativa de atualizar status em uma venda local/nãopersistida.');
        return;
    }

    // 1. Localizar o registro original para herdar dados se precisarmos criar um novo split
    let query = supabase.from('broker_splits').select('*');

    if (id) {
        query = query.eq('id', id);
    } else {
        query = query.eq('sale_id', saleId).eq('broker_id', brokerId);
        if (installmentNumber !== undefined && installmentNumber !== null) {
            query = query.eq('installment_number', installmentNumber);
        } else {
            query = query.is('installment_number', null);
        }
    }

    const { data: originalSplit, error: fetchError } = await query.single();

    if (fetchError) throw fetchError;

    const updates: any = { status };

    if (status === 'PAID') {
        const isPartial = remainingAmount && remainingAmount > 0;
        if (isPartial) {
            updates.status = 'PARTIAL';
        }
        updates.payment_date = new Date().toISOString().split('T')[0];
        updates.payment_method = 'PIX';
        if (receiptData) {
            updates.receipt_data = receiptData;
        }
        if (paymentAmount !== undefined) {
            updates.calculated_value = round2(paymentAmount);
        }
    }

    if (notes) {
        updates.notes = notes;
    }
    if (discountValue !== undefined) {
        updates.discount_value = round2(discountValue);
    }

    // Atualizar o registro específico (alvo)
    const { error: updateError } = await supabase
        .from('broker_splits')
        .update(updates)
        .eq('id', originalSplit.id);

    if (updateError) throw updateError;

    // Se houver saldo remanescente, criamos um novo registro PENDENTE
    if (remainingAmount && remainingAmount > 0) {
        // Remover campos que o Supabase deve gerar automaticamente ou que devem ser nulos
        const { id, created_at, ...rest } = originalSplit;

        const { error: insertError } = await supabase
            .from('broker_splits')
            .insert([{
                ...rest,
                status: 'PENDING',
                calculated_value: round2(remainingAmount),
                forecast_date: remainingForecastDate || originalSplit.forecast_date,
                payment_date: null,
                receipt_data: null,
                payment_method: null,
                notes: null,
                discount_value: 0
            }]);


        if (insertError) throw insertError;
    }
}


/**
 * Atualizar data de previsão
 */
export async function updateForecastDate(
    saleId: string,
    brokerId: string,
    forecastDate: string,
    installmentNumber?: number,
    id?: string
) {
    if (saleId.startsWith('local-')) {
        console.warn('Tentativa de atualizar previsão em uma venda local/nãopersistida.');
        return;
    }
    console.log('Updating forecast:', { saleId, brokerId, forecastDate, installmentNumber });

    let query = supabase
        .from('broker_splits')
        .update({ forecast_date: forecastDate });

    if (id) {
        query = query.eq('id', id);
    } else {
        query = query.eq('sale_id', saleId).eq('broker_id', brokerId);
        if (installmentNumber !== undefined && installmentNumber !== null) {
            query = query.eq('installment_number', installmentNumber);
        } else {
            query = query.is('installment_number', null);
        }
    }

    const { data, error } = await query.select();

    if (error) {
        console.error('Error updating forecast:', error);
        throw error;
    }

    console.log('Forecast updated successfully:', data);
    return data;
}
