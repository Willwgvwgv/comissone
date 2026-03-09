-- setup_agencies.sql
-- Run this in your Supabase SQL Editor

-- 1. Create Agencies table
CREATE TABLE IF NOT EXISTS agencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- This will be 'william', 'fidelit', etc.
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add phone column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- 3. Enable RLS or update policies if needed (standard for multi-tenancy)
-- For now, we will ensure that users are linked to their agency_id slug.

-- 4. Initial seed for the current agency (optional, adjust if needed)
INSERT INTO agencies (name, slug) 
VALUES ('ComissOne Agency', 'agency_001')
ON CONFLICT (slug) DO NOTHING;
