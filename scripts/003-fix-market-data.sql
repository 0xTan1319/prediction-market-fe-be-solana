-- Fix any existing data issues and ensure proper relationships

-- Update existing markets to ensure they have proper pool references
UPDATE markets 
SET 
  yes_pool_id = slug || '-yes-pool',
  no_pool_id = slug || '-no-pool'
WHERE yes_pool_id IS NULL OR no_pool_id IS NULL;

-- Ensure all markets have corresponding pools
INSERT INTO pools (id, market_id, outcome, token_a, token_b, liquidity, price, volume_24h, fees)
SELECT 
  m.slug || '-yes-pool' as id,
  m.id as market_id,
  'YES' as outcome,
  'USDC' as token_a,
  'YES-' || UPPER(REPLACE(m.slug, '-', '')) as token_b,
  COALESCE(p.liquidity, 50000) as liquidity,
  COALESCE(p.price, 0.5) as price,
  COALESCE(p.volume_24h, 0) as volume_24h,
  COALESCE(p.fees, 0.003) as fees
FROM markets m
LEFT JOIN pools p ON p.id = m.slug || '-yes-pool'
WHERE p.id IS NULL;

INSERT INTO pools (id, market_id, outcome, token_a, token_b, liquidity, price, volume_24h, fees)
SELECT 
  m.slug || '-no-pool' as id,
  m.id as market_id,
  'NO' as outcome,
  'USDC' as token_a,
  'NO-' || UPPER(REPLACE(m.slug, '-', '')) as token_b,
  COALESCE(p.liquidity, 50000) as liquidity,
  COALESCE(p.price, 0.5) as price,
  COALESCE(p.volume_24h, 0) as volume_24h,
  COALESCE(p.fees, 0.003) as fees
FROM markets m
LEFT JOIN pools p ON p.id = m.slug || '-no-pool'
WHERE p.id IS NULL;

-- Add some realistic liquidity variations
UPDATE pools 
SET 
  liquidity = CASE 
    WHEN outcome = 'YES' THEN 75000 + (RANDOM() * 50000)
    ELSE 50000 + (RANDOM() * 30000)
  END,
  price = CASE 
    WHEN outcome = 'YES' THEN 0.45 + (RANDOM() * 0.3)
    ELSE 0.35 + (RANDOM() * 0.4)
  END,
  volume_24h = 5000 + (RANDOM() * 15000)
WHERE market_id IN (SELECT id FROM markets WHERE NOT resolved);

-- Ensure prices sum to approximately 1.0 for each market
WITH market_prices AS (
  SELECT 
    market_id,
    SUM(price) as total_price
  FROM pools 
  GROUP BY market_id
)
UPDATE pools 
SET price = price / mp.total_price
FROM market_prices mp
WHERE pools.market_id = mp.market_id 
AND mp.total_price > 0;

-- Add function to get market odds (for better performance)
CREATE OR REPLACE FUNCTION get_market_odds(market_slug TEXT)
RETURNS TABLE(
  yes_price DECIMAL,
  no_price DECIMAL,
  yes_liquidity DECIMAL,
  no_liquidity DECIMAL,
  total_liquidity DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    MAX(CASE WHEN p.outcome = 'YES' THEN p.price END) as yes_price,
    MAX(CASE WHEN p.outcome = 'NO' THEN p.price END) as no_price,
    MAX(CASE WHEN p.outcome = 'YES' THEN p.liquidity END) as yes_liquidity,
    MAX(CASE WHEN p.outcome = 'NO' THEN p.liquidity END) as no_liquidity,
    SUM(p.liquidity) as total_liquidity
  FROM markets m
  JOIN pools p ON p.market_id = m.id
  WHERE m.slug = market_slug
  GROUP BY m.id;
END;
$$ LANGUAGE plpgsql;
