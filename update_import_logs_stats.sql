-- Adicionar colunas estatísticas à tabela de logs de importação
ALTER TABLE bank_import_logs 
ADD COLUMN IF NOT EXISTS reconciled_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reconciled_sum DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_sum DECIMAL(15,2) DEFAULT 0;
