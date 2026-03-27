-- Script para corrigir colunas faltantes na tabela financial_transactions
-- Este erro (400 Bad Request) acontece quando o frontend tenta enviar dados para colunas que não existem no banco de dados.

DO $$ 
BEGIN 
    -- 1. Coluna is_transfer (para transferências entre contas)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='is_transfer') THEN
        ALTER TABLE financial_transactions ADD COLUMN is_transfer BOOLEAN DEFAULT false;
    END IF;

    -- 2. Coluna transfer_group_id (para agrupar os dois lados de uma transferência)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='transfer_group_id') THEN
        ALTER TABLE financial_transactions ADD COLUMN transfer_group_id UUID;
    END IF;

    -- 3. Colunas de Parcelamento (installment_number e total_installments)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='installment_number') THEN
        ALTER TABLE financial_transactions ADD COLUMN installment_number INTEGER DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='total_installments') THEN
        ALTER TABLE financial_transactions ADD COLUMN total_installments INTEGER DEFAULT 1;
    END IF;

    -- 4. Coluna import_id (Vínculo com o log de importação)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='import_id') THEN
        ALTER TABLE financial_transactions ADD COLUMN import_id UUID REFERENCES bank_import_logs(id) ON DELETE CASCADE;
    END IF;

    -- 5. Coluna bank_txn_id (ID único da transação no banco/extrato para evitar duplicidade)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='bank_txn_id') THEN
        ALTER TABLE financial_transactions ADD COLUMN bank_txn_id TEXT;
        -- Criar um índice para performance na busca de duplicados
        CREATE INDEX IF NOT EXISTS idx_financial_transactions_bank_txn_id ON financial_transactions(bank_txn_id);
    END IF;

END $$;
