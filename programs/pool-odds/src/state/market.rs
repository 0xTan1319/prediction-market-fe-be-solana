use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MarketStatus {
    Active,
    Resolved,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MarketOutcome {
    Yes,
    No,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ResolutionSource {
    Oracle,
    Manual,
}

#[account]
#[derive(Default)]
pub struct Market {
    /// Market creator
    pub creator: Pubkey,
    /// Market title (first 64 bytes)
    pub title: [u8; 64],
    /// Market description (first 128 bytes)
    pub description: [u8; 128],
    /// Market category
    pub category: u8,
    /// Market status
    pub status: MarketStatus,
    /// Resolution source
    pub resolution_source: ResolutionSource,
    /// Oracle account for price feeds
    pub oracle_account: Option<Pubkey>,
    /// Target price for oracle resolution
    pub target_price: Option<u64>,
    /// Market creation timestamp
    pub created_at: i64,
    /// Market end timestamp
    pub end_time: i64,
    /// Market resolution timestamp
    pub resolved_at: Option<i64>,
    /// Winning outcome (if resolved)
    pub winning_outcome: Option<MarketOutcome>,
    /// YES pool account
    pub yes_pool: Pubkey,
    /// NO pool account
    pub no_pool: Pubkey,
    /// Base token mint (usually USDC)
    pub base_token_mint: Pubkey,
    /// YES share token mint
    pub yes_share_mint: Pubkey,
    /// NO share token mint
    pub no_share_mint: Pubkey,
    /// Market fee rate (basis points)
    pub fee_rate: u16,
    /// Total volume traded
    pub total_volume: u64,
    /// Total liquidity provided
    pub total_liquidity: u64,
    /// Creator bond amount
    pub bond_amount: u64,
    /// Number of traders
    pub trader_count: u32,
    /// Number of liquidity providers
    pub lp_count: u32,
    /// Market bump seed
    pub bump: u8,
    /// Reserved space for future upgrades
    pub reserved: [u8; 64],
}

impl Market {
    pub const LEN: usize = 8 + // discriminator
        32 + // creator
        64 + // title
        128 + // description
        1 + // category
        1 + // status
        1 + // resolution_source
        33 + // oracle_account (Option<Pubkey>)
        9 + // target_price (Option<u64>)
        8 + // created_at
        8 + // end_time
        9 + // resolved_at (Option<i64>)
        2 + // winning_outcome (Option<MarketOutcome>)
        32 + // yes_pool
        32 + // no_pool
        32 + // base_token_mint
        32 + // yes_share_mint
        32 + // no_share_mint
        2 + // fee_rate
        8 + // total_volume
        8 + // total_liquidity
        8 + // bond_amount
        4 + // trader_count
        4 + // lp_count
        1 + // bump
        64; // reserved

    pub fn is_active(&self) -> bool {
        self.status == MarketStatus::Active
    }

    pub fn is_resolved(&self) -> bool {
        self.status == MarketStatus::Resolved
    }

    pub fn is_expired(&self) -> bool {
        let current_time = Clock::get().unwrap().unix_timestamp;
        current_time >= self.end_time
    }

    pub fn can_trade(&self) -> bool {
        self.is_active() && !self.is_expired()
    }

    pub fn can_resolve(&self) -> bool {
        self.is_active() && (self.is_expired() || self.resolution_source == ResolutionSource::Manual)
    }

    pub fn set_title(&mut self, title: &str) -> Result<()> {
        let title_bytes = title.as_bytes();
        require!(title_bytes.len() <= 64, crate::errors::PoolOddsError::TitleTooLong);
        
        self.title = [0; 64];
        self.title[..title_bytes.len()].copy_from_slice(title_bytes);
        Ok(())
    }

    pub fn set_description(&mut self, description: &str) -> Result<()> {
        let desc_bytes = description.as_bytes();
        require!(desc_bytes.len() <= 128, crate::errors::PoolOddsError::DescriptionTooLong);
        
        self.description = [0; 128];
        self.description[..desc_bytes.len()].copy_from_slice(desc_bytes);
        Ok(())
    }

    pub fn get_title(&self) -> String {
        String::from_utf8_lossy(&self.title)
            .trim_end_matches('\0')
            .to_string()
    }

    pub fn get_description(&self) -> String {
        String::from_utf8_lossy(&self.description)
            .trim_end_matches('\0')
            .to_string()
    }
}
