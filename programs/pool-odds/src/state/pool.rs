use anchor_lang::prelude::*;
use crate::state::MarketOutcome;

#[account]
#[derive(Default)]
pub struct Pool {
    /// Associated market
    pub market: Pubkey,
    /// Pool outcome (YES or NO)
    pub outcome: MarketOutcome,
    /// Base token mint (USDC)
    pub base_token_mint: Pubkey,
    /// Share token mint
    pub share_token_mint: Pubkey,
    /// Base token vault
    pub base_token_vault: Pubkey,
    /// Share token vault
    pub share_token_vault: Pubkey,
    /// LP token mint
    pub lp_token_mint: Pubkey,
    /// Current base token reserves
    pub base_reserves: u64,
    /// Current share token reserves
    pub share_reserves: u64,
    /// Total LP tokens issued
    pub lp_token_supply: u64,
    /// Current price (base tokens per share)
    pub current_price: u64,
    /// Total volume traded
    pub volume: u64,
    /// Total fees collected
    pub fees_collected: u64,
    /// Fee rate (basis points)
    pub fee_rate: u16,
    /// Last update timestamp
    pub last_update: i64,
    /// Pool bump seed
    pub bump: u8,
    /// Reserved space for future upgrades
    pub reserved: [u8; 64],
}

impl Pool {
    pub const LEN: usize = 8 + // discriminator
        32 + // market
        1 + // outcome
        32 + // base_token_mint
        32 + // share_token_mint
        32 + // base_token_vault
        32 + // share_token_vault
        32 + // lp_token_mint
        8 + // base_reserves
        8 + // share_reserves
        8 + // lp_token_supply
        8 + // current_price
        8 + // volume
        8 + // fees_collected
        2 + // fee_rate
        8 + // last_update
        1 + // bump
        64; // reserved

    /// Calculate the current price based on reserves using constant product formula
    pub fn calculate_price(&self) -> Result<u64> {
        if self.share_reserves == 0 {
            return Ok(1_000_000); // Default price of 1.0 (with 6 decimals)
        }
        
        // Price = base_reserves / share_reserves
        let price = self.base_reserves
            .checked_mul(1_000_000) // Scale by 6 decimals
            .ok_or(crate::errors::PoolOddsError::MathOverflow)?
            .checked_div(self.share_reserves)
            .ok_or(crate::errors::PoolOddsError::DivisionByZero)?;
            
        Ok(price)
    }

    /// Calculate output amount for a given input (constant product AMM)
    pub fn calculate_swap_output(&self, input_amount: u64, input_is_base: bool) -> Result<u64> {
        let (input_reserve, output_reserve) = if input_is_base {
            (self.base_reserves, self.share_reserves)
        } else {
            (self.share_reserves, self.base_reserves)
        };

        require!(input_reserve > 0 && output_reserve > 0, crate::errors::PoolOddsError::InsufficientLiquidity);

        // Apply fee
        let fee_amount = input_amount
            .checked_mul(self.fee_rate as u64)
            .ok_or(crate::errors::PoolOddsError::MathOverflow)?
            .checked_div(10_000)
            .ok_or(crate::errors::PoolOddsError::DivisionByZero)?;

        let input_after_fee = input_amount
            .checked_sub(fee_amount)
            .ok_or(crate::errors::PoolOddsError::MathOverflow)?;

        // Constant product formula: (x + dx) * (y - dy) = x * y
        // dy = (y * dx) / (x + dx)
        let numerator = output_reserve
            .checked_mul(input_after_fee)
            .ok_or(crate::errors::PoolOddsError::MathOverflow)?;

        let denominator = input_reserve
            .checked_add(input_after_fee)
            .ok_or(crate::errors::PoolOddsError::MathOverflow)?;

        let output_amount = numerator
            .checked_div(denominator)
            .ok_or(crate::errors::PoolOddsError::DivisionByZero)?;

        Ok(output_amount)
    }

    /// Calculate liquidity tokens to mint for given deposits
    pub fn calculate_lp_tokens(&self, base_deposit: u64, share_deposit: u64) -> Result<u64> {
        if self.lp_token_supply == 0 {
            // Initial liquidity - use geometric mean
            let lp_tokens = (base_deposit as u128)
                .checked_mul(share_deposit as u128)
                .ok_or(crate::errors::PoolOddsError::MathOverflow)?;
            
            // Take square root (simplified)
            let lp_tokens = (lp_tokens as f64).sqrt() as u64;
            
            require!(lp_tokens > 0, crate::errors::PoolOddsError::InsufficientLiquidityMinted);
            Ok(lp_tokens)
        } else {
            // Proportional to existing liquidity
            let base_ratio = base_deposit
                .checked_mul(self.lp_token_supply)
                .ok_or(crate::errors::PoolOddsError::MathOverflow)?
                .checked_div(self.base_reserves)
                .ok_or(crate::errors::PoolOddsError::DivisionByZero)?;

            let share_ratio = share_deposit
                .checked_mul(self.lp_token_supply)
                .ok_or(crate::errors::PoolOddsError::MathOverflow)?
                .checked_div(self.share_reserves)
                .ok_or(crate::errors::PoolOddsError::DivisionByZero)?;

            // Use the minimum ratio to maintain proportions
            Ok(std::cmp::min(base_ratio, share_ratio))
        }
    }

    /// Update reserves after a swap
    pub fn update_reserves_after_swap(
        &mut self,
        input_amount: u64,
        output_amount: u64,
        fee_amount: u64,
        input_is_base: bool,
    ) -> Result<()> {
        if input_is_base {
            self.base_reserves = self.base_reserves
                .checked_add(input_amount)
                .ok_or(crate::errors::PoolOddsError::MathOverflow)?;
            
            self.share_reserves = self.share_reserves
                .checked_sub(output_amount)
                .ok_or(crate::errors::PoolOddsError::InsufficientLiquidity)?;
        } else {
            self.share_reserves = self.share_reserves
                .checked_add(input_amount)
                .ok_or(crate::errors::PoolOddsError::MathOverflow)?;
            
            self.base_reserves = self.base_reserves
                .checked_sub(output_amount)
                .ok_or(crate::errors::PoolOddsError::InsufficientLiquidity)?;
        }

        self.fees_collected = self.fees_collected
            .checked_add(fee_amount)
            .ok_or(crate::errors::PoolOddsError::MathOverflow)?;

        self.volume = self.volume
            .checked_add(input_amount)
            .ok_or(crate::errors::PoolOddsError::MathOverflow)?;

        self.current_price = self.calculate_price()?;
        self.last_update = Clock::get()?.unix_timestamp;

        Ok(())
    }
}
