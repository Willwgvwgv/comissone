-- Script para adicionar colunas faltantes na tabela financeira
-- Execute este script no SQL Editor do Supabase

DO $$
BEGIN
    -- Adicionar coluna payment_date se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_transactions' AND column_name = 'payment_date') THEN
        ALTER TABLE financial_transactions ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Adicionar coluna paid_amount se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_transactions' AND column_name = 'paid_amount') THEN
        ALTER TABLE financial_transactions ADD COLUMN paid_amount DECIMAL(15,2) DEFAULT 0;
    END IF;
END $$;
