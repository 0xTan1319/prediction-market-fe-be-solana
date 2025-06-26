-- Insert sample users
INSERT INTO users (wallet_address, username) VALUES
('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', 'alice_trader'),
('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', 'bob_liquidity'),
('5FHwkrdxntdK24b2NTXBPFKd2ccNz4TuFn5iV4Q3QQhC', 'charlie_creator');

-- Insert sample markets
INSERT INTO markets (slug, title, description, category, end_date, yes_pool_id, no_pool_id, oracle_config) VALUES
(
  'eth-5k-july-2024',
  'Will ETH hit $5K by July 2024?',
  'Ethereum price prediction using Pyth oracle resolution. Market resolves based on ETH/USD price feed at end date.',
  'crypto',
  '2024-07-31 23:59:59+00',
  'eth-5k-yes-pool',
  'eth-5k-no-pool',
  '{"symbol": "ETH/USD", "target_price": 5000, "feed_id": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"}'
),
(
  'btc-100k-2024',
  'Will BTC reach $100K in 2024?',
  'Bitcoin price prediction with automated oracle resolution. Market resolves when BTC hits $100K or at year end.',
  'crypto',
  '2024-12-31 23:59:59+00',
  'btc-100k-yes-pool',
  'btc-100k-no-pool',
  '{"symbol": "BTC/USD", "target_price": 100000, "feed_id": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"}'
),
(
  'sol-200-2024',
  'Will SOL reach $200 by end of 2024?',
  'Solana price prediction market with Pyth oracle integration.',
  'crypto',
  '2024-12-31 23:59:59+00',
  'sol-200-yes-pool',
  'sol-200-no-pool',
  '{"symbol": "SOL/USD", "target_price": 200, "feed_id": "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d"}'
);

-- Insert sample pools
INSERT INTO pools (id, market_id, outcome, token_a, token_b, liquidity, price) VALUES
('eth-5k-yes-pool', (SELECT id FROM markets WHERE slug = 'eth-5k-july-2024'), 'YES', 'USDC', 'YES-ETH-5K', 75000, 0.65),
('eth-5k-no-pool', (SELECT id FROM markets WHERE slug = 'eth-5k-july-2024'), 'NO', 'USDC', 'NO-ETH-5K', 50000, 0.35),
('btc-100k-yes-pool', (SELECT id FROM markets WHERE slug = 'btc-100k-2024'), 'YES', 'USDC', 'YES-BTC-100K', 45000, 0.42),
('btc-100k-no-pool', (SELECT id FROM markets WHERE slug = 'btc-100k-2024'), 'NO', 'USDC', 'NO-BTC-100K', 55000, 0.58),
('sol-200-yes-pool', (SELECT id FROM markets WHERE slug = 'sol-200-2024'), 'YES', 'USDC', 'YES-SOL-200', 30000, 0.25),
('sol-200-no-pool', (SELECT id FROM markets WHERE slug = 'sol-200-2024'), 'NO', 'USDC', 'NO-SOL-200', 70000, 0.75);

-- Insert sample pool bins for ETH market
INSERT INTO pool_bins (pool_id, bin_id, price, liquidity_x, liquidity_y, fee_rate)
SELECT 
  'eth-5k-yes-pool',
  generate_series(1, 20) as bin_id,
  0.5 + (generate_series(1, 20) - 10) * 0.02 as price,
  3750 * exp(-power((generate_series(1, 20) - 10) * 0.02 / 0.1, 2)) as liquidity_x,
  3750 * exp(-power((generate_series(1, 20) - 10) * 0.02 / 0.1, 2)) * (0.5 + (generate_series(1, 20) - 10) * 0.02) as liquidity_y,
  0.003 + abs((generate_series(1, 20) - 10) * 0.02) * 0.001 as fee_rate;

-- Insert sample price history
INSERT INTO price_history (symbol, price, confidence, source) VALUES
('ETH/USD', 2850.50, 0.95, 'PYTH'),
('BTC/USD', 45200.00, 0.98, 'PYTH'),
('SOL/USD', 98.75, 0.92, 'PYTH');
