-- fix_financial_schema_v3.sql
-- Adiciona colunas de forma segura e idempotente

DO $$ 
BEGIN 
    -- Verifica e adiciona linked_account_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='financial_accounts' AND column_name='linked_account_id') THEN
        ALTER TABLE financial_accounts 
        ADD COLUMN linked_account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL;
    END IF;

    -- Verifica e adiciona last_four_digits
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='financial_accounts' AND column_name='last_four_digits') THEN
        ALTER TABLE financial_accounts 
        ADD COLUMN last_four_digits VARCHAR(4);
    END IF;
END $$;
