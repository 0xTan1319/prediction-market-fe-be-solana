use anchor_lang::prelude::*;
use anchor_spl::token::{
    Mint, Token, TokenAccount, MintTo, Transfer, 
    mint_to, transfer
};
use crate::state::{Market, Pool, Position, User, MarketOutcome};
use crate::utils::calculate_price_impact;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct TradeParams {
    pub outcome: MarketOutcome,
    pub amount_in: u64,
    pub min_amount_out: u64,
    pub is_buy: bool, // true for buy shares, false for sell shares
}

#[derive(Accounts)]
#[instruction(params: TradeParams)]
pub struct Trade<'info> {
    #[account(
        constraint = market.can_trade() @ crate::errors::PoolOddsError::MarketNotActive
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        constraint = pool.market == market.key() @ crate::errors::PoolOddsError::InvalidPool,
        constraint = pool.outcome == params.outcome @ crate::errors::PoolOddsError::InvalidPool
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        init_if_needed,
        payer = trader,
        space = Position::LEN,
        seeds = [
            b"position",
            trader.key().as_ref(),
            market.key().as_ref(),
            &[params.outcome as u8]
        ],
        bump
    )]
    pub position: Account<'info, Position>,

    #[account(
        init_if_needed,
        payer = trader,
        space = User::LEN,
        seeds = [b"user", trader.key().as_ref()],
        bump
    )]
    pub user: Account<'info, User>,

    #[account(mut)]
    pub trader: Signer<'info>,

    #[account(
        mut,
        constraint = trader_base_account.mint == market.base_token_mint,
        constraint = trader_base_account.owner == trader.key()
    )]
    pub trader_base_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = trader,
        associated_token::mint = share_mint,
        associated_token::authority = trader
    )]
    pub trader_share_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = base_vault.key() == pool.base_token_vault
    )]
    pub base_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = share_vault.key() == pool.share_token_vault
    )]
    pub share_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = share_mint.key() == pool.share_token_mint
    )]
    pub share_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<Trade>, params: TradeParams) -> Result<()> {
    let market = &ctx.accounts.market;
    let pool = &mut ctx.accounts.pool;
    let position = &mut ctx.accounts.position;
    let user = &mut ctx.accounts.user;

    // Calculate trade amounts
    let (amount_out, fee_amount) = if params.is_buy {
        // Buying shares with base tokens
        let amount_out = pool.calculate_swap_output(params.amount_in, true)?;
        require!(
            amount_out >= params.min_amount_out,
            crate::errors::PoolOddsError::SlippageExceeded
        );

        let fee_amount = params.amount_in
            .checked_mul(pool.fee_rate as u64)
            .ok_or(crate::errors::PoolOddsError::MathOverflow)?
            .checked_div(10_000)
            .ok_or(crate::errors::PoolOddsError::DivisionByZero)?;

        (amount_out, fee_amount)
    } else {
        // Selling shares for base tokens
        let amount_out = pool.calculate_swap_output(params.amount_in, false)?;
        require!(
            amount_out >= params.min_amount_out,
            crate::errors::PoolOddsError::SlippageExceeded
        );

        let fee_amount = amount_out
            .checked_mul(pool.fee_rate as u64)
            .ok_or(crate::errors::PoolOddsError::MathOverflow)?
            .checked_div(10_000)
            .ok_or(crate::errors::PoolOddsError::DivisionByZero)?;

        (amount_out.checked_sub(fee_amount).unwrap(), fee_amount)
    };

    // Calculate price impact
    let price_impact = calculate_price_impact(
        if params.is_buy { pool.base_reserves } else { pool.share_reserves },
        params.amount_in,
    )?;

    // Validate price impact (max 10%)
    require!(
        price_impact <= 1000, // 10% in basis points
        crate::errors::PoolOddsError::PriceImpactTooHigh
    );

    // Execute the trade
    if params.is_buy {
        // Transfer base tokens from trader to pool
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.trader_base_account.to_account_info(),
                to: ctx.accounts.base_vault.to_account_info(),
                authority: ctx.accounts.trader.to_account_info(),
            },
        );
        transfer(transfer_ctx, params.amount_in)?;

        // Mint shares to trader
        let market_key = market.key();
        let seeds = &[
            b"market",
            market.creator.as_ref(),
            &market.created_at.to_le_bytes(),
            &[market.bump],
        ];
        let signer = &[&seeds[..]];

        let mint_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.share_mint.to_account_info(),
                to: ctx.accounts.trader_share_account.to_account_info(),
                authority: market.to_account_info(),
            },
            signer,
        );
        mint_to(mint_ctx, amount_out)?;

        // Update pool reserves
        pool.update_reserves_after_swap(params.amount_in, amount_out, fee_amount, true)?;
    } else {
        // Transfer shares from trader to pool (burn)
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.trader_share_account.to_account_info(),
                to: ctx.accounts.share_vault.to_account_info(),
                authority: ctx.accounts.trader.to_account_info(),
            },
        );
        transfer(transfer_ctx, params.amount_in)?;

        // Transfer base tokens from pool to trader
        let pool_key = pool.key();
        let seeds = &[
            b"pool",
            market.key().as_ref(),
            match params.outcome {
                MarketOutcome::Yes => b"yes",
                MarketOutcome::No => b"no",
            },
            &[pool.bump],
        ];
        let signer = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.base_vault.to_account_info(),
                to: ctx.accounts.trader_base_account.to_account_info(),
                authority: pool.to_account_info(),
            },
            signer,
        );
        transfer(transfer_ctx, amount_out)?;

        // Update pool reserves
        pool.update_reserves_after_swap(params.amount_in, amount_out, fee_amount, false)?;
    }

    // Update position
    if position.owner == Pubkey::default() {
        position.owner = ctx.accounts.trader.key();
        position.market = market.key();
        position.outcome = params.outcome;
        position.shares = 0;
        position.average_price = 0;
        position.total_invested = 0;
        position.realized_pnl = 0;
        position.created_at = Clock::get()?.unix_timestamp;
        position.bump = ctx.bumps.position;
    }

    let shares_delta = if params.is_buy {
        amount_out as i64
    } else {
        -(params.amount_in as i64)
    };

    let trade_amount = if params.is_buy {
        params.amount_in
    } else {
        amount_out
    };

    position.update_after_trade(shares_delta, pool.current_price, trade_amount)?;

    // Update user stats
    if user.authority == Pubkey::default() {
        user.authority = ctx.accounts.trader.key();
        user.created_at = Clock::get()?.unix_timestamp;
        user.bump = ctx.bumps.user;
    }
    user.update_after_trade(params.amount_in, fee_amount)?;

    // Update market stats
    let market = &mut ctx.accounts.market;
    market.total_volume = market.total_volume
        .checked_add(params.amount_in)
        .ok_or(crate::errors::PoolOddsError::MathOverflow)?;

    msg!("Trade executed successfully");
    msg!("Trader: {}", ctx.accounts.trader.key());
    msg!("Market: {}", market.key());
    msg!("Outcome: {:?}", params.outcome);
    msg!("Amount in: {}", params.amount_in);
    msg!("Amount out: {}", amount_out);
    msg!("Fee: {}", fee_amount);
    msg!("Price impact: {}bp", price_impact);

    Ok(())
}
