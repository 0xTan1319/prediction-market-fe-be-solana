use anchor_lang::prelude::*;
use crate::state::MarketOutcome;

#[account]
#[derive(Default)]
pub struct Position {
    /// Position owner
    pub owner: Pubkey,
    /// Associated market
    pub market: Pubkey,
    /// Position outcome (YES or NO)
    pub outcome: MarketOutcome,
    /// Number of shares owned
    pub shares: u64,
    /// Average entry price
    pub average_price: u64,
    /// Total amount invested
    pub total_invested: u64,
    /// Realized profit/loss
    pub realized_pnl: i64,
    /// Position creation timestamp
    pub created_at: i64,
    /// Last update timestamp
    pub last_update: i64,
    /// Position bump seed
    pub bump: u8,
    /// Reserved space for future upgrades
    pub reserved: [u8; 32],
}

impl Position {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        32 + // market
        1 + // outcome
        8 + // shares
        8 + // average_price
        8 + // total_invested
        8 + // realized_pnl
        8 + // created_at
        8 + // last_update
        1 + // bump
        32; // reserved

    /// Calculate unrealized P&L based on current market price
    pub fn calculate_unrealized_pnl(&self, current_price: u64) -> Result<i64> {
        if self.shares == 0 {
            return Ok(0);
        }

        let current_value = self.shares
            .checked_mul(current_price)
            .ok_or(crate::errors::PoolOddsError::MathOverflow)?
            .checked_div(1_000_000) // Adjust for price decimals
            .ok_or(crate::errors::PoolOddsError::DivisionByZero)?;

        let unrealized_pnl = (current_value as i64)
            .checked_sub(self.total_invested as i64)
            .ok_or(crate::errors::PoolOddsError::MathOverflow)?;

        Ok(unrealized_pnl)
    }

    /// Update position after a trade
    pub fn update_after_trade(
        &mut self,
        shares_delta: i64,
        price: u64,
        amount: u64,
    ) -> Result<()> {
        if shares_delta > 0 {
            // Buying shares
            let new_shares = self.shares
                .checked_add(shares_delta as u64)
                .ok_or(crate::errors::PoolOddsError::MathOverflow)?;

            let new_total_invested = self.total_invested
                .checked_add(amount)
                .ok_or(crate::errors::PoolOddsError::MathOverflow)?;

            // Update average price
            if new_shares > 0 {
                self.average_price = new_total_invested
                    .checked_mul(1_000_000) // Price decimals
                    .ok_or(crate::errors::PoolOddsError::MathOverflow)?
                    .checked_div(new_shares)
                    .ok_or(crate::errors::PoolOddsError::DivisionByZero)?;
            }

            self.shares = new_shares;
            self.total_invested = new_total_invested;
        } else {
            // Selling shares
            let shares_to_sell = (-shares_delta) as u64;
            require!(
                self.shares >= shares_to_sell,
                crate::errors::PoolOddsError::InsufficientShares
            );

            // Calculate realized P&L for sold shares
            let cost_basis = shares_to_sell
                .checked_mul(self.average_price)
                .ok_or(crate::errors::PoolOddsError::MathOverflow)?
                .checked_div(1_000_000)
                .ok_or(crate::errors::PoolOddsError::DivisionByZero)?;

            let realized_pnl_delta = (amount as i64)
                .checked_sub(cost_basis as i64)
                .ok_or(crate::errors::PoolOddsError::MathOverflow)?;

            self.realized_pnl = self.realized_pnl
                .checked_add(realized_pnl_delta)
                .ok_or(crate::errors::PoolOddsError::MathOverflow)?;

            self.shares = self.shares
                .checked_sub(shares_to_sell)
                .ok_or(crate::errors::PoolOddsError::InsufficientShares)?;

            self.total_invested = self.total_invested
                .checked_sub(cost_basis)
                .ok_or(crate::errors::PoolOddsError::MathOverflow)?;
        }

        self.last_update = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Calculate total P&L (realized + unrealized)
    pub fn calculate_total_pnl(&self, current_price: u64) -> Result<i64> {
        let unrealized_pnl = self.calculate_unrealized_pnl(current_price)?;
        Ok(self.realized_pnl
            .checked_add(unrealized_pnl)
            .ok_or(crate::errors::PoolOddsError::MathOverflow)?)
    }
}

#[account]
#[derive(Default)]
pub struct LiquidityPosition {
    /// Position owner
    pub owner: Pubkey,
    /// Associated pool
    pub pool: Pubkey,
    /// LP tokens owned
    pub lp_tokens: u64,
    /// Initial base token deposit
    pub initial_base_deposit: u64,
    /// Initial share token deposit
    pub initial_share_deposit: u64,
    /// Fees earned
    pub fees_earned: u64,
    /// Position creation timestamp
    pub created_at: i64,
    /// Last update timestamp
    pub last_update: i64,
    /// Position bump seed
    pub bump: u8,
    /// Reserved space for future upgrades
    pub reserved: [u8; 32],
}

impl LiquidityPosition {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        32 + // pool
        8 + // lp_tokens
        8 + // initial_base_deposit
        8 + // initial_share_deposit
        8 + // fees_earned
        8 + // created_at
        8 + // last_update
        1 + // bump
        32; // reserved

    /// Calculate current value of LP position
    pub fn calculate_current_value(
        &self,
        pool_base_reserves: u64,
        pool_share_reserves: u64,
        pool_lp_supply: u64,
    ) -> Result<(u64, u64)> {
        if pool_lp_supply == 0 || self.lp_tokens == 0 {
            return Ok((0, 0));
        }

        let base_value = pool_base_reserves
            .checked_mul(self.lp_tokens)
            .ok_or(crate::errors::PoolOddsError::MathOverflow)?
            .checked_div(pool_lp_supply)
            .ok_or(crate::errors::PoolOddsError::DivisionByZero)?;

        let share_value = pool_share_reserves
            .checked_mul(self.lp_tokens)
            .ok_or(crate::errors::PoolOddsError::MathOverflow)?
            .checked_div(pool_lp_supply)
            .ok_or(crate::errors::PoolOddsError::DivisionByZero)?;

        Ok((base_value, share_value))
    }

    /// Calculate impermanent loss
    pub fn calculate_impermanent_loss(
        &self,
        current_base_value: u64,
        current_share_value: u64,
        current_price: u64,
    ) -> Result<i64> {
        // Calculate what the position would be worth if held individually
        let initial_price = if self.initial_share_deposit > 0 {
            self.initial_base_deposit
                .checked_mul(1_000_000)
                .ok_or(crate::errors::PoolOddsError::MathOverflow)?
                .checked_div(self.initial_share_deposit)
                .ok_or(crate::errors::PoolOddsError::DivisionByZero)?
        } else {
            1_000_000 // Default price
        };

        let price_ratio = current_price
            .checked_mul(1_000_000)
            .ok_or(crate::errors::PoolOddsError::MathOverflow)?
            .checked_div(initial_price)
            .ok_or(crate::errors::PoolOddsError::DivisionByZero)?;

        // Simplified impermanent loss calculation
        let hodl_value = if price_ratio >= 1_000_000 {
            // Price increased - would have more base tokens
            self.initial_base_deposit
                .checked_mul(price_ratio)
                .ok_or(crate::errors::PoolOddsError::MathOverflow)?
                .checked_div(1_000_000)
                .ok_or(crate::errors::PoolOddsError::DivisionByZero)?
        } else {
            // Price decreased - would have more share tokens
            self.initial_share_deposit
                .checked_mul(current_price)
                .ok_or(crate::errors::PoolOddsError::MathOverflow)?
                .checked_div(1_000_000)
                .ok_or(crate::errors::PoolOddsError::DivisionByZero)?
        };

        let lp_value = current_base_value
            .checked_add(current_share_value
                .checked_mul(current_price)
                .ok_or(crate::errors::PoolOddsError::MathOverflow)?
                .checked_div(1_000_000)
                .ok_or(crate::errors::PoolOddsError::DivisionByZero)?)
            .ok_or(crate::errors::PoolOddsError::MathOverflow)?;

        let impermanent_loss = (lp_value as i64)
            .checked_sub(hodl_value as i64)
            .ok_or(crate::errors::PoolOddsError::MathOverflow)?;

        Ok(impermanent_loss)
    }
}
