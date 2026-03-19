-- SCRIPT DE CRIAÇÃO DA BASE COMISSONE
-- Execute este script no SQL Editor do Supabase ANTES de qualquer outro script de motor de regras.

-- 0. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Agências
CREATE TABLE IF NOT EXISTS agencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Usuários (Integra com auth.users do Supabase)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'BROKER')),
    agency_id TEXT NOT NULL, -- Geralmente o slug da agência
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Vendas (Sales)
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id TEXT NOT NULL,
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    property_address TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    buyer_cpf TEXT,
    seller_name TEXT NOT NULL,
    seller_cpf TEXT,
    vgv DECIMAL(15,2) NOT NULL DEFAULT 0,
    commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    total_commission_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    invoice_issued BOOLEAN DEFAULT FALSE,
    invoice_number TEXT,
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, CANCELED
    is_installment BOOLEAN DEFAULT FALSE,
    installments JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Rateios (Broker Splits)
CREATE TABLE IF NOT EXISTS broker_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES users(id) ON DELETE SET NULL,
    broker_name TEXT NOT NULL,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    calculated_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'PENDING', -- PENDING, PAID, PARTIAL, OVERDUE, REQUESTED, CANCELED
    payment_date DATE,
    payment_method TEXT,
    forecast_date DATE,
    receipt_data TEXT,
    installment_number INTEGER,
    total_installments INTEGER,
    notes TEXT,
    discount_value DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Habilitar RLS em todas as tabelas
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_splits ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de Acesso Básicas (Simplificadas para ambiente William)
-- Nota: Em produção, você deve restringir por agency_id e auth.uid()
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON agencies;
CREATE POLICY "Permitir leitura para autenticados" ON agencies FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON users;
CREATE POLICY "Permitir leitura para autenticados" ON users FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON sales;
CREATE POLICY "Permitir leitura para autenticados" ON sales FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON broker_splits;
CREATE POLICY "Permitir leitura para autenticados" ON broker_splits FOR SELECT TO authenticated USING (true);

-- Permitir INSERT/UPDATE para admins
DROP POLICY IF EXISTS "Admins podem tudo em sales" ON sales;
CREATE POLICY "Admins podem tudo em sales" ON sales FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins podem tudo em splits" ON broker_splits;
CREATE POLICY "Admins podem tudo em splits" ON broker_splits FOR ALL TO authenticated USING (true) WITH CHECK (true);
