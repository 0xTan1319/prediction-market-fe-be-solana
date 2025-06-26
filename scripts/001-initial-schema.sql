-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Markets table
CREATE TABLE markets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  creator_id UUID REFERENCES users(id),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  winning_outcome TEXT CHECK (winning_outcome IN ('YES', 'NO')),
  resolution_source TEXT,
  bond_amount DECIMAL(20, 9) DEFAULT 10.0,
  total_volume DECIMAL(20, 9) DEFAULT 0,
  yes_pool_id TEXT,
  no_pool_id TEXT,
  oracle_config JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pools table (DLMM pools)
CREATE TABLE pools (
  id TEXT PRIMARY KEY,
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK (outcome IN ('YES', 'NO')),
  token_a TEXT NOT NULL,
  token_b TEXT NOT NULL,
  liquidity DECIMAL(20, 9) DEFAULT 0,
  price DECIMAL(20, 9) DEFAULT 0.5,
  volume_24h DECIMAL(20, 9) DEFAULT 0,
  fees DECIMAL(10, 6) DEFAULT 0.003,
  active_bin_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pool bins table
CREATE TABLE pool_bins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_id TEXT REFERENCES pools(id),
  bin_id INTEGER NOT NULL,
  price DECIMAL(20, 9) NOT NULL,
  liquidity_x DECIMAL(20, 9) DEFAULT 0,
  liquidity_y DECIMAL(20, 9) DEFAULT 0,
  fee_rate DECIMAL(10, 6) DEFAULT 0.003,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pool_id, bin_id)
);

-- Trades table
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE SET NULL,
  pool_id TEXT NOT NULL REFERENCES pools(id) ON DELETE SET NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('YES', 'NO')),
  trade_type TEXT NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
  amount_in DECIMAL(20, 9) NOT NULL,
  amount_out DECIMAL(20, 9) NOT NULL,
  price DECIMAL(20, 9) NOT NULL,
  slippage DECIMAL(10, 6),
  fee DECIMAL(20, 9),
  transaction_signature TEXT UNIQUE,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'FAILED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Liquidity positions table
CREATE TABLE liquidity_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pool_id TEXT NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  bin_id INTEGER,
  liquidity_amount DECIMAL(20, 9) NOT NULL,
  token_a_amount DECIMAL(20, 9) NOT NULL,
  token_b_amount DECIMAL(20, 9) NOT NULL,
  fees_earned DECIMAL(20, 9) DEFAULT 0,
  transaction_signature TEXT,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'WITHDRAWN')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market resolutions table
CREATE TABLE market_resolutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id UUID REFERENCES markets(id),
  resolver_id UUID REFERENCES users(id),
  outcome TEXT NOT NULL CHECK (outcome IN ('YES', 'NO')),
  resolution_data JSONB,
  oracle_price DECIMAL(20, 9),
  confidence DECIMAL(5, 4),
  transaction_signature TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Price history table for oracle data
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  price DECIMAL(20, 9) NOT NULL,
  confidence DECIMAL(5, 4),
  source TEXT DEFAULT 'PYTH',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_markets_category ON markets(category);
CREATE INDEX idx_markets_end_date ON markets(end_date);
CREATE INDEX idx_markets_resolved ON markets(resolved);
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_market_id ON trades(market_id);
CREATE INDEX idx_trades_created_at ON trades(created_at);
CREATE INDEX idx_liquidity_positions_user_id ON liquidity_positions(user_id);
CREATE INDEX idx_liquidity_positions_pool_id ON liquidity_positions(pool_id);
CREATE INDEX idx_price_history_symbol_timestamp ON price_history(symbol, timestamp);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidity_positions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (wallet_address = current_setting('app.current_user_wallet'));

CREATE POLICY "Anyone can view markets" ON markets FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create markets" ON markets FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view all trades" ON trades FOR SELECT USING (true);
CREATE POLICY "Users can insert own trades" ON trades FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view all liquidity positions" ON liquidity_positions FOR SELECT USING (true);
CREATE POLICY "Users can insert own positions" ON liquidity_positions FOR INSERT WITH CHECK (true);
