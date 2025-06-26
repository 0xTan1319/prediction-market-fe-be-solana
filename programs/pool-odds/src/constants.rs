use anchor_lang::prelude::*;

// Program constants
pub const PROGRAM_SEED: &[u8] = b"pool_odds";
pub const GLOBAL_STATE_SEED: &[u8] = b"global_state";
pub const MARKET_SEED: &[u8] = b"market";
pub const POOL_SEED: &[u8] = b"pool";
pub const USER_SEED: &[u8] = b"user";
pub const POSITION_SEED: &[u8] = b"position";
pub const LIQUIDITY_POSITION_SEED: &[u8] = b"liquidity_position";

// Fee constants (in basis points)
pub const DEFAULT_FEE_RATE: u16 = 30; // 0.3%
pub const PROTOCOL_FEE_RATE: u16 = 10; // 0.1%
pub const MAX_FEE_RATE: u16 = 1000; // 10%

// Market constants
pub const MIN_MARKET_DURATION: i64 = 3600; // 1 hour
pub const MAX_MARKET_DURATION: i64 = 31_536_000; // 1 year
pub const MIN_BOND_AMOUNT: u64 = 100_000_000; // 0.1 SOL (in lamports)
pub const MAX_MARKETS_PER_CREATOR: u32 = 100;

// Trading constants
pub const MIN_TRADE_AMOUNT: u64 = 1_000; // 0.001 tokens (with 6 decimals)
pub const MAX_PRICE_IMPACT: u16 = 1000; // 10% in basis points
pub const MAX_SLIPPAGE: u16 = 5000; // 50% in basis points

// Liquidity constants
pub const MIN_LIQUIDITY: u64 = 1_000_000; // 1 token (with 6 decimals)
pub const INITIAL_PRICE: u64 = 500_000; // 0.5 (with 6 decimals)

// Oracle constants
pub const MAX_PRICE_AGE: i64 = 300; // 5 minutes
pub const PRICE_PRECISION: u64 = 1_000_000; // 6 decimals

// Account size constants
pub const DISCRIMINATOR_SIZE: usize = 8;
pub const PUBKEY_SIZE: usize = 32;
pub const U64_SIZE: usize = 8;
pub const U32_SIZE: usize = 4;
pub const U16_SIZE: usize = 2;
pub const U8_SIZE: usize = 1;
pub const I64_SIZE: usize = 8;
pub const BOOL_SIZE: usize = 1;

// String constants
pub const MAX_TITLE_LENGTH: usize = 64;
pub const MAX_DESCRIPTION_LENGTH: usize = 128;

// Math constants
pub const BASIS_POINTS: u64 = 10_000;
pub const PERCENTAGE: u64 = 100;

// Categories
pub const CATEGORY_CRYPTO: u8 = 0;
pub const CATEGORY_SPORTS: u8 = 1;
pub const CATEGORY_POLITICS: u8 = 2;
pub const CATEGORY_WEATHER: u8 = 3;
pub const CATEGORY_OTHER: u8 = 4;
