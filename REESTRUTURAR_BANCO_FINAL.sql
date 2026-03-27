-- SCRIPT DE CONSOLIDAÇÃO DO MÓDULO FINANCEIRO
-- Versão 2.1 - Para corrigir erros 400 (Colunas Faltantes)

DO $$ 
BEGIN 
    -- 1. Tabela de Contatos (se não existir)
    CREATE TABLE IF NOT EXISTS financial_contacts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        agency_id TEXT NOT NULL,
        name TEXT NOT NULL,
        document TEXT,
        email TEXT,
        phone TEXT,
        type TEXT NOT NULL CHECK (type IN ('CLIENT', 'SUPPLIER', 'BOTH')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 2. Colunas na tabela financial_transactions
    
    -- is_transfer
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='is_transfer') THEN
        ALTER TABLE financial_transactions ADD COLUMN is_transfer BOOLEAN DEFAULT false;
    END IF;

    -- transfer_group_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='transfer_group_id') THEN
        ALTER TABLE financial_transactions ADD COLUMN transfer_group_id UUID;
    END IF;

    -- installment_number
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='installment_number') THEN
        ALTER TABLE financial_transactions ADD COLUMN installment_number INTEGER DEFAULT 1;
    END IF;

    -- total_installments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='total_installments') THEN
        ALTER TABLE financial_transactions ADD COLUMN total_installments INTEGER DEFAULT 1;
    END IF;

    -- contact_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='contact_id') THEN
        ALTER TABLE financial_transactions ADD COLUMN contact_id UUID REFERENCES financial_contacts(id);
    END IF;

    -- import_id (Vínculo com o log de importação)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bank_import_logs') THEN
        CREATE TABLE bank_import_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            agency_id TEXT NOT NULL,
            account_id UUID REFERENCES financial_accounts(id) ON DELETE CASCADE,
            filename TEXT NOT NULL,
            file_size INTEGER,
            import_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            period_start DATE,
            period_end DATE,
            transaction_count INTEGER,
            entries_sum DECIMAL(15,2),
            exits_sum DECIMAL(15,2),
            file_hash TEXT,
            created_by UUID
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='import_id') THEN
        ALTER TABLE financial_transactions ADD COLUMN import_id UUID REFERENCES bank_import_logs(id) ON DELETE SET NULL;
    END IF;

    -- client_contact_id (Vinculo na tabela sales)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='client_contact_id') THEN
        ALTER TABLE sales ADD COLUMN client_contact_id UUID REFERENCES financial_contacts(id);
    END IF;

    -- seller_contact_id (Vinculo na tabela sales)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='seller_contact_id') THEN
        ALTER TABLE sales ADD COLUMN seller_contact_id UUID REFERENCES financial_contacts(id);
    END IF;

    -- bank_txn_id (Correção na tabela financial_transactions)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='bank_txn_id') THEN
        ALTER TABLE financial_transactions ADD COLUMN bank_txn_id TEXT;
        CREATE INDEX IF NOT EXISTS idx_financial_transactions_bank_txn_id ON financial_transactions(bank_txn_id);
    END IF;

END $$;
