// Fixed database types with proper type handling
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          wallet_address: string
          username: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          wallet_address: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          wallet_address?: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      markets: {
        Row: {
          id: string
          slug: string
          title: string
          description: string | null
          category: string
          creator_id: string | null
          end_date: string
          resolved: boolean
          winning_outcome: "YES" | "NO" | null
          resolution_source: string | null
          bond_amount: string // Changed from number to string for DECIMAL
          total_volume: string // Changed from number to string for DECIMAL
          yes_pool_id: string | null
          no_pool_id: string | null
          oracle_config: any | null
          metadata: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          description?: string | null
          category: string
          creator_id?: string | null
          end_date: string
          resolved?: boolean
          winning_outcome?: "YES" | "NO" | null
          resolution_source?: string | null
          bond_amount?: string // Changed from number to string
          total_volume?: string // Changed from number to string
          yes_pool_id?: string | null
          no_pool_id?: string | null
          oracle_config?: any | null
          metadata?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          description?: string | null
          category?: string
          creator_id?: string | null
          end_date?: string
          resolved?: boolean
          winning_outcome?: "YES" | "NO" | null
          resolution_source?: string | null
          bond_amount?: string // Changed from number to string
          total_volume?: string // Changed from number to string
          yes_pool_id?: string | null
          no_pool_id?: string | null
          oracle_config?: any | null
          metadata?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      pools: {
        Row: {
          id: string
          market_id: string
          outcome: "YES" | "NO"
          token_a: string
          token_b: string
          liquidity: string // Changed from number to string for DECIMAL
          price: string // Changed from number to string for DECIMAL
          volume_24h: string // Changed from number to string for DECIMAL
          fees: string // Changed from number to string for DECIMAL
          active_bin_id: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          market_id: string
          outcome: "YES" | "NO"
          token_a: string
          token_b: string
          liquidity?: string // Changed from number to string
          price?: string // Changed from number to string
          volume_24h?: string // Changed from number to string
          fees?: string // Changed from number to string
          active_bin_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          market_id?: string
          outcome?: "YES" | "NO"
          token_a?: string
          token_b?: string
          liquidity?: string // Changed from number to string
          price?: string // Changed from number to string
          volume_24h?: string // Changed from number to string
          fees?: string // Changed from number to string
          active_bin_id?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      pool_bins: {
        Row: {
          id: string
          pool_id: string
          bin_id: number
          price: string // Changed from number to string for DECIMAL
          liquidity_x: string // Changed from number to string for DECIMAL
          liquidity_y: string // Changed from number to string for DECIMAL
          fee_rate: string // Changed from number to string for DECIMAL
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pool_id: string
          bin_id: number
          price: string // Changed from number to string
          liquidity_x?: string // Changed from number to string
          liquidity_y?: string // Changed from number to string
          fee_rate?: string // Changed from number to string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pool_id?: string
          bin_id?: number
          price?: string // Changed from number to string
          liquidity_x?: string // Changed from number to string
          liquidity_y?: string // Changed from number to string
          fee_rate?: string // Changed from number to string
          created_at?: string
          updated_at?: string
        }
      }
      trades: {
        Row: {
          id: string
          user_id: string
          market_id: string
          pool_id: string
          outcome: "YES" | "NO"
          trade_type: "BUY" | "SELL"
          amount_in: string // Changed from number to string for DECIMAL
          amount_out: string // Changed from number to string for DECIMAL
          price: string // Changed from number to string for DECIMAL
          slippage: string | null // Changed from number to string for DECIMAL
          fee: string | null // Changed from number to string for DECIMAL
          transaction_signature: string | null
          status: "PENDING" | "CONFIRMED" | "FAILED"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          market_id: string
          pool_id: string
          outcome: "YES" | "NO"
          trade_type: "BUY" | "SELL"
          amount_in: string // Changed from number to string
          amount_out: string // Changed from number to string
          price: string // Changed from number to string
          slippage?: string | null // Changed from number to string
          fee?: string | null // Changed from number to string
          transaction_signature?: string | null
          status?: "PENDING" | "CONFIRMED" | "FAILED"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          market_id?: string
          pool_id?: string
          outcome?: "YES" | "NO"
          trade_type?: "BUY" | "SELL"
          amount_in?: string // Changed from number to string
          amount_out?: string // Changed from number to string
          price?: string // Changed from number to string
          slippage?: string | null // Changed from number to string
          fee?: string | null // Changed from number to string
          transaction_signature?: string | null
          status?: "PENDING" | "CONFIRMED" | "FAILED"
          created_at?: string
          updated_at?: string
        }
      }
      liquidity_positions: {
        Row: {
          id: string
          user_id: string
          pool_id: string
          bin_id: number | null
          liquidity_amount: string // Changed from number to string for DECIMAL
          token_a_amount: string // Changed from number to string for DECIMAL
          token_b_amount: string // Changed from number to string for DECIMAL
          fees_earned: string // Changed from number to string for DECIMAL
          transaction_signature: string | null
          status: "ACTIVE" | "WITHDRAWN"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          pool_id: string
          bin_id?: number | null
          liquidity_amount: string // Changed from number to string
          token_a_amount: string // Changed from number to string
          token_b_amount: string // Changed from number to string
          fees_earned?: string // Changed from number to string
          transaction_signature?: string | null
          status?: "ACTIVE" | "WITHDRAWN"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          pool_id?: string
          bin_id?: number | null
          liquidity_amount?: string // Changed from number to string
          token_a_amount?: string // Changed from number to string
          token_b_amount?: string // Changed from number to string
          fees_earned?: string // Changed from number to string
          transaction_signature?: string | null
          status?: "ACTIVE" | "WITHDRAWN"
          created_at?: string
          updated_at?: string
        }
      }
      market_resolutions: {
        Row: {
          id: string
          market_id: string
          resolver_id: string | null
          outcome: "YES" | "NO"
          resolution_data: any | null
          oracle_price: string | null // Changed from number to string for DECIMAL
          confidence: string | null // Changed from number to string for DECIMAL
          transaction_signature: string | null
          resolved_at: string
        }
        Insert: {
          id?: string
          market_id: string
          resolver_id?: string | null
          outcome: "YES" | "NO"
          resolution_data?: any | null
          oracle_price?: string | null // Changed from number to string
          confidence?: string | null // Changed from number to string
          transaction_signature?: string | null
          resolved_at?: string
        }
        Update: {
          id?: string
          market_id?: string
          resolver_id?: string | null
          outcome?: "YES" | "NO"
          resolution_data?: any | null
          oracle_price?: string | null // Changed from number to string
          confidence?: string | null // Changed from number to string
          transaction_signature?: string | null
          resolved_at?: string
        }
      }
      price_history: {
        Row: {
          id: string
          symbol: string
          price: string // Changed from number to string for DECIMAL
          confidence: string | null // Changed from number to string for DECIMAL
          source: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          symbol: string
          price: string // Changed from number to string
          confidence?: string | null // Changed from number to string
          source?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          symbol?: string
          price?: string // Changed from number to string
          confidence?: string | null // Changed from number to string
          source?: string | null
          timestamp?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      set_config: {
        Args: {
          setting_name: string
          setting_value: string
          is_local?: boolean
        }
        Returns: string
      }
      get_market_odds: {
        Args: {
          market_slug: string
        }
        Returns: {
          yes_price: string
          no_price: string
          yes_liquidity: string
          no_liquidity: string
          total_liquidity: string
          market_exists: boolean
        }[]
      }
      health_check: {
        Args: {}
        Returns: {
          component: string
          status: string
          details: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Type conversion utilities
export const parseDecimal = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  const parsed = Number.parseFloat(value)
  return isNaN(parsed) ? 0 : parsed
}

export const formatDecimal = (value: number): string => {
  return value.toString()
}
