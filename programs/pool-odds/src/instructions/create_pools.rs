use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::state::{Market, Pool, MarketOutcome};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreatePoolsParams {
    pub initial_liquidity: u64,
}

#[derive(Accounts)]
pub struct CreatePools<'info> {
    #[account(
        mut,
        constraint = market.creator == creator.key() @ crate::errors::PoolOddsError::Unauthorized,
        constraint = market.can_trade() @ crate::errors::PoolOddsError::MarketNotActive
    )]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = creator,
        space = Pool::LEN,
        seeds = [b"pool", market.key().as_ref(), b"yes"],
        bump
    )]
    pub yes_pool: Account<'info, Pool>,

    #[account(
        init,
        payer = creator,
        space = Pool::LEN,
        seeds = [b"pool", market.key().as_ref(), b"no"],
        bump
    )]
    pub no_pool: Account<'info, Pool>,

    #[account(
        init,
        payer = creator,
        token::mint = market.base_token_mint,
        token::authority = yes_pool,
        seeds = [b"base_vault", yes_pool.key().as_ref()],
        bump
    )]
    pub yes_base_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = creator,
        token::mint = market.yes_share_mint,
        token::authority = yes_pool,
        seeds = [b"share_vault", yes_pool.key().as_ref()],
        bump
    )]
    pub yes_share_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = creator,
        token::mint = market.base_token_mint,
        token::authority = no_pool,
        seeds = [b"base_vault", no_pool.key().as_ref()],
        bump
    )]
    pub no_base_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = creator,
        token::mint = market.no_share_mint,
        token::authority = no_pool,
        seeds = [b"share_vault", no_pool.key().as_ref()],
        bump
    )]
    pub no_share_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = creator,
        mint::decimals = 6,
        mint::authority = yes_pool,
        seeds = [b"lp_mint", yes_pool.key().as_ref()],
        bump
    )]
    pub yes_lp_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        mint::decimals = 6,
        mint::authority = no_pool,
        seeds = [b"lp_mint", no_pool.key().as_ref()],
        bump
    )]
    pub no_lp_mint: Account<'info, Mint>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<CreatePools>, _params: CreatePoolsParams) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let yes_pool = &mut ctx.accounts.yes_pool;
    let no_pool = &mut ctx.accounts.no_pool;

    // Initialize YES pool
    yes_pool.market = market.key();
    yes_pool.outcome = MarketOutcome::Yes;
    yes_pool.base_token_mint = market.base_token_mint;
    yes_pool.share_token_mint = market.yes_share_mint;
    yes_pool.base_token_vault = ctx.accounts.yes_base_vault.key();
    yes_pool.share_token_vault = ctx.accounts.yes_share_vault.key();
    yes_pool.lp_token_mint = ctx.accounts.yes_lp_mint.key();
    yes_pool.base_reserves = 0;
    yes_pool.share_reserves = 0;
    yes_pool.lp_token_supply = 0;
    yes_pool.current_price = 500_000; // 0.5 with 6 decimals
    yes_pool.volume = 0;
    yes_pool.fees_collected = 0;
    yes_pool.fee_rate = market.fee_rate;
    yes_pool.last_update = Clock::get()?.unix_timestamp;
    yes_pool.bump = ctx.bumps.yes_pool;

    // Initialize NO pool
    no_pool.market = market.key();
    no_pool.outcome = MarketOutcome::No;
    no_pool.base_token_mint = market.base_token_mint;
    no_pool.share_token_mint = market.no_share_mint;
    no_pool.base_token_vault = ctx.accounts.no_base_vault.key();
    no_pool.share_token_vault = ctx.accounts.no_share_vault.key();
    no_pool.lp_token_mint = ctx.accounts.no_lp_mint.key();
    no_pool.base_reserves = 0;
    no_pool.share_reserves = 0;
    no_pool.lp_token_supply = 0;
    no_pool.current_price = 500_000; // 0.5 with 6 decimals
    no_pool.volume = 0;
    no_pool.fees_collected = 0;
    no_pool.fee_rate = market.fee_rate;
    no_pool.last_update = Clock::get()?.unix_timestamp;
    no_pool.bump = ctx.bumps.no_pool;

    // Update market with pool addresses
    market.yes_pool = yes_pool.key();
    market.no_pool = no_pool.key();

    msg!("Pools created successfully");
    msg!("YES pool: {}", yes_pool.key());
    msg!("NO pool: {}", no_pool.key());
    msg!("Market: {}", market.key());

    Ok(())
}
