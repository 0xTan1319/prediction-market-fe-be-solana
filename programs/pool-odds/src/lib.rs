use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;

declare_id!("PoLoddsXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");

#[program]
pub mod pool_odds {
    use super::*;

    /// Initialize the global state for the Pool Odds program
    pub fn initialize(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
        instructions::initialize::handler(ctx, params)
    }

    /// Create a new prediction market
    pub fn create_market(ctx: Context<CreateMarket>, params: CreateMarketParams) -> Result<()> {
        instructions::create_market::handler(ctx, params)
    }

    /// Create YES and NO pools for a market
    pub fn create_pools(ctx: Context<CreatePools>, params: CreatePoolsParams) -> Result<()> {
        instructions::create_pools::handler(ctx, params)
    }

    /// Add liquidity to a pool
    pub fn add_liquidity(ctx: Context<AddLiquidity>, params: AddLiquidityParams) -> Result<()> {
        instructions::add_liquidity::handler(ctx, params)
    }

    /// Remove liquidity from a pool
    pub fn remove_liquidity(ctx: Context<RemoveLiquidity>, params: RemoveLiquidityParams) -> Result<()> {
        instructions::remove_liquidity::handler(ctx, params)
    }

    /// Execute a trade (buy/sell shares)
    pub fn trade(ctx: Context<Trade>, params: TradeParams) -> Result<()> {
        instructions::trade::handler(ctx, params)
    }

    /// Resolve a market using oracle data
    pub fn resolve_market(ctx: Context<ResolveMarket>, params: ResolveMarketParams) -> Result<()> {
        instructions::resolve_market::handler(ctx, params)
    }

    /// Claim winnings from a resolved market
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        instructions::claim_winnings::handler(ctx)
    }

    /// Update market parameters (admin only)
    pub fn update_market(ctx: Context<UpdateMarket>, params: UpdateMarketParams) -> Result<()> {
        instructions::update_market::handler(ctx, params)
    }

    /// Emergency pause/unpause (admin only)
    pub fn set_pause_state(ctx: Context<SetPauseState>, paused: bool) -> Result<()> {
        instructions::set_pause_state::handler(ctx, paused)
    }
}
