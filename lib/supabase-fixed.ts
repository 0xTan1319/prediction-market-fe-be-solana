import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database-fixed"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable")
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable")
}

// Client-side Supabase client with error handling
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      "x-application-name": "dlmm-prediction-market",
    },
  },
})

// Server-side Supabase client (for API routes)
export const createServerSupabaseClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        "x-application-name": "dlmm-prediction-market-server",
      },
    },
  })
}

// Helper to set user context for RLS with error handling
export const setUserContext = async (walletAddress: string): Promise<void> => {
  try {
    if (!walletAddress || walletAddress.trim() === "") {
      throw new Error("Wallet address is required for user context")
    }

    const { error } = await supabase.rpc("set_config", {
      setting_name: "app.current_user_wallet",
      setting_value: walletAddress.trim(),
      is_local: true,
    })

    if (error) {
      throw error
    }
  } catch (error) {
    console.warn("Failed to set user context:", error)
    // Don't throw error as this is not critical for most operations
  }
}

// Connection health check
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from("users").select("count").limit(1)
    return !error
  } catch (error) {
    console.error("Supabase connection check failed:", error)
    return false
  }
}
