-- Fix critical database issues

-- 1. Add missing set_config function for RLS
CREATE OR REPLACE FUNCTION set_config(
  setting_name TEXT,
  setting_value TEXT,
  is_local BOOLEAN DEFAULT FALSE
) RETURNS TEXT AS $$
BEGIN
  PERFORM set_config(setting_name, setting_value, is_local);
  RETURN setting_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix the get_market_odds function with proper error handling
DROP FUNCTION IF EXISTS get_market_odds(TEXT);

CREATE OR REPLACE FUNCTION get_market_odds(market_slug TEXT)
RETURNS TABLE(
  yes_price DECIMAL(20,9),
  no_price DECIMAL(20,9),
  yes_liquidity DECIMAL(20,9),
  no_liquidity DECIMAL(20,9),
  total_liquidity DECIMAL(20,9),
  market_exists BOOLEAN
) AS $$
DECLARE
  market_id_var UUID;
BEGIN
  -- First check if market exists
  SELECT id INTO market_id_var 
  FROM markets 
  WHERE slug = market_slug;
  
  IF market_id_var IS NULL THEN
    -- Return default values if market doesn't exist
    RETURN QUERY SELECT 
      0.5::DECIMAL(20,9) as yes_price,
      0.5::DECIMAL(20,9) as no_price,
      0::DECIMAL(20,9) as yes_liquidity,
      0::DECIMAL(20,9) as no_liquidity,
      0::DECIMAL(20,9) as total_liquidity,
      FALSE as market_exists;
    RETURN;
  END IF;
  
  -- Return actual market data
  RETURN QUERY
  SELECT 
    COALESCE(MAX(CASE WHEN p.outcome = 'YES' THEN p.price END), 0.5)::DECIMAL(20,9) as yes_price,
    COALESCE(MAX(CASE WHEN p.outcome = 'NO' THEN p.price END), 0.5)::DECIMAL(20,9) as no_price,
    COALESCE(MAX(CASE WHEN p.outcome = 'YES' THEN p.liquidity END), 0)::DECIMAL(20,9) as yes_liquidity,
    COALESCE(MAX(CASE WHEN p.outcome = 'NO' THEN p.liquidity END), 0)::DECIMAL(20,9) as no_liquidity,
    COALESCE(SUM(p.liquidity), 0)::DECIMAL(20,9) as total_liquidity,
    TRUE as market_exists
  FROM pools p
  WHERE p.market_id = market_id_var;
  
  -- If no pools found, return defaults
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      0.5::DECIMAL(20,9) as yes_price,
      0.5::DECIMAL(20,9) as no_price,
      0::DECIMAL(20,9) as yes_liquidity,
      0::DECIMAL(20,9) as no_liquidity,
      0::DECIMAL(20,9) as total_liquidity,
      TRUE as market_exists;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix RLS policies to be less restrictive for reads
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Anyone can view markets" ON markets;
DROP POLICY IF EXISTS "Users can view all trades" ON trades;

-- More permissive read policies
CREATE POLICY "Public read access to users" ON users FOR SELECT USING (true);
CREATE POLICY "Public read access to markets" ON markets FOR SELECT USING (true);
CREATE POLICY "Public read access to pools" ON pools FOR SELECT USING (true);
CREATE POLICY "Public read access to pool_bins" ON pool_bins FOR SELECT USING (true);
CREATE POLICY "Public read access to trades" ON trades FOR SELECT USING (true);
CREATE POLICY "Public read access to price_history" ON price_history FOR SELECT USING (true);

-- Enable RLS on missing tables
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- 4. Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_pools_market_id ON pools(market_id);
CREATE INDEX IF NOT EXISTS idx_pools_outcome ON pools(outcome);
CREATE INDEX IF NOT EXISTS idx_pool_bins_pool_id ON pool_bins(pool_id);
CREATE INDEX IF NOT EXISTS idx_markets_slug ON markets(slug);

-- 5. Add constraints to ensure data integrity
ALTER TABLE pools 
ADD CONSTRAINT check_price_range 
CHECK (price >= 0 AND price <= 1);

ALTER TABLE pools 
ADD CONSTRAINT check_liquidity_positive 
CHECK (liquidity >= 0);

-- 6. Fix any existing data that violates constraints
UPDATE pools SET price = 0.5 WHERE price < 0 OR price > 1 OR price IS NULL;
UPDATE pools SET liquidity = 0 WHERE liquidity < 0 OR liquidity IS NULL;

-- 7. Add a health check function
CREATE OR REPLACE FUNCTION health_check()
RETURNS TABLE(
  component TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check markets
  RETURN QUERY SELECT 
    'markets'::TEXT as component,
    CASE WHEN COUNT(*) > 0 THEN 'healthy' ELSE 'warning' END as status,
    'Total markets: ' || COUNT(*)::TEXT as details
  FROM markets;
  
  -- Check pools
  RETURN QUERY SELECT 
    'pools'::TEXT as component,
    CASE WHEN COUNT(*) > 0 THEN 'healthy' ELSE 'error' END as status,
    'Total pools: ' || COUNT(*)::TEXT as details
  FROM pools;
  
  -- Check recent trades
  RETURN QUERY SELECT 
    'trades'::TEXT as component,
    CASE WHEN COUNT(*) >= 0 THEN 'healthy' ELSE 'warning' END as status,
    'Recent trades (24h): ' || COUNT(*)::TEXT as details
  FROM trades 
  WHERE created_at > NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
