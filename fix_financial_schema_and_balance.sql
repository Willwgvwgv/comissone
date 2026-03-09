-- SCRIPT DEFINITIVO PARA CORREÇÃO DO FINANCEIRO
-- Este script adiciona as colunas faltantes e configura o gatilho de saldo automaticamente.
-- Execute este script no SQL Editor do Supabase.

-- 1. ADICIONAR COLUNAS FALTANTES EM financial_transactions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_transactions' AND column_name = 'is_transfer') THEN
        ALTER TABLE financial_transactions ADD COLUMN is_transfer BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_transactions' AND column_name = 'transfer_group_id') THEN
        ALTER TABLE financial_transactions ADD COLUMN transfer_group_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_transactions' AND column_name = 'payment_date') THEN
        ALTER TABLE financial_transactions ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_transactions' AND column_name = 'paid_amount') THEN
        ALTER TABLE financial_transactions ADD COLUMN paid_amount DECIMAL(15,2) DEFAULT 0;
    END IF;
END $$;

-- 2. FUNÇÃO PARA ATUALIZAR SALDO AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION update_account_balance_fn()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualiza a conta ATUAL (para INSERT e UPDATE)
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE financial_accounts
        SET current_balance = initial_balance + (
            SELECT COALESCE(SUM(
                CASE 
                    WHEN type = 'INCOME' THEN paid_amount 
                    WHEN type = 'EXPENSE' THEN -paid_amount 
                    ELSE 0 
                END
            ), 0)
            FROM financial_transactions
            WHERE account_id = NEW.account_id
            AND (status = 'PAID' OR status = 'PARTIAL' OR (status = 'PENDING' AND paid_amount > 0))
        )
        WHERE id = NEW.account_id;
    END IF;

    -- Atualiza a conta ANTIGA (para DELETE ou se mudar de conta no UPDATE)
    IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.account_id <> NEW.account_id)) THEN
        UPDATE financial_accounts
        SET current_balance = initial_balance + (
            SELECT COALESCE(SUM(
                CASE 
                    WHEN type = 'INCOME' THEN paid_amount 
                    WHEN type = 'EXPENSE' THEN -paid_amount 
                    ELSE 0 
                END
            ), 0)
            FROM financial_transactions
            WHERE account_id = OLD.account_id
            AND (status = 'PAID' OR status = 'PARTIAL' OR (status = 'PENDING' AND paid_amount > 0))
        )
        WHERE id = OLD.account_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. TRIGGER PARA financial_transactions
DROP TRIGGER IF EXISTS trg_update_account_balance ON financial_transactions;
CREATE TRIGGER trg_update_account_balance
AFTER INSERT OR UPDATE OR DELETE ON financial_transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance_fn();

-- 4. SINCRONIZAÇÃO INICIAL DE TODOS OS SALDOS
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM financial_accounts LOOP
        UPDATE financial_accounts
        SET current_balance = initial_balance + (
            SELECT COALESCE(SUM(
                CASE 
                    WHEN type = 'INCOME' THEN paid_amount 
                    WHEN type = 'EXPENSE' THEN -paid_amount 
                    ELSE 0 
                END
            ), 0)
            FROM financial_transactions
            WHERE account_id = r.id
            AND (status = 'PAID' OR status = 'PARTIAL' OR (status = 'PENDING' AND paid_amount > 0))
        )
        WHERE id = r.id;
    END LOOP;
END $$;
