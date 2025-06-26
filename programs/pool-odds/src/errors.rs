use anchor_lang::prelude::*;

#[error_code]
pub enum PoolOddsError {
    #[msg("Program is currently paused")]
    ProgramPaused,

    #[msg("Unauthorized access")]
    Unauthorized,

    #[msg("Invalid fee rate")]
    InvalidFeeRate,

    #[msg("Invalid market duration")]
    InvalidMarketDuration,

    #[msg("Insufficient bond amount")]
    InsufficientBondAmount,

    #[msg("Invalid parameter")]
    InvalidParameter,

    #[msg("Title too long")]
    TitleTooLong,

    #[msg("Description too long")]
    DescriptionTooLong,

    #[msg("Invalid end time")]
    InvalidEndTime,

    #[msg("Too many markets created")]
    TooManyMarkets,

    #[msg("Missing oracle data")]
    MissingOracleData,

    #[msg("Market not active")]
    MarketNotActive,

    #[msg("Invalid pool")]
    InvalidPool,

    #[msg("Math overflow")]
    MathOverflow,

    #[msg("Division by zero")]
    DivisionByZero,

    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,

    #[msg("Insufficient liquidity minted")]
    InsufficientLiquidityMinted,

    #[msg("Insufficient shares")]
    InsufficientShares,

    #[msg("Slippage exceeded")]
    SlippageExceeded,

    #[msg("Price impact too high")]
    PriceImpactTooHigh,

    #[msg("Cannot resolve market")]
    CannotResolve,

    #[msg("Missing oracle account")]
    MissingOracleAccount,

    #[msg("Invalid oracle account")]
    InvalidOracleAccount,

    #[msg("Invalid oracle data")]
    InvalidOracleData,

    #[msg("Stale price data")]
    StalePriceData,

    #[msg("Missing outcome")]
    MissingOutcome,

    #[msg("Market already resolved")]
    MarketAlreadyResolved,

    #[msg("No winnings to claim")]
    NoWinningsToClaim,

    #[msg("Invalid liquidity amount")]
    InvalidLiquidityAmount,

    #[msg("Insufficient LP tokens")]
    InsufficientLPTokens,

    #[msg("Market expired")]
    MarketExpired,

    #[msg("Invalid token account")]
    InvalidTokenAccount,

    #[msg("Invalid mint")]
    InvalidMint,

    #[msg("Token transfer failed")]
    TokenTransferFailed,

    #[msg("Mint operation failed")]
    MintFailed,

    #[msg("Burn operation failed")]
    BurnFailed,
}
