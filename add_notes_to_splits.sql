-- Script para adicionar campos de Observação e Desconto nos Rateios
-- Execute este script no SQL Editor do seu projeto Supabase

ALTER TABLE broker_splits ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE broker_splits ADD COLUMN IF NOT EXISTS discount_value DECIMAL(15,2) DEFAULT 0;
