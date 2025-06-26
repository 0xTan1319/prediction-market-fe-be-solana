use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount, transfer, Transfer};
use crate::state::{GlobalState, Market, User, MarketStatus, ResolutionSource};
use crate::constants::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateMarketParams {
    pub title: String,
    pub description: String,
    pub category: u8,
    pub end_time: i64,
    pub resolution_source: ResolutionSource,
    pub oracle_account: Option<Pubkey>,
    pub target_price: Option<u64>,
    pub bond_amount: u64,
}

#[derive(Accounts)]
#[instruction(params: CreateMarketParams)]
pub struct CreateMarket<'info> {
    #[account(
        mut,
        seeds = [b"global_state"],
        bump,
        constraint = !global_state.is_paused() @ crate::errors::PoolOddsError::ProgramPaused
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        init,
        payer = creator,
        space = Market::LEN,
        seeds = [
            b"market",
            creator.key().as_ref(),
            &global_state.total_markets.to_le_bytes()
        ],
        bump
    )]
    pub market: Account<'info, Market>,

    #[account(
        init_if_needed,
        payer = creator,
        space = User::LEN,
        seeds = [b"user", creator.key().as_ref()],
        bump
    )]
    pub user: Account<'info, User>,

    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        mint::decimals = 6,
        mint::authority = market,
        seeds = [b"yes_share_mint", market.key().as_ref()],
        bump
    )]
    pub yes_share_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        mint::decimals = 6,
        mint::authority = market,
        seeds = [b"no_share_mint", market.key().as_ref()],
        bump
    )]
    pub no_share_mint: Account<'info, Mint>,

    pub base_token_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = creator_base_account.mint == base_token_mint.key(),
        constraint = creator_base_account.owner == creator.key()
    )]
    pub creator_base_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = bond_vault.mint == base_token_mint.key()
    )]
    pub bond_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<CreateMarket>, params: CreateMarketParams) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    let market = &mut ctx.accounts.market;
    let user = &mut ctx.accounts.user;

    // Validate parameters
    global_state.validate_market_duration(
        params.end_time - Clock::get()?.unix_timestamp
    )?;
    global_state.validate_bond_amount(params.bond_amount)?;

    require!(
        params.title.len() <= 64,
        crate::errors::PoolOddsError::TitleTooLong
    );
    require!(
        params.description.len() <= 128,
        crate::errors::PoolOddsError::DescriptionTooLong
    );
    require!(
        params.end_time > Clock::get()?.unix_timestamp,
        crate::errors::PoolOddsError::InvalidEndTime
    );

    // Check if user can create more markets
    require!(
        user.can_create_market(global_state.max_markets_per_creator),
        crate::errors::PoolOddsError::TooManyMarkets
    );

    // Validate oracle parameters if using oracle resolution
    if params.resolution_source == ResolutionSource::Oracle {
        require!(
            params.oracle_account.is_some() && params.target_price.is_some(),
            crate::errors::PoolOddsError::MissingOracleData
        );
    }

    // Transfer bond from creator
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.creator_base_account.to_account_info(),
            to: ctx.accounts.bond_vault.to_account_info(),
            authority: ctx.accounts.creator.to_account_info(),
        },
    );
    transfer(transfer_ctx, params.bond_amount)?;

    // Initialize market
    market.creator = ctx.accounts.creator.key();
    market.set_title(&params.title)?;
    market.set_description(&params.description)?;
    market.category = params.category;
    market.status = MarketStatus::Active;
    market.resolution_source = params.resolution_source;
    market.oracle_account = params.oracle_account;
    market.target_price = params.target_price;
    market.created_at = Clock::get()?.unix_timestamp;
    market.end_time = params.end_time;
    market.resolved_at = None;
    market.winning_outcome = None;
    market.yes_pool = Pubkey::default(); // Will be set when pools are created
    market.no_pool = Pubkey::default();
    market.base_token_mint = ctx.accounts.base_token_mint.key();
    market.yes_share_mint = ctx.accounts.yes_share_mint.key();
    market.no_share_mint = ctx.accounts.no_share_mint.key();
    market.fee_rate = global_state.default_market_fee_rate;
    market.total_volume = 0;
    market.total_liquidity = 0;
    market.bond_amount = params.bond_amount;
    market.trader_count = 0;
    market.lp_count = 0;
    market.bump = ctx.bumps.market;

    // Update global state
    global_state.total_markets = global_state.total_markets
        .checked_add(1)
        .ok_or(crate::errors::PoolOddsError::MathOverflow)?;

    // Update user stats
    if user.authority == Pubkey::default() {
        user.authority = ctx.accounts.creator.key();
        user.created_at = Clock::get()?.unix_timestamp;
        user.bump = ctx.bumps.user;
    }
    user.update_after_market_creation()?;

    msg!("Market created successfully");
    msg!("Market: {}", market.key());
    msg!("Title: {}", market.get_title());
    msg!("Creator: {}", market.creator);
    msg!("End time: {}", market.end_time);
    msg!("Bond amount: {}", market.bond_amount);

    Ok(())
}
