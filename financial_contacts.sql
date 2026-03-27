-- 1. Tabela de Contatos Financeiros (Clientes/Fornecedores)
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

-- 2. Vincular Transações a Contatos
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES financial_contacts(id);

-- 3. Habilitar RLS e Criar Políticas (Simplificado para este projeto)
ALTER TABLE financial_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for agency users" ON financial_contacts;
CREATE POLICY "Enable all for agency users" ON financial_contacts
    FOR ALL
    USING (true)
    WITH CHECK (true);
