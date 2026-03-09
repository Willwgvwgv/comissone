-- Script FINAL para corrigir os campos de Vendas e Rateios
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Corrigir tabela de Vendas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'buyer_cpf') THEN
        ALTER TABLE sales ADD COLUMN buyer_cpf TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'seller_cpf') THEN
        ALTER TABLE sales ADD COLUMN seller_cpf TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'is_installment') THEN
        ALTER TABLE sales ADD COLUMN is_installment BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'installments') THEN
        ALTER TABLE sales ADD COLUMN installments JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 2. Corrigir tabela de Rateios (broker_splits)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'broker_splits' AND column_name = 'installment_number') THEN
        ALTER TABLE broker_splits ADD COLUMN installment_number INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'broker_splits' AND column_name = 'total_installments') THEN
        ALTER TABLE broker_splits ADD COLUMN total_installments INTEGER;
    END IF;
END $$;
