-- Script SQL CORRIGIDO para o Módulo Financeiro
-- Execute este script no SQL Editor do seu projeto Supabase

-- ATENÇÃO: Isso removerá as tabelas criadas anteriormente para corrigir os tipos de dados
DROP TABLE IF EXISTS financial_transactions;
DROP TABLE IF EXISTS financial_accounts;
DROP TABLE IF EXISTS financial_categories;

-- 1. Habilitar a extensão uuid-ossp
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Categorias Financeiras
CREATE TABLE financial_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id TEXT, -- Alterado de UUID para TEXT para aceitar 'agency_001'
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('INCOME', 'EXPENSE')),
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Contas Bancárias
CREATE TABLE financial_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id TEXT, -- Alterado de UUID para TEXT para aceitar 'agency_001'
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'BANK' CHECK (type IN ('BANK', 'CREDIT_CARD')),
    initial_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    credit_limit DECIMAL(15,2),
    closing_day INTEGER,
    due_day INTEGER,
    color TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Transações Financeiras
CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id TEXT, -- Alterado de UUID para TEXT para aceitar 'agency_001'
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    type TEXT CHECK (type IN ('INCOME', 'EXPENSE')),
    category_id UUID REFERENCES financial_categories(id),
    account_id UUID REFERENCES financial_accounts(id),
    status TEXT CHECK (status IN ('PENDING', 'PAID', 'PARTIAL')),
    due_date DATE NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Inserir Categorias Padrão (Seed data)
INSERT INTO financial_categories (name, type, color, agency_id) VALUES 
-- Receitas
('Vendas de Serviços', 'INCOME', '#10b981', 'agency_001'),
('Comissões', 'INCOME', '#059669', 'agency_001'),
('Rendimentos', 'INCOME', '#3b82f6', 'agency_001'),
('Outras Receitas', 'INCOME', '#64748b', 'agency_001'),

-- Despesas
('Aluguel e Condomínio', 'EXPENSE', '#ef4444', 'agency_001'),
('Salários e Encargos', 'EXPENSE', '#f59e0b', 'agency_001'),
('Pró-labore', 'EXPENSE', '#db2777', 'agency_001'),
('Marketing e Ads', 'EXPENSE', '#3b82f6', 'agency_001'),
('Impostos e Taxas', 'EXPENSE', '#475569', 'agency_001'),
('Tarifas Bancárias', 'EXPENSE', '#64748b', 'agency_001'),
('Software e SaaS', 'EXPENSE', '#7c3aed', 'agency_001'),
('Papelaria e Escritório', 'EXPENSE', '#f97316', 'agency_001'),
('Internet e Telefone', 'EXPENSE', '#06b6d4', 'agency_001'),
('Limpeza e Manutenção', 'EXPENSE', '#22c55e', 'agency_001'),
('Viagens e Estadias', 'EXPENSE', '#8b5cf6', 'agency_001'),
('Alimentação', 'EXPENSE', '#facc15', 'agency_001'),
('Contabilidade', 'EXPENSE', '#ea580c', 'agency_001'),
('Consultoria Jurídica', 'EXPENSE', '#1e293b', 'agency_001')
ON CONFLICT DO NOTHING;
