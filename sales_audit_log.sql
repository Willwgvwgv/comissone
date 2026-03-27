-- Tabela para auditoria de vendas e comissões
CREATE TABLE IF NOT EXISTS sales_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Quem fez a alteração
    action_type TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE'
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para log automático de mudanças no status da venda
CREATE OR REPLACE FUNCTION log_sale_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status OR OLD.vgv IS DISTINCT FROM NEW.vgv) THEN
            INSERT INTO sales_audit_log (sale_id, user_id, action_type, old_data, new_data)
            VALUES (
                NEW.id, 
                current_setting('app.current_user_id', true)::UUID, 
                'UPDATE', 
                to_jsonb(OLD), 
                to_jsonb(NEW)
            );
        END IF;
    ELSIF (TG_OP = 'INSERT') THEN
         INSERT INTO sales_audit_log (sale_id, user_id, action_type, new_data)
         VALUES (
             NEW.id, 
             current_setting('app.current_user_id', true)::UUID, 
             'CREATE', 
             to_jsonb(NEW)
         );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_sale_changes ON sales;
CREATE TRIGGER trg_log_sale_changes
AFTER INSERT OR UPDATE ON sales
FOR EACH ROW EXECUTE FUNCTION log_sale_changes();
