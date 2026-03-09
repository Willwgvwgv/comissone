-- SCRIPT DE CORREÇÃO DO BANCO DE DADOS
-- Este script garante que a tabela 'financial_accounts' tenha todas as colunas necessárias.
-- Execute este script no SQL Editor do seu Supabase Dashboard.

-- 1. Adicionar colunas se não existirem
DO $$
BEGIN
    -- Tipo da conta (BANK ou CREDIT_CARD)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_accounts' AND column_name = 'type') THEN
        ALTER TABLE financial_accounts ADD COLUMN type TEXT CHECK (type IN ('BANK', 'CREDIT_CARD')) DEFAULT 'BANK';
    END IF;

    -- Saldo Inicial
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_accounts' AND column_name = 'initial_balance') THEN
        ALTER TABLE financial_accounts ADD COLUMN initial_balance DECIMAL(15,2) DEFAULT 0;
    END IF;

    -- Saldo Atual
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_accounts' AND column_name = 'current_balance') THEN
        ALTER TABLE financial_accounts ADD COLUMN current_balance DECIMAL(15,2) DEFAULT 0;
    END IF;

    -- Limite de Crédito
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_accounts' AND column_name = 'credit_limit') THEN
        ALTER TABLE financial_accounts ADD COLUMN credit_limit DECIMAL(15,2);
    END IF;

    -- Dia de Fechamento da Fatura
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_accounts' AND column_name = 'closing_day') THEN
        ALTER TABLE financial_accounts ADD COLUMN closing_day INTEGER;
    END IF;

    -- Dia de Vencimento da Fatura
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_accounts' AND column_name = 'due_day') THEN
        ALTER TABLE financial_accounts ADD COLUMN due_day INTEGER;
    END IF;

    -- Cor de Identificação
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_accounts' AND column_name = 'color') THEN
        ALTER TABLE financial_accounts ADD COLUMN color TEXT;
    END IF;

    -- Indicador de Conta Padrão
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_accounts' AND column_name = 'is_default') THEN
        ALTER TABLE financial_accounts ADD COLUMN is_default BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Recalcular o current_balance para contas existentes (opcional, para garantir consistência)
UPDATE financial_accounts 
SET current_balance = COALESCE(initial_balance, 0) 
WHERE current_balance IS NULL;
