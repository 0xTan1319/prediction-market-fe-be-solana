use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::{PriceUpdateV2, VerificationLevel};
use crate::state::{Market, MarketStatus, MarketOutcome, ResolutionSource};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ResolveMarketParams {
    pub outcome: Option<MarketOutcome>, // For manual resolution
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(
        mut,
        constraint = market.can_resolve() @ crate::errors::PoolOddsError::CannotResolve
    )]
    pub market: Account<'info, Market>,

    #[account(
        constraint = resolver.key() == market.creator || 
                    resolver.key() == global_state.authority @ crate::errors::PoolOddsError::Unauthorized
    )]
    pub resolver: Signer<'info>,

    #[account(
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, crate::state::GlobalState>,

    /// CHECK: Oracle price feed account (validated in handler)
    pub oracle_account: Option<AccountInfo<'info>>,
}

pub fn handler(ctx: Context<ResolveMarket>, params: ResolveMarketParams) -> Result<()> {
    let market = &mut ctx.accounts.market;

    let winning_outcome = match market.resolution_source {
        ResolutionSource::Oracle => {
            // Resolve using oracle data
            require!(
                ctx.accounts.oracle_account.is_some(),
                crate::errors::PoolOddsError::MissingOracleAccount
            );

            let oracle_account = ctx.accounts.oracle_account.as_ref().unwrap();
            
            // Validate oracle account matches market configuration
            require!(
                oracle_account.key() == market.oracle_account.unwrap(),
                crate::errors::PoolOddsError::InvalidOracleAccount
            );

            // Parse Pyth price data
            let price_update = PriceUpdateV2::try_deserialize(&mut oracle_account.data.borrow().as_ref())?;
            
            // Validate price update
            require!(
                price_update.verification_level == VerificationLevel::Full,
                crate::errors::PoolOddsError::InvalidOracleData
            );

            // Check price staleness (max 5 minutes old)
            let current_time = Clock::get()?.unix_timestamp;
            require!(
                current_time - price_update.publish_time <= 300,
                crate::errors::PoolOddsError::StalePriceData
            );

            // Get current price
            let current_price = price_update.price as u64;
            let target_price = market.target_price.unwrap();

            // Determine outcome based on price comparison
            if current_price >= target_price {
                MarketOutcome::Yes
            } else {
                MarketOutcome::No
            }
        },
        ResolutionSource::Manual => {
            // Manual resolution by authorized resolver
            require!(
                params.outcome.is_some(),
                crate::errors::PoolOddsError::MissingOutcome
            );
            params.outcome.unwrap()
        },
    };

    // Update market state
    market.status = MarketStatus::Resolved;
    market.winning_outcome = Some(winning_outcome);
    market.resolved_at = Some(Clock::get()?.unix_timestamp);

    msg!("Market resolved successfully");
    msg!("Market: {}", market.key());
    msg!("Winning outcome: {:?}", winning_outcome);
    msg!("Resolution source: {:?}", market.resolution_source);
    msg!("Resolved at: {}", market.resolved_at.unwrap());

    Ok(())
}
