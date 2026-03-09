-- Adiciona o campo last_four_digits na tabela de contas financeiras se não existir

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='financial_accounts' AND column_name='last_four_digits'
    ) THEN 
        ALTER TABLE financial_accounts ADD COLUMN last_four_digits VARCHAR(4);
    END IF;
END $$;
