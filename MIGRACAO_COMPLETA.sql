-- SCRIPT UNIFICADO DE ATUALIZAÇAO DO COMISSONE
-- Execute este script no SQL Editor do Supabase para habilitar todos os novos recursos.

-- 1. Campos de CPF e Parcelas na tabela de Vendas
ALTER TABLE sales ADD COLUMN IF NOT EXISTS buyer_cpf TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS seller_cpf TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS is_installment BOOLEAN DEFAULT false;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS installments JSONB DEFAULT '[]';

-- 2. Campos de Parcelamento, Notas e Descontos nos Rateios (broker_splits)
ALTER TABLE broker_splits ADD COLUMN IF NOT EXISTS installment_number INTEGER;
ALTER TABLE broker_splits ADD COLUMN IF NOT EXISTS total_installments INTEGER;
ALTER TABLE broker_splits ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE broker_splits ADD COLUMN IF NOT EXISTS discount_value DECIMAL(15,2) DEFAULT 0;

-- NOTA: Se o comando retornar erro de "column already exists", não se preocupe, 
-- o "IF NOT EXISTS" garante que nada seja quebrado se você já tiver parte das colunas.
