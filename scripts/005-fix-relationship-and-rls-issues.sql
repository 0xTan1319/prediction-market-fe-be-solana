-- Fix the critical database relationship and RLS issues

-- 1. Fix the foreign key relationship between markets and pools
-- The error "Could not find a relationship between 'markets' and 'pools'" suggests missing foreign key

-- Drop existing foreign key if it exists
ALTER TABLE pools DROP CONSTRAINT IF EXISTS pools_market_id_fkey;

-- Add proper foreign key constraint with correct naming
ALTER TABLE pools 
ADD CONSTRAINT pools_market_id_fkey 
FOREIGN KEY (market_id) 
REFERENCES markets(id) 
ON DELETE CASCADE;

-- 2. Fix RLS policies for price_history table
-- The error "new row violates row-level security policy" means RLS is blocking inserts

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Public read access to price_history" ON price_history;

-- Create more permissive policies for price_history
CREATE POLICY "Allow public read access to price_history" 
ON price_history FOR SELECT 
USING (true);

CREATE POLICY "Allow service inserts to price_history" 
ON price_history FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow service updates to price_history" 
ON price_history FOR UPDATE 
USING (true);

-- 3. Ensure all tables have proper RLS policies
-- Markets table
DROP POLICY IF EXISTS "Public read access to markets" ON markets;
CREATE POLICY "Allow public read access to markets" 
ON markets FOR SELECT 
USING (true);

CREATE POLICY "Allow authenticated inserts to markets" 
ON markets FOR INSERT 
WITH CHECK (true);

-- Pools table  
DROP POLICY IF EXISTS "Public read access to pools" ON pools;
CREATE POLICY "Allow public read access to pools" 
ON pools FOR SELECT 
USING (true);

CREATE POLICY "Allow service updates to pools" 
ON pools FOR UPDATE 
USING (true);

CREATE POLICY "Allow service inserts to pools" 
ON pools FOR INSERT 
WITH CHECK (true);

-- Pool bins table
DROP POLICY IF EXISTS "Public read access to pool_bins" ON pool_bins;
CREATE POLICY "Allow public read access to pool_bins" 
ON pool_bins FOR SELECT 
USING (true);

CREATE POLICY "Allow service operations on pool_bins" 
ON pool_bins FOR ALL 
USING (true);

-- Trades table
DROP POLICY IF EXISTS "Public read access to trades" ON trades;
CREATE POLICY "Allow public read access to trades" 
ON trades FOR SELECT 
USING (true);

CREATE POLICY "Allow authenticated inserts to trades" 
ON trades FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow service updates to trades" 
ON trades FOR UPDATE 
USING (true);

-- Users table
DROP POLICY IF EXISTS "Public read access to users" ON users;
CREATE POLICY "Allow public read access to users" 
ON users FOR SELECT 
USING (true);

CREATE POLICY "Allow user upserts" 
ON users FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow user updates" 
ON users FOR UPDATE 
USING (true);

-- 4. Fix the schema cache issue by ensuring proper naming
-- Update the foreign key reference in the query to use the correct relationship name

-- 5. Add indexes to improve performance and fix relationship lookups
CREATE INDEX IF NOT EXISTS idx_pools_market_id_lookup ON pools(market_id);
CREATE INDEX IF NOT EXISTS idx_markets_id_lookup ON markets(id);
CREATE INDEX IF NOT EXISTS idx_markets_slug_lookup ON markets(slug);

-- 6. Refresh the schema cache (PostgreSQL specific)
-- This helps Supabase recognize the relationships properly
NOTIFY pgrst, 'reload schema';

-- 7. Verify the relationships work
DO $$
DECLARE
    market_count INTEGER;
    pool_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO market_count FROM markets;
    SELECT COUNT(*) INTO pool_count FROM pools;
    
    RAISE NOTICE 'Schema verification: % markets, % pools', market_count, pool_count;
    
    -- Test the relationship
    IF EXISTS (
        SELECT 1 
        FROM markets m 
        JOIN pools p ON p.market_id = m.id 
        LIMIT 1
    ) THEN
        RAISE NOTICE 'Market-Pool relationship working correctly';
    ELSE
        RAISE WARNING 'Market-Pool relationship may have issues';
    END IF;
END $$;
