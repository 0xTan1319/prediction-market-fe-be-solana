use anchor_lang::prelude::*;
use crate::state::GlobalState;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeParams {
    pub protocol_fee_rate: u16,
    pub default_market_fee_rate: u16,
    pub min_market_duration: i64,
    pub max_market_duration: i64,
    pub min_bond_amount: u64,
    pub max_markets_per_creator: u32,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = GlobalState::LEN,
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Fee recipient can be any account
    pub fee_recipient: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;

    // Validate parameters
    require!(
        params.protocol_fee_rate <= 1000, // Max 10%
        crate::errors::PoolOddsError::InvalidFeeRate
    );
    require!(
        params.default_market_fee_rate <= 1000, // Max 10%
        crate::errors::PoolOddsError::InvalidFeeRate
    );
    require!(
        params.min_market_duration > 0 && params.min_market_duration < params.max_market_duration,
        crate::errors::PoolOddsError::InvalidMarketDuration
    );
    require!(
        params.min_bond_amount > 0,
        crate::errors::PoolOddsError::InsufficientBondAmount
    );
    require!(
        params.max_markets_per_creator > 0,
        crate::errors::PoolOddsError::InvalidParameter
    );

    // Initialize global state
    global_state.authority = ctx.accounts.authority.key();
    global_state.fee_recipient = ctx.accounts.fee_recipient.key();
    global_state.protocol_fee_rate = params.protocol_fee_rate;
    global_state.default_market_fee_rate = params.default_market_fee_rate;
    global_state.min_market_duration = params.min_market_duration;
    global_state.max_market_duration = params.max_market_duration;
    global_state.min_bond_amount = params.min_bond_amount;
    global_state.max_markets_per_creator = params.max_markets_per_creator;
    global_state.paused = false;
    global_state.total_markets = 0;
    global_state.total_volume = 0;
    global_state.total_fees = 0;

    msg!("Pool Odds program initialized successfully");
    msg!("Authority: {}", global_state.authority);
    msg!("Fee recipient: {}", global_state.fee_recipient);
    msg!("Protocol fee rate: {}bp", global_state.protocol_fee_rate);

    Ok(())
}
