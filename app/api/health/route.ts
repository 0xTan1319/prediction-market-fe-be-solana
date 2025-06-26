import { NextResponse } from "next/server"
import { databaseService } from "@/lib/database-service-fixed"
import { checkSupabaseConnection } from "@/lib/supabase-fixed"

export async function GET() {
  try {
    const [dbHealth, connectionHealth] = await Promise.all([databaseService.healthCheck(), checkSupabaseConnection()])

    const overallStatus = connectionHealth && dbHealth.every((h) => h.status !== "error") ? "healthy" : "unhealthy"

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: {
        database_connection: connectionHealth ? "healthy" : "error",
        database_components: dbHealth,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
