-- Force Supabase to refresh its schema cache

-- 1. Drop and recreate the foreign key to force schema refresh
ALTER TABLE pools DROP CONSTRAINT IF EXISTS pools_market_id_fkey;
ALTER TABLE pools DROP CONSTRAINT IF EXISTS markets_id_fkey;

-- Wait a moment for the schema cache to clear
SELECT pg_sleep(1);

-- Recreate with a different name to force recognition
ALTER TABLE pools 
ADD CONSTRAINT fk_pools_markets 
FOREIGN KEY (market_id) 
REFERENCES markets(id) 
ON DELETE CASCADE;

-- 2. Update table comments to trigger schema refresh
COMMENT ON TABLE markets IS 'Prediction markets table - updated';
COMMENT ON TABLE pools IS 'DLMM pools table - updated';

-- 3. Refresh materialized views if any exist
-- (This is a no-op if no materialized views exist)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT schemaname, matviewname FROM pg_matviews WHERE schemaname = 'public'
    LOOP
        EXECUTE 'REFRESH MATERIALIZED VIEW ' || quote_ident(r.schemaname) || '.' || quote_ident(r.matviewname);
    END LOOP;
END $$;

-- 4. Force a schema cache refresh by updating system catalogs
-- This is a PostgreSQL-specific way to invalidate caches
SELECT pg_notify('pgrst', 'reload schema');

-- 5. Verify the relationship exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'pools' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'market_id'
    ) THEN
        RAISE NOTICE 'Foreign key relationship verified: pools.market_id -> markets.id';
    ELSE
        RAISE WARNING 'Foreign key relationship not found!';
    END IF;
END $$;

-- 6. Test the relationship with a simple query
SELECT 
    m.slug,
    COUNT(p.id) as pool_count
FROM markets m
LEFT JOIN pools p ON p.market_id = m.id
GROUP BY m.slug
ORDER BY m.slug;
