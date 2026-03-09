-- Categorias financeiras específicas para o setor imobiliário
-- Execute este script no SQL Editor do seu projeto Supabase

INSERT INTO financial_categories (name, type, color, agency_id) VALUES 
-- Receitas (INCOME)
('Comissões de Vendas (Terceiros)', 'INCOME', '#10b981', 'agency_001'),
('Vendas de Imóveis Próprios', 'INCOME', '#059669', 'agency_001'),
('Taxas de Administração de Aluguel', 'INCOME', '#0ea5e9', 'agency_001'),
('Taxas de Intermediação de Locação', 'INCOME', '#3b82f6', 'agency_001'),
('Consultoria e Avaliação', 'INCOME', '#6366f1', 'agency_001'),
('Serviços de Despachante', 'INCOME', '#8b5cf6', 'agency_001'),

-- Despesas (EXPENSE)
('Comissões de Corretores (Parcerias)', 'EXPENSE', '#ef4444', 'agency_001'),
('Anúncios em Portais (Zap/VivaReal)', 'EXPENSE', '#f59e0b', 'agency_001'),
('Marketing (Facebook/Google Ads)', 'EXPENSE', '#f97316', 'agency_001'),
('Fotografia e Vídeo Profissional', 'EXPENSE', '#ec4899', 'agency_001'),
('Placas e Material de Pista', 'EXPENSE', '#ef4444', 'agency_001'),
('Vistorias de Imóveis', 'EXPENSE', '#d946ef', 'agency_001'),
('Seguros e Fianças', 'EXPENSE', '#7c3aed', 'agency_001'),
('Cartório e Certidões', 'EXPENSE', '#64748b', 'agency_001'),
('CRM e Softwares Imobiliários', 'EXPENSE', '#475569', 'agency_001'),
('Treinamentos para Corretores', 'EXPENSE', '#1e293b', 'agency_001')
ON CONFLICT (id) DO NOTHING;
