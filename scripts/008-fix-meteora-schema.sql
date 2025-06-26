-- Fix Meteora schema by adding missing fields to existing tables
-- This script addresses the column reference errors

-- First, let's check and add meteora fields to pools table
ALTER TABLE pools 
ADD COLUMN IF NOT EXISTS meteora_pool_address TEXT,
ADD COLUMN IF NOT EXISTS bin_step INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS active_id INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_fee_percentage DECIMAL(5,4) DEFAULT 0.0025;

-- Add meteora fields to trades table (referencing user_id, not user_wallet)
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS meteora_transaction_signature TEXT,
ADD COLUMN IF NOT EXISTS bin_id INTEGER,
ADD COLUMN IF NOT EXISTS price_per_token DECIMAL(20,8);

-- Add meteora fields to markets table
ALTER TABLE markets
ADD COLUMN IF NOT EXISTS yes_token_mint TEXT,
ADD COLUMN IF NOT EXISTS no_token_mint TEXT,
ADD COLUMN IF NOT EXISTS meteora_pair_address TEXT;

-- Update existing pools with default meteora values
UPDATE pools 
SET 
  bin_step = 100,
  active_id = 8388608, -- Default active bin ID (price = 1.0)
  base_fee_percentage = 0.0025
WHERE bin_step IS NULL;

-- Create index for meteora addresses
CREATE INDEX IF NOT EXISTS idx_pools_meteora_address ON pools(meteora_pool_address);
CREATE INDEX IF NOT EXISTS idx_trades_meteora_signature ON trades(meteora_transaction_signature);
CREATE INDEX IF NOT EXISTS idx_markets_meteora_pair ON markets(meteora_pair_address);
