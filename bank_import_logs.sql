-- Tabela para registrar o histórico de importações de extratos
CREATE TABLE IF NOT EXISTS bank_import_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id TEXT NOT NULL,
    account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_size INTEGER,
    import_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    period_start DATE,
    period_end DATE,
    transaction_count INTEGER,
    entries_sum DECIMAL(15,2),
    exits_sum DECIMAL(15,2),
    file_hash TEXT, -- Para evitar importar o mesmo arquivo
    created_by UUID -- Referência opcional ao usuário
);

-- Adicionar coluna de controle de duplicidade na tabela de transações se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_transactions' AND column_name = 'import_id') THEN
        ALTER TABLE financial_transactions ADD COLUMN import_id UUID REFERENCES bank_import_logs(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_transactions' AND column_name = 'bank_txn_id') THEN
        ALTER TABLE financial_transactions ADD COLUMN bank_txn_id TEXT; -- FITID do OFX ou Hash gerado
    END IF;
END $$;
