-- SQL para automatizar a atualização de saldo das contas
-- Execute este script no SQL Editor do Supabase

-- 1. Função para recalcular o saldo de uma conta específica
CREATE OR REPLACE FUNCTION update_account_balance_fn()
RETURNS TRIGGER AS $$
BEGIN
    -- Se for INSERT ou UPDATE, atualiza a conta associada à transação (nova ou atual)
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

    -- Se for UPDATE e o account_id mudou, ou se for DELETE, atualiza a conta antiga
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

-- 2. Trigger para disparar a função
DROP TRIGGER IF EXISTS trg_update_account_balance ON financial_transactions;
CREATE TRIGGER trg_update_account_balance
AFTER INSERT OR UPDATE OR DELETE ON financial_transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance_fn();

-- 3. Sincronizar todos os saldos atuais uma única vez
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
