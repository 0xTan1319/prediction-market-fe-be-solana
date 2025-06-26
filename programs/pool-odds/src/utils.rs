use anchor_lang::prelude::*;

/// Calculate price impact for a trade
pub fn calculate_price_impact(reserve: u64, trade_amount: u64) -> Result<u16> {
    if reserve == 0 {
        return Ok(0);
    }

    let impact = trade_amount
        .checked_mul(10_000) // Convert to basis points
        .ok_or(crate::errors::PoolOddsError::MathOverflow)?
        .checked_div(reserve)
        .ok_or(crate::errors::PoolOddsError::DivisionByZero)?;

    // Cap at 100% (10000 basis points)
    Ok(std::cmp::min(impact, 10_000) as u16)
}

/// Calculate square root using Newton's method (for geometric mean)
pub fn sqrt(x: u64) -> u64 {
    if x == 0 {
        return 0;
    }
    
    let mut z = x;
    let mut y = (x + 1) / 2;
    
    while y < z {
        z = y;
        y = (x / y + y) / 2;
    }
    
    z
}

/// Safe multiplication with overflow check
pub fn safe_mul(a: u64, b: u64) -> Result<u64> {
    a.checked_mul(b)
        .ok_or(crate::errors::PoolOddsError::MathOverflow.into())
}

/// Safe division with zero check
pub fn safe_div(a: u64, b: u64) -> Result<u64> {
    if b == 0 {
        return Err(crate::errors::PoolOddsError::DivisionByZero.into());
    }
    Ok(a / b)
}

/// Calculate percentage with basis points precision
pub fn calculate_percentage(amount: u64, percentage_bp: u16) -> Result<u64> {
    safe_mul(amount, percentage_bp as u64)?
        .checked_div(10_000)
        .ok_or(crate::errors::PoolOddsError::DivisionByZero.into())
}

/// Validate string length and content
pub fn validate_string(s: &str, max_length: usize, field_name: &str) -> Result<()> {
    require!(
        s.len() <= max_length,
        crate::errors::PoolOddsError::InvalidParameter
    );
    
    require!(
        !s.trim().is_empty(),
        crate::errors::PoolOddsError::InvalidParameter
    );
    
    // Check for valid UTF-8 and printable characters
    require!(
        s.chars().all(|c| c.is_ascii() && !c.is_control()),
        crate::errors::PoolOddsError::InvalidParameter
    );
    
    Ok(())
}

/// Convert timestamp to human readable format (for logging)
pub fn format_timestamp(timestamp: i64) -> String {
    format!("Unix timestamp: {}", timestamp)
}

/// Calculate time remaining until market end
pub fn time_until_end(end_time: i64) -> Result<i64> {
    let current_time = Clock::get()?.unix_timestamp;
    Ok(std::cmp::max(0, end_time - current_time))
}

/// Check if market is within trading hours (if applicable)
pub fn is_trading_hours() -> bool {
    // For now, always return true (24/7 trading)
    // This can be extended to implement trading hour restrictions
    true
}

/// Calculate compound interest (for fee projections)
pub fn compound_interest(principal: u64, rate_bp: u16, periods: u64) -> Result<u64> {
    let rate = rate_bp as f64 / 10_000.0;
    let compound_factor = (1.0 + rate).powf(periods as f64);
    let result = (principal as f64 * compound_factor) as u64;
    
    require!(
        result >= principal,
        crate::errors::PoolOddsError::MathOverflow
    );
    
    Ok(result)
}

/// Validate oracle price data
pub fn validate_oracle_price(price: i64, confidence: u64, timestamp: i64) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    
    // Check price is positive
    require!(
        price > 0,
        crate::errors::PoolOddsError::InvalidOracleData
    );
    
    // Check confidence is reasonable (less than 10% of price)
    require!(
        confidence < (price as u64) / 10,
        crate::errors::PoolOddsError::InvalidOracleData
    );
    
    // Check timestamp is not too old
    require!(
        current_time - timestamp <= crate::constants::MAX_PRICE_AGE,
        crate::errors::PoolOddsError::StalePriceData
    );
    
    Ok(())
}

/// Calculate optimal liquidity distribution
pub fn calculate_optimal_liquidity_ratio(
    yes_volume: u64,
    no_volume: u64,
    time_to_expiry: i64,
) -> Result<(u16, u16)> {
    let total_volume = yes_volume.checked_add(no_volume)
        .ok_or(crate::errors::PoolOddsError::MathOverflow)?;
    
    if total_volume == 0 {
        return Ok((5000, 5000)); // 50/50 split
    }
    
    // Base ratio on volume
    let yes_ratio = (yes_volume * 10_000 / total_volume) as u16;
    let no_ratio = 10_000 - yes_ratio;
    
    // Adjust based on time to expiry (more balanced as expiry approaches)
    let time_factor = std::cmp::min(time_to_expiry, 86400) as u16; // Cap at 1 day
    let adjustment = (5000 - yes_ratio) * time_factor / 86400;
    
    let adjusted_yes = yes_ratio + adjustment;
    let adjusted_no = 10_000 - adjusted_yes;
    
    Ok((adjusted_yes, adjusted_no))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_price_impact() {
        assert_eq!(calculate_price_impact(1000, 100).unwrap(), 1000); // 10%
        assert_eq!(calculate_price_impact(1000, 50).unwrap(), 500);   // 5%
        assert_eq!(calculate_price_impact(1000, 0).unwrap(), 0);     // 0%
    }

    #[test]
    fn test_sqrt() {
        assert_eq!(sqrt(0), 0);
        assert_eq!(sqrt(1), 1);
        assert_eq!(sqrt(4), 2);
        assert_eq!(sqrt(9), 3);
        assert_eq!(sqrt(16), 4);
        assert_eq!(sqrt(100), 10);
    }

    #[test]
    fn test_safe_operations() {
        assert_eq!(safe_mul(10, 20).unwrap(), 200);
        assert_eq!(safe_div(100, 10).unwrap(), 10);
        assert!(safe_div(100, 0).is_err());
    }

    #[test]
    fn test_calculate_percentage() {
        assert_eq!(calculate_percentage(1000, 500).unwrap(), 50); // 5%
        assert_eq!(calculate_percentage(1000, 1000).unwrap(), 100); // 10%
    }
}
