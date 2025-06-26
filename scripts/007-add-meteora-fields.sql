-- Add Meteora-specific fields to pools table
ALTER TABLE pools 
ADD COLUMN IF NOT EXISTS bin_step INTEGER DEFAULT 25,
ADD COLUMN IF NOT EXISTS active_id INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS volume_24h DECIMAL(20,6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add trades table for tracking Meteora transactions
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_wallet TEXT NOT NULL,
  market_id UUID REFERENCES markets(id),
  pool_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('YES', 'NO')),
  trade_type TEXT NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
  amount_in DECIMAL(20,6) NOT NULL,
  amount_out DECIMAL(20,6) NOT NULL,
  price DECIMAL(20,6) NOT NULL,
  slippage DECIMAL(10,6) DEFAULT 0,
  fee DECIMAL(20,6) DEFAULT 0,
  transaction_signature TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add price_data table for oracle prices
CREATE TABLE IF NOT EXISTS price_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  price DECIMAL(20,6) NOT NULL,
  confidence DECIMAL(20,6) DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trades_user_wallet ON trades(user_wallet);
CREATE INDEX IF NOT EXISTS idx_trades_market_id ON trades(market_id);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at);
CREATE INDEX IF NOT EXISTS idx_price_data_symbol ON price_data(symbol);
CREATE INDEX IF NOT EXISTS idx_price_data_timestamp ON price_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_pools_updated_at ON pools(updated_at);

-- Update existing pools with default Meteora values
UPDATE pools 
SET 
  bin_step = 25,
  active_id = 8388608, -- Default active bin ID
  updated_at = NOW()
WHERE bin_step IS NULL;
