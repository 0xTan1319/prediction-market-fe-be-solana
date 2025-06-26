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
          bond_amount: number
          total_volume: number
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
          bond_amount?: number
          total_volume?: number
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
          bond_amount?: number
          total_volume?: number
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
          liquidity: number
          price: number
          volume_24h: number
          fees: number
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
          liquidity?: number
          price?: number
          volume_24h?: number
          fees?: number
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
          liquidity?: number
          price?: number
          volume_24h?: number
          fees?: number
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
          price: number
          liquidity_x: number
          liquidity_y: number
          fee_rate: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pool_id: string
          bin_id: number
          price: number
          liquidity_x?: number
          liquidity_y?: number
          fee_rate?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pool_id?: string
          bin_id?: number
          price?: number
          liquidity_x?: number
          liquidity_y?: number
          fee_rate?: number
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
          amount_in: number
          amount_out: number
          price: number
          slippage: number | null
          fee: number | null
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
          amount_in: number
          amount_out: number
          price: number
          slippage?: number | null
          fee?: number | null
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
          amount_in?: number
          amount_out?: number
          price?: number
          slippage?: number | null
          fee?: number | null
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
          liquidity_amount: number
          token_a_amount: number
          token_b_amount: number
          fees_earned: number
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
          liquidity_amount: number
          token_a_amount: number
          token_b_amount: number
          fees_earned?: number
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
          liquidity_amount?: number
          token_a_amount?: number
          token_b_amount?: number
          fees_earned?: number
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
          oracle_price: number | null
          confidence: number | null
          transaction_signature: string | null
          resolved_at: string
        }
        Insert: {
          id?: string
          market_id: string
          resolver_id?: string | null
          outcome: "YES" | "NO"
          resolution_data?: any | null
          oracle_price?: number | null
          confidence?: number | null
          transaction_signature?: string | null
          resolved_at?: string
        }
        Update: {
          id?: string
          market_id?: string
          resolver_id?: string | null
          outcome?: "YES" | "NO"
          resolution_data?: any | null
          oracle_price?: number | null
          confidence?: number | null
          transaction_signature?: string | null
          resolved_at?: string
        }
      }
      price_history: {
        Row: {
          id: string
          symbol: string
          price: number
          confidence: number | null
          source: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          symbol: string
          price: number
          confidence?: number | null
          source?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          symbol?: string
          price?: number
          confidence?: number | null
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
          is_local: boolean
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
