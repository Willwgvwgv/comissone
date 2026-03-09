-- SCRIPT DE CORREÇÃO PARA PAGAMENTO PARCIAL E ERRO 400
-- Execute este script no SQL Editor do Supabase se estiver recebendo "Erro 400" ao pagar.

-- 1. Garantir que as colunas de Notas e Descontos existam
ALTER TABLE broker_splits ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE broker_splits ADD COLUMN IF NOT EXISTS discount_value DECIMAL(15,2) DEFAULT 0;

-- 2. Garantir que a coluna status seja TEXT simples (para evitar erros de ENUM/Constraint ao usar 'PARTIAL')
-- Este comando converte a coluna para TEXT de forma segura
ALTER TABLE broker_splits ALTER COLUMN status TYPE TEXT;

-- 3. Limpar qualquer constraint de CHECK que possa estar impedindo o valor 'PARTIAL'
-- Tentamos remover constraints comuns (se não existirem, o script continua)
DO $$
BEGIN
    ALTER TABLE broker_splits DROP CONSTRAINT IF EXISTS broker_splits_status_check;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- 4. Opcional: Adicionar colunas se faltarem na tabela de vendas também (redundância de segurança)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS buyer_cpf TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS seller_cpf TEXT;

-- Script executado com sucesso!
