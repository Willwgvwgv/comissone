-- Add missing columns for Credit Card management
ALTER TABLE financial_accounts ADD COLUMN IF NOT EXISTS linked_account_id UUID REFERENCES financial_accounts(id);
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS installment_number INTEGER;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS total_installments INTEGER;

-- Comment for documentation
COMMENT ON COLUMN financial_accounts.linked_account_id IS 'Conta bancária usada para pagar as faturas deste cartão';
COMMENT ON COLUMN financial_transactions.provider IS 'Fornecedor da compra';
